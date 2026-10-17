import { Types } from 'mongoose';
import { Shipment, type IShipment } from './shipment.model.js';
import { ShipmentEvent } from '../shipmentEvent/ShipmentEvent.model.js';
import { applyEvent } from './shipment.engine.js';
import { TERMINAL, isTerminal } from './shipment.stateMachine.js';
import { computeEventKey } from '../utils/eventKey.js';
import {
  normalizePkPhone,
  encryptPhone,
  decryptPhone,
  hashPhone,
  maskPhone,
} from '../utils/phone.js';
import { AppError } from '../middleware/error.js';
import type { Carrier, Status, TrackingHealth } from '../types/index.js';

// Common Service Response Interface (matches auth and carrierHealth standards)
export interface ServiceResponse<T = any> {
  success: boolean;
  status: number;
  message: string;
  data: T;
  error: string | null;
}

export interface CreateShipmentRowInput {
  carrier: Carrier;
  trackingNumber: string;
  customerPhone: string;
  orderValueCOD?: number;
  destinationStationCode?: string;
}

export interface BulkCreateRowResult {
  row: number;
  trackingNumber: string;
  status: 'CREATED' | 'DUPLICATE' | 'REJECTED';
  reason?: string;
  id?: string;
}

export interface BulkCreateShipmentsResult {
  created: number;
  duplicates: number;
  rejected: number;
  results: BulkCreateRowResult[];
}

export interface ListShipmentsFilter {
  cursor?: string;
  limit?: number;
  status?: Status | Status[];
  carrier?: Carrier;
  trackingHealth?: TrackingHealth;
  needsManifest?: boolean;
  trackingNumber?: string;
}

export interface ListShipmentsResult {
  shipments: Record<string, unknown>[];
  nextCursor?: string;
}

export interface GetShipmentResult {
  shipment: Record<string, unknown>;
  timeline: unknown[];
}

export interface UpdateShipmentInput {
  customerPhone?: string;
  orderValueCOD?: number;
  destinationStationCode?: string;
}

// Formats a shipment document for presentation to the merchant
function presentShipment(doc: IShipment | Record<string, any>): Record<string, unknown> {
  const obj = (doc as any).toObject ? (doc as any).toObject() : { ...doc };
  let maskedPhone = '****';
  if (obj.customerPhone) {
    try {
      const decrypted = decryptPhone(obj.customerPhone);
      maskedPhone = maskPhone(decrypted);
    } catch {
      maskedPhone = '****';
    }
  }
  delete obj.customerPhone;
  delete obj.customerPhoneHash;
  return {
    ...obj,
    customerPhoneMasked: maskedPhone,
  };
}

// Ingests a bulk batch of shipments (up to 500 rows)
export async function bulkCreateShipmentsService(
  merchantId: Types.ObjectId,
  rows: CreateShipmentRowInput[],
): Promise<ServiceResponse<BulkCreateShipmentsResult>> {
  if (!rows || rows.length === 0) {
    return {
      success: true,
      status: 200,
      message: 'No shipment rows provided',
      data: { created: 0, duplicates: 0, rejected: 0, results: [] },
      error: null,
    };
  }

  const results: BulkCreateRowResult[] = new Array(rows.length);
  const docsToInsert: Array<{ doc: Record<string, unknown>; originalIndex: number }> = [];

  // Step 1: Pre-process and normalize each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const trackingNumber = row.trackingNumber?.trim();

    if (!trackingNumber) {
      results[i] = {
        row: i + 1,
        trackingNumber: trackingNumber || 'UNKNOWN',
        status: 'REJECTED',
        reason: 'Tracking number is required',
      };
      continue;
    }

    try {
      const e164 = normalizePkPhone(row.customerPhone);
      const encPhone = encryptPhone(e164);
      const phoneHash = hashPhone(e164);

      docsToInsert.push({
        originalIndex: i,
        doc: {
          merchantId,
          carrier: row.carrier,
          trackingNumber,
          customerPhone: encPhone,
          customerPhoneHash: phoneHash,
          orderValueCOD: row.orderValueCOD ?? 0,
          destinationStationCode: row.destinationStationCode?.trim() || undefined,
          status: 'BOOKED',
          stateVersion: 0,
          ndrAttempt: 0,
          needsManifest: false,
          disputeStatus: 'NONE',
          trackingHealth: 'HEALTHY',
        },
      });
    } catch (err: any) {
      results[i] = {
        row: i + 1,
        trackingNumber,
        status: 'REJECTED',
        reason: err?.message || 'Invalid row data',
      };
    }
  }

  // Step 2: Bulk insert eligible documents
  if (docsToInsert.length > 0) {
    try {
      const inserted = await Shipment.insertMany(
        docsToInsert.map((d) => d.doc),
        { ordered: false, rawResult: true },
      );

      // In Mongoose / MongoDB driver rawResult, insertedIds is a map of index -> _id
      const insertedIds = inserted.insertedIds || {};
      docsToInsert.forEach((item, batchIdx) => {
        const id = insertedIds[batchIdx]?.toString();
        results[item.originalIndex] = {
          row: item.originalIndex + 1,
          trackingNumber: item.doc.trackingNumber as string,
          status: 'CREATED',
          id,
        };
      });
    } catch (err: any) {
      // Handle MongoDB bulk write errors (e.g. duplicate key E11000)
      const writeErrors = err?.writeErrors || err?.result?.writeErrors || [];
      const insertedIds = err?.result?.insertedIds || {};
      const failedIndices = new Set<number>();

      for (const we of writeErrors) {
        failedIndices.add(we.index);
        const item = docsToInsert[we.index];
        const isDuplicate =
          we.code === 11000 ||
          we.err?.code === 11000 ||
          (err?.code === 11000 &&
            (we.errmsg?.includes('E11000') ||
              we.err?.errmsg?.includes('E11000') ||
              err?.message?.includes('E11000')));

        results[item.originalIndex] = {
          row: item.originalIndex + 1,
          trackingNumber: item.doc.trackingNumber as string,
          status: isDuplicate ? 'DUPLICATE' : 'REJECTED',
          reason: isDuplicate
            ? 'Shipment with this carrier and tracking number already exists'
            : we.errmsg || we.err?.errmsg || err?.message || 'Bulk write error',
        };
      }

      // Mark non-failed documents as CREATED
      docsToInsert.forEach((item, batchIdx) => {
        if (!failedIndices.has(batchIdx)) {
          const id = insertedIds[batchIdx]?.toString();
          results[item.originalIndex] = {
            row: item.originalIndex + 1,
            trackingNumber: item.doc.trackingNumber as string,
            status: 'CREATED',
            id,
          };
        }
      });
    }
  }

  const created = results.filter((r) => r.status === 'CREATED').length;
  const duplicates = results.filter((r) => r.status === 'DUPLICATE').length;
  const rejected = results.filter((r) => r.status === 'REJECTED').length;

  const hasFailures = rejected > 0 || duplicates > 0;
  const status = hasFailures ? 207 : 201;
  const message = hasFailures
    ? 'Batch processed with some duplicate or rejected items'
    : 'All shipments created successfully';

  return {
    success: true,
    status,
    message,
    data: { created, duplicates, rejected, results },
    error: null,
  };
}

// Lists shipments for a merchant with keyset/cursor pagination.
export async function listShipmentsService(
  merchantId: Types.ObjectId,
  filter: ListShipmentsFilter,
): Promise<ServiceResponse<ListShipmentsResult>> {
  const limit = Math.min(Math.max(filter.limit ?? 20, 1), 100);
  const query: Record<string, unknown> = { merchantId };

  if (filter.cursor && Types.ObjectId.isValid(filter.cursor)) {
    query._id = { $lt: new Types.ObjectId(filter.cursor) };
  }

  if (filter.status) {
    if (Array.isArray(filter.status)) {
      query.status = { $in: filter.status };
    } else {
      query.status = filter.status;
    }
  }

  if (filter.carrier) {
    query.carrier = filter.carrier;
  }

  if (filter.trackingHealth) {
    query.trackingHealth = filter.trackingHealth;
  }

  if (typeof filter.needsManifest === 'boolean') {
    query.needsManifest = filter.needsManifest;
  }

  if (filter.trackingNumber) {
    query.trackingNumber = filter.trackingNumber.trim();
  }

  const docs = await Shipment.find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean<IShipment[]>()
    .exec();

  const hasMore = docs.length > limit;
  const sliced = hasMore ? docs.slice(0, limit) : docs;
  const nextCursor = hasMore ? sliced[sliced.length - 1]._id.toString() : undefined;

  return {
    success: true,
    status: 200,
    message: 'Shipments retrieved successfully',
    data: {
      shipments: sliced.map(presentShipment),
      nextCursor,
    },
    error: null,
  };
}

// Retrieves a single shipment and its complete historical ledger timeline.
export async function getShipmentService(
  merchantId: Types.ObjectId,
  id: string,
): Promise<ServiceResponse<GetShipmentResult>> {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid shipment ID', 'invalid_id');
  }

  const shipment = await Shipment.findOne({
    _id: new Types.ObjectId(id),
    merchantId,
  })
    .lean<IShipment>()
    .exec();

  if (!shipment) {
    throw new AppError(404, 'Shipment not found', 'shipment_not_found');
  }

  const timeline = await ShipmentEvent.find({
    merchantId,
    carrier: shipment.carrier,
    trackingNumber: shipment.trackingNumber,
  })
    .sort({ occurredAt: 1 })
    .lean()
    .exec();

  return {
    success: true,
    status: 200,
    message: 'Shipment details retrieved successfully',
    data: {
      shipment: presentShipment(shipment),
      timeline,
    },
    error: null,
  };
}

// Optimistically updates mutable parcel metadata.
export async function updateShipmentService(
  merchantId: Types.ObjectId,
  id: string,
  expectedVersion: number,
  patch: UpdateShipmentInput,
): Promise<ServiceResponse<Record<string, unknown>>> {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid shipment ID', 'invalid_id');
  }

  const objectId = new Types.ObjectId(id);
  const current = await Shipment.findOne({ _id: objectId, merchantId })
    .select('_id status stateVersion')
    .lean<IShipment>()
    .exec();

  if (!current) {
    throw new AppError(404, 'Shipment not found', 'shipment_not_found');
  }

  if (isTerminal(current.status)) {
    throw new AppError(
      422,
      `Cannot update shipment in terminal state '${current.status}'`,
      'terminal_shipment',
    );
  }

  if (current.stateVersion !== expectedVersion) {
    throw new AppError(
      409,
      `Version conflict: expected version ${expectedVersion}, but current is ${current.stateVersion}`,
      'version_conflict',
    );
  }

  const setUpdate: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (patch.orderValueCOD !== undefined) {
    setUpdate.orderValueCOD = patch.orderValueCOD;
  }

  if (patch.destinationStationCode !== undefined) {
    setUpdate.destinationStationCode = patch.destinationStationCode.trim() || undefined;
  }

  if (patch.customerPhone !== undefined) {
    const e164 = normalizePkPhone(patch.customerPhone);
    setUpdate.customerPhone = encryptPhone(e164);
    setUpdate.customerPhoneHash = hashPhone(e164);
  }

  const updated = await Shipment.findOneAndUpdate(
    {
      _id: objectId,
      merchantId,
      stateVersion: expectedVersion,
      status: { $nin: Array.from(TERMINAL) },
    },
    {
      $set: setUpdate,
      $inc: { stateVersion: 1 },
    },
    { returnDocument: 'after' },
  )
    .lean<IShipment>()
    .exec();

  if (!updated) {
    throw new AppError(409, 'Concurrent modification conflict', 'version_conflict');
  }

  return {
    success: true,
    status: 200,
    message: 'Shipment updated successfully',
    data: presentShipment(updated),
    error: null,
  };
}

// Cancels a shipment through the formal state engine.
export async function cancelShipmentService(
  merchantId: Types.ObjectId,
  id: string,
): Promise<ServiceResponse<{ disposition: string }>> {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid shipment ID', 'invalid_id');
  }

  const shipment = await Shipment.findOne({
    _id: new Types.ObjectId(id),
    merchantId,
  })
    .select('_id carrier trackingNumber status')
    .lean<IShipment>()
    .exec();

  if (!shipment) {
    throw new AppError(404, 'Shipment not found', 'shipment_not_found');
  }

  if (isTerminal(shipment.status)) {
    throw new AppError(
      422,
      `Cannot cancel shipment in terminal state '${shipment.status}'`,
      'terminal_shipment',
    );
  }

  const now = new Date();
  const eventKey = computeEventKey({
    merchantId: merchantId.toString(),
    carrier: shipment.carrier,
    trackingNumber: shipment.trackingNumber,
    rawStatus: 'CANCELLED',
    rawRemarks: 'Cancelled by merchant request',
    occurredAt: now,
    carrierEventId: `MERCHANT_CANCEL:${shipment._id}`,
  });

  const disposition = await applyEvent({
    merchantId,
    carrier: shipment.carrier,
    trackingNumber: shipment.trackingNumber,
    intent: { kind: 'MERCHANT_CANCEL' },
    event: {
      eventKey,
      merchantId,
      carrier: shipment.carrier,
      trackingNumber: shipment.trackingNumber,
      source: 'MERCHANT',
      rawStatus: 'CANCELLED',
      rawRemarks: 'Cancelled by merchant request',
      occurredAt: now,
      payload: {},
    },
  });

  return {
    success: true,
    status: 200,
    message: 'Shipment cancellation submitted',
    data: { disposition },
    error: null,
  };
}

// ---------------- Internal operational and engine helpers ----------

// Selects shipments due for a status poll using index idx_poller_selection.
export async function selectDueForPoll(
  status: Status,
  olderThan: Date,
  limit = 100,
): Promise<IShipment[]> {
  return Shipment.find({
    status,
    $or: [
      { lastPolledAt: { $lt: olderThan } },
      { lastPolledAt: null },
      { lastPolledAt: { $exists: false } },
    ],
  })
    .sort({ lastPolledAt: 1 })
    .limit(limit)
    .lean<IShipment[]>()
    .exec();
}

// Looks up the most recent active shipment associated with a customer phone hash.
export async function findOpenByPhoneHash(phoneHash: string): Promise<IShipment | null> {
  return Shipment.findOne({
    customerPhoneHash: phoneHash,
    status: { $nin: Array.from(TERMINAL) },
  })
    .sort({ _id: -1 })
    .lean<IShipment>()
    .exec();
}

// Batch marks shipments tracking health without altering stateVersion.
export async function markTrackingHealth(
  carrier: Carrier,
  ids: (Types.ObjectId | string)[],
  health: TrackingHealth,
): Promise<void> {
  if (!ids.length) return;
  await Shipment.updateMany(
    { carrier, _id: { $in: ids } },
    { $set: { trackingHealth: health } },
  )
    .lean()
    .exec();
}

// Scoped touch for successful polling telemetry.
export async function touchPolled(
  carrier: Carrier,
  trackingNumbers: string[],
  merchantId?: Types.ObjectId | string,
): Promise<void> {
  if (!trackingNumbers.length) return;
  const filter: Record<string, unknown> = {
    carrier,
    trackingNumber: { $in: trackingNumbers },
  };
  if (merchantId) {
    filter.merchantId = merchantId;
  }
  await Shipment.updateMany(filter, {
    $set: { trackingHealth: 'HEALTHY', lastPolledAt: new Date() },
  })
    .lean()
    .exec();
}

// Aliases for compatibility
export const bulkCreateShipments = bulkCreateShipmentsService;
export const listShipments = listShipmentsService;
export const getShipment = getShipmentService;
export const updateShipment = updateShipmentService;
export const cancelShipment = cancelShipmentService;
