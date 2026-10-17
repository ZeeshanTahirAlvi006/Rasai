import zlib from 'zlib';
import { Types } from 'mongoose';
import { ImportBatch } from './ImportBatch.model.js';
import { ImportChunk, type IImportChunk } from './ImportChunk.model.js';
import { Shipment, type IShipment } from '../shipment/shipment.model.js';
import { ShipmentEvent, toEventHashBuffer } from '../shipmentEvent/ShipmentEvent.model.js';
import { OutboxMessage } from '../models/OutboxMessage.js';
import { computeEventKey } from '../shipmentEvent/ShipmentEvent.utils.js';
import { decide } from '../shipment/shipment.stateMachine.js';
import { applyEventDetailed } from '../engine/applyEvent.js';
import { getObjectStream } from '../config/s3.js';
import { withMerchantBulkLease } from '../utils/bulkSemaphore.js';
import { enqueueChunkJob, type NormalizedCsvRow } from './importBatch.normalizer.js';
import { AppError } from '../middleware/error.js';
import type { Carrier, Disposition, Intent, Status } from '../types/index.js';

interface PreparedRowItem {
  rowNumber: number;
  trackingNumber: string;
  carrier: Carrier;
  eventKey: string;
  rawStatus: string;
  rawRemarks: string;
  occurredAt: Date;
  carrierEventId?: string;
  payload: Record<string, unknown>;
  intent: Intent;
}

interface MutatedParcelPlan {
  shipmentId: Types.ObjectId;
  trackingNumber: string;
  initialStateVersion: number;
  finalSetFields: Record<string, any>;
  winningEventRows: any[];
  outboxOps: any[];
}

/**
 * Reads gunzipped lines from an S3 object key
 */
async function readGunzippedNdjsonLines(s3Key: string): Promise<string[]> {
  const stream = await getObjectStream(s3Key);
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const fullBuffer = Buffer.concat(chunks);
  const unzipped = zlib.gunzipSync(fullBuffer);
  return unzipped
    .toString('utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/**
 * Core vectorized chunk processor
 */
export async function processImportChunk(chunkIdInput: string | Types.ObjectId): Promise<void> {
  const chunkId =
    chunkIdInput instanceof Types.ObjectId ? chunkIdInput : new Types.ObjectId(chunkIdInput);

  const chunk = await ImportChunk.findById(chunkId);
  if (!chunk) {
    throw new AppError(404, `Import chunk not found: ${chunkId}`, 'chunk_not_found');
  }

  if (chunk.status === 'COMPLETED') {
    return;
  }

  const merchantId = chunk.merchantId;
  const carrier = chunk.carrier;
  const batchId = chunk.batchId;

  // 1. Acquire leased semaphore for this merchant across all batches
  const leaseResult = await withMerchantBulkLease(
    merchantId.toString(),
    chunk._id.toString(),
    async () => {
      await ImportChunk.updateOne({ _id: chunk._id }, { $set: { status: 'PROCESSING' } });
      return await executeVectorizedChunkWork(chunk);
    },
    { maxConcurrent: 2, leaseDurationMs: 30000, heartbeatIntervalMs: 10000 },
  );

  if (!leaseResult.acquired) {
    // Merchant has reached concurrency cap across active batches: delay execution
    throw new AppError(
      429,
      `Tenant concurrency cap reached for merchant ${merchantId}`,
      'bulk_tenant_throttled',
    );
  }

  // 2. Self-pumping: claim and enqueue the next PENDING chunk for this batch
  try {
    const nextChunk = await ImportChunk.findOneAndUpdate(
      { batchId: chunk.batchId, status: 'PENDING' },
      { $set: { status: 'QUEUED' } },
      { sort: { chunkIndex: 1 }, new: true },
    ).exec();

    if (nextChunk) {
      await enqueueChunkJob(nextChunk);
    }
  } catch (err: any) {
    console.warn(`[BulkWorker] Failed to pump next chunk for batch ${batchId}:`, err?.message);
  }
}

/**
 * 5-Op Vectorized folding execution
 */
async function executeVectorizedChunkWork(chunk: IImportChunk): Promise<void> {
  const merchantId = chunk.merchantId;
  const carrier = chunk.carrier;
  const batchId = chunk.batchId;

  // Step 1: Download & parse chunk lines
  const lines = await readGunzippedNdjsonLines(chunk.s3ChunkKey);
  const totalRowsInChunk = lines.length;

  let appliedCount = 0;
  let duplicatesCount = 0;
  let rejectedCount = 0;
  let noopCount = 0;
  let unknownShipmentsCount = 0;
  const errorsToLog: Array<{ row: number; trackingNumber?: string; reason: string }> = [];

  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
  const nowMs = Date.now();

  const validRows: PreparedRowItem[] = [];
  const candidateKeys = new Set<string>();
  const candidateTrackingNumbers = new Set<string>();
  const inChunkSeenKeys = new Set<string>();

  // Step 2: Validate rows in memory
  for (const line of lines) {
    let row: NormalizedCsvRow;
    try {
      row = JSON.parse(line);
    } catch {
      rejectedCount++;
      errorsToLog.push({ row: chunk.startRow, reason: 'Invalid JSON row in chunk' });
      continue;
    }

    const trk = row.trackingNumber?.trim();
    if (!trk) {
      rejectedCount++;
      errorsToLog.push({ row: row.rowNumber, reason: 'Missing tracking number' });
      continue;
    }

    let occurredAt: Date;
    if (row.occurredAt) {
      occurredAt = new Date(row.occurredAt);
      if (Number.isNaN(occurredAt.getTime())) {
        rejectedCount++;
        errorsToLog.push({ row: row.rowNumber, trackingNumber: trk, reason: 'Invalid occurredAt date' });
        continue;
      }
    } else {
      occurredAt = new Date();
    }

    if (nowMs - occurredAt.getTime() > NINETY_DAYS_MS) {
      rejectedCount++;
      errorsToLog.push({
        row: row.rowNumber,
        trackingNumber: trk,
        reason: 'Event timestamp exceeds 90-day retention horizon',
      });
      continue;
    }

    const rawStatus = row.rawStatus?.trim() || 'UNKNOWN';
    const rawRemarks = row.rawRemarks?.trim() || '';
    const carrierEventId = row.carrierEventId?.trim() || undefined;

    const eventKey = computeEventKey({
      merchantId: merchantId.toString(),
      carrier,
      trackingNumber: trk,
      rawStatus,
      rawRemarks,
      occurredAt,
      carrierEventId,
    });

    // In-chunk deduplication: duplicate identical scan in same 500-row file
    if (inChunkSeenKeys.has(eventKey)) {
      duplicatesCount++;
      continue;
    }
    inChunkSeenKeys.add(eventKey);

    const intent: Intent = {
      kind: 'CARRIER_STATUS',
      status: (rawStatus as Status) || 'BOOKED',
    };

    validRows.push({
      rowNumber: row.rowNumber,
      trackingNumber: trk,
      carrier,
      eventKey,
      rawStatus,
      rawRemarks,
      occurredAt,
      carrierEventId,
      payload: row.payload || {},
      intent,
    });

    candidateKeys.add(eventKey);
    candidateTrackingNumbers.add(trk);
  }

  // Step 3: Op 1 — Upfront Vectorized Deduplication Check against Ledger
  const existingLedgerDocs =
    candidateKeys.size > 0
      ? await ShipmentEvent.find(
          { merchantId, eventKey: { $in: Array.from(candidateKeys) } },
          { eventKey: 1, _id: 0 },
        )
          .lean()
          .exec()
      : [];

  const existingLedgerKeys = new Set<string>(existingLedgerDocs.map((d: any) => d.eventKey));

  const candidateRowsToProcess: PreparedRowItem[] = [];
  for (const row of validRows) {
    if (existingLedgerKeys.has(row.eventKey)) {
      duplicatesCount++;
    } else {
      candidateRowsToProcess.push(row);
    }
  }

  // Step 4: Op 2 — Batch Shipment Context Read
  const shipments =
    candidateTrackingNumbers.size > 0
      ? await Shipment.find({
          merchantId,
          carrier,
          trackingNumber: { $in: Array.from(candidateTrackingNumbers) },
        })
          .lean()
          .exec()
      : [];

  const shipmentMap = new Map<string, any>(shipments.map((s: any) => [s.trackingNumber, s]));

  // Step 5: Pure In-Memory Parcel Lane Folding & Net Outbox Reduction
  const parcelGroups = new Map<string, PreparedRowItem[]>();
  for (const row of candidateRowsToProcess) {
    const list = parcelGroups.get(row.trackingNumber) || [];
    list.push(row);
    parcelGroups.set(row.trackingNumber, list);
  }

  const winningShipmentEvents: any[] = [];
  const winningOutboxOps: any[] = [];
  const mutatedParcels: MutatedParcelPlan[] = [];

  for (const [trackingNumber, rows] of parcelGroups.entries()) {
    rows.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

    const currentShipment = shipmentMap.get(trackingNumber);

    if (!currentShipment) {
      // Unknown shipment: record ledger event for each row, zero shipment mutations
      for (const r of rows) {
        winningShipmentEvents.push({
          insertOne: {
            document: {
              merchantId,
              carrier,
              trackingNumber: r.trackingNumber,
              eventKey: r.eventKey,
              eventHash: toEventHashBuffer(r.eventKey),
              source: 'FILE_IMPORT',
              rawStatus: r.rawStatus,
              rawRemarks: r.rawRemarks,
              occurredAt: r.occurredAt,
              batchId,
              disposition: 'UNKNOWN_SHIPMENT',
              payload: r.payload,
            },
          },
        });
        unknownShipmentsCount++;
      }
      continue;
    }

    // Known shipment projection
    const sim = {
      status: currentShipment.status as Status,
      ndrAttempt: currentShipment.ndrAttempt as number,
      lastCarrierEventAt: currentShipment.lastCarrierEventAt
        ? new Date(currentShipment.lastCarrierEventAt)
        : null,
      needsManifest: Boolean(currentShipment.needsManifest),
      disputeRetractionRequested: Boolean(currentShipment.disputeRetractionRequested),
      rescheduledDate: currentShipment.rescheduledDate,
      customerCoordinates: currentShipment.customerCoordinates,
      ndrTemplateDispatched: Boolean(currentShipment.ndrTemplateDispatched),
    };

    const netOutbox = {
      purgePending: false,
      enqueueNdrAttempt: null as number | null,
      enqueueRto: false,
      enqueueCorrectionAttempt: null as number | null,
    };

    const parcelEventDocs: any[] = [];
    let parcelHasApplied = false;

    for (const r of rows) {
      const outOfOrder =
        r.intent.kind === 'CARRIER_STATUS' &&
        sim.lastCarrierEventAt != null &&
        r.occurredAt < sim.lastCarrierEventAt;

      const decision = outOfOrder
        ? {
            next: sim.status,
            effects: [],
            disposition: 'STALE_OUT_OF_ORDER' as Disposition,
          }
        : decide(sim.status, r.intent, {
            ndrTemplateSent: sim.ndrTemplateDispatched,
          });

      if (decision.disposition === 'APPLIED') {
        parcelHasApplied = true;
        appliedCount++;

        const prevStatus = sim.status;
        sim.status = decision.next;

        if (r.intent.kind === 'CARRIER_STATUS') {
          sim.lastCarrierEventAt = r.occurredAt;
        }

        if (prevStatus !== 'NDR_ACTIVE' && decision.next === 'NDR_ACTIVE') {
          sim.ndrAttempt += 1;
        }

        const hasEffect = (eff: string) => (decision.effects as any[]).includes(eff);

        if (hasEffect('MARK_NEEDS_MANIFEST')) sim.needsManifest = true;
        if (hasEffect('CLEAR_NEEDS_MANIFEST')) sim.needsManifest = false;
        if (hasEffect('RETRACT_DISPUTE')) sim.disputeRetractionRequested = true;

        if (hasEffect('PURGE_PENDING_OUTBOX')) {
          netOutbox.purgePending = true;
          netOutbox.enqueueNdrAttempt = null;
          netOutbox.enqueueRto = false;
        }

        if (hasEffect('ENQUEUE_NDR_TEMPLATE')) {
          netOutbox.enqueueNdrAttempt = sim.ndrAttempt;
          sim.ndrTemplateDispatched = true;
        }

        if (hasEffect('ENQUEUE_RTO_NOTICE')) {
          netOutbox.enqueueRto = true;
        }

        if (hasEffect('ENQUEUE_DELIVERY_CORRECTION')) {
          netOutbox.enqueueCorrectionAttempt = sim.ndrAttempt;
        }
      } else if (decision.disposition === 'NOOP') {
        noopCount++;
      } else if (decision.disposition === 'DUPLICATE') {
        duplicatesCount++;
      } else {
        rejectedCount++;
      }

      parcelEventDocs.push({
        insertOne: {
          document: {
            shipmentId: currentShipment._id,
            merchantId,
            carrier,
            trackingNumber: r.trackingNumber,
            eventKey: r.eventKey,
            eventHash: toEventHashBuffer(r.eventKey),
            source: 'FILE_IMPORT',
            rawStatus: r.rawStatus,
            rawRemarks: r.rawRemarks,
            occurredAt: r.occurredAt,
            batchId,
            disposition: decision.disposition,
            payload: r.payload,
          },
        },
      });
    }

    if (parcelHasApplied) {
      const finalSet: Record<string, any> = {
        status: sim.status,
        ndrAttempt: sim.ndrAttempt,
        lastCarrierEventAt: sim.lastCarrierEventAt,
        needsManifest: sim.needsManifest,
        disputeRetractionRequested: sim.disputeRetractionRequested,
        ndrTemplateDispatched: sim.ndrTemplateDispatched,
        updatedAt: new Date(),
      };

      const parcelOutboxOps: any[] = [];
      const now = new Date();

      if (netOutbox.purgePending) {
        parcelOutboxOps.push({
          updateMany: {
            filter: {
              shipmentId: currentShipment._id,
              status: 'PENDING',
              messageType: { $in: ['NDR_UTILITY_TEMPLATE', 'RTO_NOTICE'] },
            },
            update: { $set: { status: 'DISCARDED_STALE', updatedAt: now } },
          },
        });
      }

      const buildOutboxUpsert = (msgType: string, dedupeKey: string, payload: any) => ({
        updateOne: {
          filter: { dedupeKey, status: { $ne: 'DISPATCHED' } },
          update: {
            $set: { status: 'PENDING', scheduledFor: now, updatedAt: now },
            $setOnInsert: {
              merchantId: currentShipment.merchantId,
              shipmentId: currentShipment._id,
              recipientPhone: currentShipment.customerPhone,
              recipientPhoneHash: currentShipment.customerPhoneHash,
              dedupeKey,
              channel: 'META_WHATSAPP',
              messageType: msgType,
              payload,
              attempts: 0,
              priorityScore: currentShipment.orderValueCOD || 0,
            },
          },
          upsert: true,
        },
      });

      if (netOutbox.enqueueNdrAttempt != null) {
        parcelOutboxOps.push(
          buildOutboxUpsert(
            'NDR_UTILITY_TEMPLATE',
            `${currentShipment._id}:NDR_UTILITY_TEMPLATE:${netOutbox.enqueueNdrAttempt}`,
            { trackingNumber: currentShipment.trackingNumber, cod: currentShipment.orderValueCOD },
          ),
        );
      }

      if (netOutbox.enqueueRto) {
        parcelOutboxOps.push(
          buildOutboxUpsert(
            'RTO_NOTICE',
            `${currentShipment._id}:RTO_NOTICE`,
            { trackingNumber: currentShipment.trackingNumber },
          ),
        );
      }

      if (netOutbox.enqueueCorrectionAttempt != null) {
        parcelOutboxOps.push(
          buildOutboxUpsert(
            'DELIVERY_CORRECTION',
            `${currentShipment._id}:DELIVERY_CORRECTION:${netOutbox.enqueueCorrectionAttempt}`,
            { trackingNumber: currentShipment.trackingNumber },
          ),
        );
      }

      mutatedParcels.push({
        shipmentId: currentShipment._id,
        trackingNumber: currentShipment.trackingNumber,
        initialStateVersion: currentShipment.stateVersion,
        finalSetFields: finalSet,
        winningEventRows: parcelEventDocs,
        outboxOps: parcelOutboxOps,
      });
    } else {
      winningShipmentEvents.push(...parcelEventDocs);
    }
  }

  // Step 6: Op 3 — Version-Guarded Shipment.bulkWrite FIRST (Race Detection)
  const shipmentBulkOps = mutatedParcels.map((p) => ({
    updateOne: {
      filter: { _id: p.shipmentId, stateVersion: p.initialStateVersion },
      update: {
        $set: p.finalSetFields,
        $inc: { stateVersion: 1 },
      },
    },
  }));

  const conflictedShipmentIds = new Set<string>();

  if (shipmentBulkOps.length > 0) {
    const shipmentWriteRes = await Shipment.bulkWrite(shipmentBulkOps, { ordered: false });

    // Race detection: if matchedCount < expected, diff stateVersion to isolate conflicted parcels
    if (shipmentWriteRes.matchedCount < mutatedParcels.length) {
      const mutatedIds = mutatedParcels.map((p) => p.shipmentId);
      const freshShipments = await Shipment.find(
        { _id: { $in: mutatedIds } },
        { _id: 1, stateVersion: 1 },
      ).lean();
      const freshVersionMap = new Map<string, number>(
        freshShipments.map((s: any) => [s._id.toString(), s.stateVersion]),
      );

      for (const p of mutatedParcels) {
        const expectedVersion = p.initialStateVersion + 1;
        const actualVersion = freshVersionMap.get(p.shipmentId.toString());
        if (actualVersion !== expectedVersion) {
          conflictedShipmentIds.add(p.shipmentId.toString());
        }
      }
    }
  }

  // Step 7: Op 4 & 5 — ShipmentEvent.bulkWrite and OutboxMessage.bulkWrite for non-conflicted
  for (const p of mutatedParcels) {
    if (conflictedShipmentIds.has(p.shipmentId.toString())) {
      // Conflicted parcel fallback: process sequentially with fresh DB state
      const parcelRows = parcelGroups.get(p.trackingNumber) || [];
      for (const r of parcelRows) {
        try {
          const res = await applyEventDetailed({
            merchantId,
            carrier,
            trackingNumber: r.trackingNumber,
            intent: r.intent,
            event: {
              eventKey: r.eventKey,
              eventHash: toEventHashBuffer(r.eventKey),
              merchantId,
              carrier,
              trackingNumber: r.trackingNumber,
              source: 'FILE_IMPORT',
              rawStatus: r.rawStatus,
              rawRemarks: r.rawRemarks,
              occurredAt: r.occurredAt,
              batchId,
              payload: r.payload,
            },
          });
          if (res.disposition === 'DUPLICATE') duplicatesCount++;
          else if (res.disposition === 'APPLIED') appliedCount++;
          else if (res.disposition === 'NOOP') noopCount++;
          else rejectedCount++;
        } catch (err: any) {
          rejectedCount++;
          errorsToLog.push({
            row: r.rowNumber,
            trackingNumber: r.trackingNumber,
            reason: err?.message || 'Race fallback error',
          });
        }
      }
    } else {
      winningShipmentEvents.push(...p.winningEventRows);
      winningOutboxOps.push(...p.outboxOps);
    }
  }

  if (winningShipmentEvents.length > 0) {
    await ShipmentEvent.bulkWrite(winningShipmentEvents, { ordered: false }).catch((err: any) => {
      // Duplicate keys on eventHash/eventKey safely ignored
      if (err?.code !== 11000 && !err?.writeErrors?.every((we: any) => we.code === 11000 || we.err?.code === 11000)) {
        throw err;
      }
    });
  }

  if (winningOutboxOps.length > 0) {
    await OutboxMessage.bulkWrite(winningOutboxOps, { ordered: false }).catch((err: any) => {
      // Safe dedupeKey conflict ignore
      if (err?.code !== 11000 && !err?.writeErrors?.every((we: any) => we.code === 11000 || we.err?.code === 11000)) {
        throw err;
      }
    });
  }

  // Step 8: Idempotent Progress Update on ImportChunk and ImportBatch
  const chunkTransition = await ImportChunk.updateOne(
    { _id: chunk._id, status: { $ne: 'COMPLETED' } },
    {
      $set: {
        status: 'COMPLETED',
        applied: appliedCount,
        duplicates: duplicatesCount,
        rejected: rejectedCount,
        noop: noopCount,
        unknownShipments: unknownShipmentsCount,
        completedAt: new Date(),
      },
    },
  );

  // Prevent double-counting on worker retry
  if (chunkTransition.modifiedCount === 1) {
    const updatedBatch = await ImportBatch.findOneAndUpdate(
      { _id: batchId },
      {
        $inc: {
          completedChunks: 1,
          applied: appliedCount,
          duplicates: duplicatesCount,
          rejected: rejectedCount,
          noop: noopCount,
          unknownShipments: unknownShipmentsCount,
        },
        ...(errorsToLog.length > 0
          ? { $push: { errors: { $each: errorsToLog, $slice: 100 } } }
          : {}),
      },
      { new: true },
    );

    if (
      updatedBatch &&
      updatedBatch.completedChunks + updatedBatch.failedChunks >= updatedBatch.totalChunks
    ) {
      await ImportBatch.updateOne(
        { _id: batchId, status: 'PROCESSING' },
        { $set: { status: 'COMPLETED', completedAt: new Date() } },
      );
    }
  }
}
