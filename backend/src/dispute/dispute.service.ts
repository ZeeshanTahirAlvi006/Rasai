// src/dispute/dispute.service.ts
// Service layer orchestrating CPR Margin Defense scoring, dispute packages, CDR call-log ingestion, and settlement tracking

import crypto from 'crypto';
import { Types } from 'mongoose';
import {
  CprDispute,
  type ICprDispute,
  type CprBand,
  type CprDisputeStatus,
} from '../models/CprDispute';
import { CdrRecord } from '../models/CdrRecord';
import { Shipment } from '../shipment/shipment.model';
import { ShipmentEvent } from '../shipmentEvent/ShipmentEvent.model';
import { ConversationSession } from '../models/ConversationSession';
import { AppError } from '../middleware/error';
import {
  evaluateCprScore,
  calculateSettlementCutoff,
} from './cprScoring.engine';
import { normalizePkPhone, hashPhone } from '../utils/phone';
import { parseCarrierTimestamp } from '../utils/eventKey';
import { alertOps } from '../utils/opsAlert';
import type { Carrier } from '../types';

export interface ServiceResponse<T = any> {
  success: boolean;
  status: number;
  message: string;
  data: T;
  error: string | null;
}

export interface ListDisputesQuery {
  page?: number;
  limit?: number;
  status?: CprDisputeStatus;
  carrier?: Carrier;
  cprBand?: CprBand;
  search?: string;
}

export interface DisputeKpiSummary {
  totalDisputedAmount: number;
  totalSettledAmount: number;
  totalDisputes: number;
  settledCount: number;
  winRate: number;
  bandCounts: {
    strong: number;
    medium: number;
    weak: number;
  };
  expiringIn48hCount: number;
}

/**
 * Evaluates or recalculates the CPR score for a specific shipment and persists the dispute dossier.
 */
export async function evaluateCprDisputeService(
  merchantId: string,
  shipmentId: string,
): Promise<ServiceResponse<ICprDispute>> {
  const mId = new Types.ObjectId(merchantId);
  const sId = new Types.ObjectId(shipmentId);

  // 1. Fetch shipment projection with lean hygiene
  const shipment = await Shipment.findOne({ _id: sId, merchantId: mId })
    .select(
      '_id merchantId carrier trackingNumber status orderValueCOD customerPhone customerPhoneHash settlementCutoff disputeRetractionRequested customerCoordinates rescheduledDate updatedAt',
    )
    .lean()
    .exec();

  if (!shipment) {
    throw new AppError(404, 'Shipment not found for dispute evaluation', 'SHIPMENT_NOT_FOUND');
  }

  // 2. Fetch immutable ledger events chronologically
  const ledgerEvents = await ShipmentEvent.find({
    merchantId: mId,
    carrier: shipment.carrier,
    trackingNumber: shipment.trackingNumber,
  })
    .sort({ occurredAt: 1 })
    .select('eventKey rawStatus disposition occurredAt')
    .lean()
    .exec();

  // 3. Fetch associated conversation session for customer confirmations/pins
  const session = await ConversationSession.findOne({
    merchantId: mId,
    shipmentId: sId,
  })
    .select('state draft')
    .lean()
    .exec();

  // 4. Fetch matched CDR call-log records using phone hash
  const callLogs = await CdrRecord.find({
    merchantId: mId,
    recipientPhoneHash: shipment.customerPhoneHash,
  })
    .select('callTimestamp durationSeconds callStatus')
    .lean()
    .exec();

  // 5. Compute settlement cutoff if not already established
  const cutoff =
    shipment.settlementCutoff ??
    calculateSettlementCutoff(shipment.carrier, shipment.updatedAt ?? new Date());

  const convRescheduleDate = session?.draft?.date ?? (shipment as any).rescheduledDate;
  const convLocation = session?.draft?.coordinates ?? (shipment as any).customerCoordinates;

  // 6. Run deterministic 5-signal CPR scoring engine
  const scoringResult = evaluateCprScore({
    carrier: shipment.carrier,
    settlementCutoff: cutoff,
    ledgerEvents: ledgerEvents.map((e) => ({
      rawStatus: e.rawStatus,
      disposition: e.disposition,
      occurredAt: e.occurredAt,
    })),
    conversation: session
      ? {
          state: session.state,
          requestedRescheduleDate: convRescheduleDate,
          location: convLocation,
        }
      : convRescheduleDate || convLocation
      ? {
          state: 'CONFIRMED',
          requestedRescheduleDate: convRescheduleDate,
          location: convLocation,
        }
      : null,
    callLogs: callLogs.map((c) => ({
      callTimestamp: c.callTimestamp,
      durationSeconds: c.durationSeconds,
      callStatus: c.callStatus,
    })),
  });

  // 7. Atomic upsert of CprDispute dossier (B5-RC-01)
  const dispute = await CprDispute.findOneAndUpdate(
    { merchantId: mId, shipmentId: sId },
    {
      $set: {
        carrier: shipment.carrier,
        trackingNumber: shipment.trackingNumber,
        claimAmount: shipment.orderValueCOD ?? 0,
        cprScore: scoringResult.score,
        cprBand: scoringResult.band,
        breakdown: scoringResult.breakdown,
        settlementCutoff: cutoff,
        disputeRetractionRequested: Boolean(shipment.disputeRetractionRequested),
        evidenceSnapshot: {
          ledgerEvents: ledgerEvents.map((e) => ({
            eventKey: e.eventKey,
            rawStatus: e.rawStatus,
            disposition: e.disposition,
            occurredAt: e.occurredAt,
          })),
          conversationSummary: session || convRescheduleDate || convLocation
            ? {
                state: session?.state ?? 'CONFIRMED',
                requestedRescheduleDate: convRescheduleDate,
                location: convLocation,
              }
            : undefined,
          callLogMatches: callLogs.map((c) => ({
            callTimestamp: c.callTimestamp,
            durationSeconds: c.durationSeconds,
            callStatus: c.callStatus,
          })),
        },
      },
      $setOnInsert: {
        status: 'DRAFT',
      },
      $inc: { stateVersion: 1 },
    },
    { upsert: true, returnDocument: 'after' },
  )
    .lean()
    .exec();

  // 8. Update shipment projection fields
  await Shipment.updateOne(
    { _id: sId },
    {
      $set: {
        disputeStatus: dispute?.status ?? 'DRAFT',
        settlementCutoff: cutoff,
      },
    },
  );

  return {
    success: true,
    status: 200,
    message: 'CPR dispute package evaluated successfully',
    data: dispute as ICprDispute,
    error: null,
  };
}

/**
 * Retrieves a single CPR dispute by ID with full evidence snapshot.
 */
export async function getDisputeByIdService(
  merchantId: string,
  disputeId: string,
): Promise<ServiceResponse<ICprDispute>> {
  const dispute = await CprDispute.findOne({
    _id: new Types.ObjectId(disputeId),
    merchantId: new Types.ObjectId(merchantId),
  })
    .lean()
    .exec();

  if (!dispute) {
    throw new AppError(404, 'CPR dispute not found', 'DISPUTE_NOT_FOUND');
  }

  return {
    success: true,
    status: 200,
    message: 'Dispute retrieved successfully',
    data: dispute as ICprDispute,
    error: null,
  };
}

/**
 * Returns a paginated listing of disputes with filters and summary counters.
 */
export async function listDisputesService(
  merchantId: string,
  query: ListDisputesQuery,
): Promise<
  ServiceResponse<{
    disputes: ICprDispute[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }>
> {
  const mId = new Types.ObjectId(merchantId);
  const page = Math.max(1, Number(query.page ?? 1));
  const limit = Math.max(1, Math.min(100, Number(query.limit ?? 20)));
  const skip = (page - 1) * limit;

  const filter: any = { merchantId: mId };
  if (query.status) filter.status = query.status;
  if (query.carrier) filter.carrier = query.carrier;
  if (query.cprBand) filter.cprBand = query.cprBand;
  if (query.search) {
    filter.trackingNumber = { $regex: query.search.trim(), $options: 'i' };
  }

  const [disputes, total] = await Promise.all([
    CprDispute.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-evidenceSnapshot.ledgerEvents') // Exclude heavy ledger arrays from listing (Spec §3.4)
      .lean()
      .exec(),
    CprDispute.countDocuments(filter),
  ]);

  return {
    success: true,
    status: 200,
    message: 'Disputes retrieved successfully',
    data: {
      disputes: disputes as ICprDispute[],
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
    error: null,
  };
}

/**
 * Formally marks a dispute as SUBMITTED to the courier (fenced against unconfirmed retractions).
 */
export async function submitDisputeService(
  merchantId: string,
  disputeId: string,
  notes?: string,
): Promise<ServiceResponse<ICprDispute>> {
  const mId = new Types.ObjectId(merchantId);
  const dId = new Types.ObjectId(disputeId);

  const existing = await CprDispute.findOne({ _id: dId, merchantId: mId })
    .select('status disputeRetractionRequested shipmentId')
    .lean()
    .exec();

  if (!existing) {
    throw new AppError(404, 'Dispute not found', 'DISPUTE_NOT_FOUND');
  }

  // Guard against submitting disputes flagged for quiet retraction (B5-RC-02)
  if (existing.disputeRetractionRequested) {
    throw new AppError(
      400,
      'Cannot submit dispute: consignee delivery was confirmed and retraction is requested. Please review and retract.',
      'DISPUTE_RETRACTION_ACTIVE',
    );
  }

  const updated = await CprDispute.findOneAndUpdate(
    { _id: dId, merchantId: mId, status: { $in: ['DRAFT', 'PENDING_REVIEW'] } },
    {
      $set: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        notes: notes ?? undefined,
      },
      $inc: { stateVersion: 1 },
    },
    { returnDocument: 'after' },
  )
    .lean()
    .exec();

  if (!updated) {
    throw new AppError(
      409,
      'Dispute cannot be submitted: invalid state transition or already submitted',
      'INVALID_STATE_TRANSITION',
    );
  }

  await Shipment.updateOne({ _id: existing.shipmentId }, { $set: { disputeStatus: 'SUBMITTED' } });

  return {
    success: true,
    status: 200,
    message: 'Dispute submitted successfully to carrier',
    data: updated as ICprDispute,
    error: null,
  };
}

/**
 * Records a formal settlement from the courier with settled compensation amount.
 */
export async function settleDisputeService(
  merchantId: string,
  disputeId: string,
  settlementAmount: number,
  notes?: string,
): Promise<ServiceResponse<ICprDispute>> {
  const mId = new Types.ObjectId(merchantId);
  const dId = new Types.ObjectId(disputeId);

  const updated = await CprDispute.findOneAndUpdate(
    { _id: dId, merchantId: mId },
    {
      $set: {
        status: 'SETTLED',
        settledAt: new Date(),
        settlementAmount,
        notes: notes ?? undefined,
      },
      $inc: { stateVersion: 1 },
    },
    { returnDocument: 'after' },
  )
    .lean()
    .exec();

  if (!updated) {
    throw new AppError(404, 'Dispute not found', 'DISPUTE_NOT_FOUND');
  }

  await Shipment.updateOne({ _id: updated.shipmentId }, { $set: { disputeStatus: 'SETTLED' } });

  return {
    success: true,
    status: 200,
    message: 'Dispute settlement recorded successfully',
    data: updated as ICprDispute,
    error: null,
  };
}

/**
 * Formally retracts a dispute (human-in-the-loop quiet retraction).
 */
export async function retractDisputeService(
  merchantId: string,
  disputeId: string,
  reason: string,
  notes?: string,
): Promise<ServiceResponse<ICprDispute>> {
  const mId = new Types.ObjectId(merchantId);
  const dId = new Types.ObjectId(disputeId);

  const updated = await CprDispute.findOneAndUpdate(
    { _id: dId, merchantId: mId },
    {
      $set: {
        status: 'RETRACTED',
        retractionReason: reason,
        notes: notes ?? undefined,
      },
      $inc: { stateVersion: 1 },
    },
    { returnDocument: 'after' },
  )
    .lean()
    .exec();

  if (!updated) {
    throw new AppError(404, 'Dispute not found', 'DISPUTE_NOT_FOUND');
  }

  await Shipment.updateOne({ _id: updated.shipmentId }, { $set: { disputeStatus: 'RETRACTED' } });

  return {
    success: true,
    status: 200,
    message: 'Dispute retracted successfully',
    data: updated as ICprDispute,
    error: null,
  };
}

/**
 * Ingests a CSV of Call Detail Records (CDR) and matches recipient phone hashes against active disputes.
 */
export async function ingestCdrCallLogsService(
  merchantId: string,
  csvContent: string,
): Promise<ServiceResponse<{ ingestedCount: number; matchedDisputesCount: number }>> {
  const mId = new Types.ObjectId(merchantId);

  // Compute file SHA-256 hash for idempotent upload guard (B5-RC-03)
  const fileHash = crypto.createHash('sha256').update(csvContent).digest('hex');
  const existing = await CdrRecord.findOne({ merchantId: mId, fileHash }).select('_id').lean().exec();
  if (existing) {
    throw new AppError(409, 'This CDR call-log file has already been ingested', 'DUPLICATE_CDR_FILE');
  }

  // Parse CSV rows into records
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new AppError(400, 'CDR CSV file is empty or missing headers', 'INVALID_CDR_CSV');
  }

  const header = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const callerIdx = header.findIndex((h) => h.includes('caller') || h.includes('from') || h.includes('rider'));
  const recipientIdx = header.findIndex((h) => h.includes('recipient') || h.includes('to') || h.includes('customer') || h.includes('phone'));
  const timestampIdx = header.findIndex((h) => h.includes('time') || h.includes('date'));
  const durationIdx = header.findIndex((h) => h.includes('duration') || h.includes('seconds') || h.includes('sec'));
  const statusIdx = header.findIndex((h) => h.includes('status') || h.includes('disposition'));

  if (recipientIdx === -1 || timestampIdx === -1) {
    throw new AppError(
      400,
      'CDR CSV must contain at least recipient phone and timestamp columns',
      'INVALID_CDR_COLUMNS',
    );
  }

  const recordsToInsert: any[] = [];
  const affectedPhoneHashes = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const rawRecipient = cols[recipientIdx];
    const rawTimestamp = cols[timestampIdx];
    if (!rawRecipient || !rawTimestamp) continue;

    let e164 = rawRecipient;
    try {
      e164 = normalizePkPhone(rawRecipient);
    } catch {
      // Use raw if standard normalization fails
    }

    const pHash = hashPhone(e164);
    affectedPhoneHashes.add(pHash);

    const callDate = parseCarrierTimestamp(rawTimestamp);
    const duration = durationIdx !== -1 ? Math.max(0, parseInt(cols[durationIdx], 10) || 0) : 0;
    const rawStatus = statusIdx !== -1 ? cols[statusIdx]?.toUpperCase() : 'ANSWERED';

    let status = 'ANSWERED';
    if (/miss/i.test(rawStatus)) status = 'MISSED';
    else if (/busy/i.test(rawStatus)) status = 'BUSY';
    else if (/fail|reject|unreach/i.test(rawStatus)) status = 'FAILED';

    recordsToInsert.push({
      merchantId: mId,
      fileHash,
      callerPhone: callerIdx !== -1 && cols[callerIdx] ? cols[callerIdx] : 'UNKNOWN',
      recipientPhoneHash: pHash,
      callTimestamp: callDate,
      durationSeconds: duration,
      callStatus: status,
    });
  }

  if (recordsToInsert.length > 0) {
    await CdrRecord.insertMany(recordsToInsert, { ordered: false });
  }

  // Find all active disputes for this merchant whose shipments match these phone hashes
  const matchingShipments = await Shipment.find({
    merchantId: mId,
    customerPhoneHash: { $in: Array.from(affectedPhoneHashes) },
  })
    .select('_id')
    .lean()
    .exec();

  let matchedDisputesCount = 0;
  for (const s of matchingShipments) {
    try {
      await evaluateCprDisputeService(merchantId, String(s._id));
      matchedDisputesCount++;
    } catch {
      // Continue to next shipment
    }
  }

  return {
    success: true,
    status: 201,
    message: `Ingested ${recordsToInsert.length} CDR records and recalculated ${matchedDisputesCount} disputes`,
    data: {
      ingestedCount: recordsToInsert.length,
      matchedDisputesCount,
    },
    error: null,
  };
}

/**
 * Returns single-pass aggregated financial KPI metrics for the CPR Defense station (B5-BN-05).
 */
export async function getDisputeKpiSummaryService(
  merchantId: string,
): Promise<ServiceResponse<DisputeKpiSummary>> {
  const mId = new Types.ObjectId(merchantId);
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const results = await CprDispute.aggregate([
    { $match: { merchantId: mId } },
    {
      $group: {
        _id: null,
        totalDisputes: { $sum: 1 },
        totalDisputedAmount: {
          $sum: {
            $cond: [
              { $in: ['$status', ['DRAFT', 'PENDING_REVIEW', 'SUBMITTED']] },
              '$claimAmount',
              0,
            ],
          },
        },
        totalSettledAmount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'SETTLED'] }, '$settlementAmount', 0],
          },
        },
        settledCount: {
          $sum: { $cond: [{ $eq: ['$status', 'SETTLED'] }, 1, 0] },
        },
        strongCount: {
          $sum: { $cond: [{ $eq: ['$cprBand', 'STRONG'] }, 1, 0] },
        },
        mediumCount: {
          $sum: { $cond: [{ $eq: ['$cprBand', 'MEDIUM'] }, 1, 0] },
        },
        weakCount: {
          $sum: { $cond: [{ $eq: ['$cprBand', 'WEAK'] }, 1, 0] },
        },
        expiringIn48hCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $in: ['$status', ['DRAFT', 'PENDING_REVIEW']] },
                  { $gt: ['$settlementCutoff', now] },
                  { $lte: ['$settlementCutoff', in48h] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]).exec();

  const row = results[0] ?? {
    totalDisputes: 0,
    totalDisputedAmount: 0,
    totalSettledAmount: 0,
    settledCount: 0,
    strongCount: 0,
    mediumCount: 0,
    weakCount: 0,
    expiringIn48hCount: 0,
  };

  const winRate = row.totalDisputes > 0 ? Math.round((row.settledCount / row.totalDisputes) * 100) : 0;

  return {
    success: true,
    status: 200,
    message: 'CPR KPI summary retrieved successfully',
    data: {
      totalDisputedAmount: row.totalDisputedAmount,
      totalSettledAmount: row.totalSettledAmount,
      totalDisputes: row.totalDisputes,
      settledCount: row.settledCount,
      winRate,
      bandCounts: {
        strong: row.strongCount,
        medium: row.mediumCount,
        weak: row.weakCount,
      },
      expiringIn48hCount: row.expiringIn48hCount,
    },
    error: null,
  };
}

/**
 * Background sweeper identifying disputes approaching cutoff and marking lapsed disputes as EXPIRED.
 */
export async function sweepExpiringDisputesService(): Promise<
  ServiceResponse<{ warnedCount: number; expiredCount: number }>
> {
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // 1. Alert on disputes approaching cutoff within 48h (DRAFT / PENDING_REVIEW)
  const approaching = await CprDispute.find({
    status: { $in: ['DRAFT', 'PENDING_REVIEW'] },
    settlementCutoff: { $gt: now, $lte: in48h },
  })
    .select('_id carrier trackingNumber settlementCutoff')
    .lean()
    .exec();

  for (const d of approaching) {
    alertOps(
      'DISPUTE_SETTLEMENT_CUTOFF_APPROACHING',
      {
        disputeId: d._id,
        carrier: d.carrier,
        trackingNumber: d.trackingNumber,
        settlementCutoff: d.settlementCutoff,
      },
      {
        severity: 'WARNING',
        dedupeScope: `${d.carrier}:${d.trackingNumber}`,
        source: 'dispute_sweeper',
      },
    );
  }

  // 2. Mark lapsed past-due disputes as EXPIRED (B5-RC-04)
  const expireResult = await CprDispute.updateMany(
    {
      status: { $in: ['DRAFT', 'PENDING_REVIEW'] },
      settlementCutoff: { $lt: now },
    },
    {
      $set: { status: 'EXPIRED' },
      $inc: { stateVersion: 1 },
    },
  );

  return {
    success: true,
    status: 200,
    message: 'Settlement cutoff sweeper executed successfully',
    data: {
      warnedCount: approaching.length,
      expiredCount: expireResult.modifiedCount,
    },
    error: null,
  };
}
