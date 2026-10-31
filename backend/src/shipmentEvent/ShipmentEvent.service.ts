// src/shipmentEvent/ShipmentEvent.service.ts
// Audit ledger service for immutable tracking event recording, idempotency hashing, queries, and timeline synthesis.
import { Types } from 'mongoose';
import {
    CARRIERS,
    type Carrier,
    type EventSource,
    type Disposition,
    type Status,
    type Intent,
    type Effect,
} from '../types/index.js';
import { computeEventKey, parseCarrierTimestamp, normalizeCarrierStatus } from './ShipmentEvent.utils.js';
import { ShipmentEvent, toEventHashBuffer } from './ShipmentEvent.model.js';
import { Shipment } from '../shipment/shipment.model.js';
import { ImportBatch } from '../importBatch/ImportBatch.model.js';
import { applyEvent, applyEventDetailed } from '../engine/applyEvent.js';
import { AppError } from '../middleware/error.js';

// Standard service response envelope
export interface ServiceResponse<T = any> {
    success: boolean;
    status: number;
    message: string;
    data: T;
    error: string | null;
}

// Input to record a single event
export interface RecordShipmentEventInput {
    carrier: Carrier;
    trackingNumber: string;
    source: EventSource;
    rawStatus?: string;
    rawRemarks?: string;
    occurredAt?: Date | string;
    carrierEventId?: string;
    batchId?: string | Types.ObjectId;
    intent?: Intent;
    payload?: Record<string, unknown>;
    payLoad?: Record<string, unknown>;
}

// Result payload of recording a single event
export interface RecordShipmentEventResult {
    disposition: Disposition;
    eventKey: string;
    carrier: Carrier;
    trackingNumber: string;
    occurredAt: Date;
    isDuplicate: boolean;
    nextStatus?: Status;
    appliedEffects?: Effect[];
}

// Input for bulk ingestions
export interface BulkRecordEventsInput {
    events: RecordShipmentEventInput[];
    batchId?: string | Types.ObjectId;
}

// Individual row result in bulk ingestions
export interface BulkEventRowResult {
    index: number;
    trackingNumber: string;
    carrier: Carrier;
    eventKey: string;
    disposition: Disposition;
    isDuplicate: boolean;
    reason?: string;
}

// Bulk result summary
export interface BulkRecordEventsResult {
    total: number;
    applied: number;
    duplicates: number;
    noop: number;
    unknownShipments: number;
    rejected: number;
    results: BulkEventRowResult[];
}

// Filter params for ledger
export interface ListShipmentEventsFilter {
    cursor?: string;
    limit?: number;
    carrier?: Carrier;
    trackingNumber?: string;
    source?: EventSource;
    disposition?: Disposition;
    batchId?: string;
    startDate?: string | Date;
    endDate?: string | Date;
}

// Paginated listing output (Fixed: events is an array)
export interface ListShipmentEventsResult {
    events: Record<string, unknown>[];
    nextCursor?: string;
    totalReturned: number;
}

// Timeline output for a single shipment (Fixed: timeline is an array)
export interface ShipmentTimeLineResult {
    carrier: Carrier;
    trackingNumber: string;
    shipmentId?: string;
    currentStatus?: Status;
    totalEvents: number;
    timeline: Record<string, unknown>[];
}

// Filter for aggregate ledger metrics
export interface LedgerMetricsFilter {
    carrier?: Carrier;
    startDate?: string | Date;
    endDate?: string | Date;
    allTime?: boolean;
}

// Telemetry and audit metrics summary
export interface LedgerMetricsResult {
    totalEvents: number;
    byDisposition: Record<Disposition, number> & Record<string, number>;
    bySource: Record<EventSource, number> & Record<string, number>;
    period: {
        startDate?: string | Date;
        endDate?: string | Date;
    };
}

export const createEmptyLedgerMetricsResult = (period: { startDate?: Date; endDate?: Date } = {}): LedgerMetricsResult => ({
    totalEvents: 0,
    byDisposition: {
        APPLIED: 0,
        NOOP: 0,
        STALE_REJECTED: 0,
        STALE_OUT_OF_ORDER: 0,
        UNKNOWN_SHIPMENT: 0,
        DUPLICATE: 0,
    },
    bySource: {
        CARRIER_POLL: 0,
        CARRIER_WEBHOOK: 0,
        FILE_IMPORT: 0,
        CUSTOMER: 0,
        MERCHANT: 0,
    },
    period,
});

/**
 * Safely parse a date boundary (startDate or endDate).
 * For date-only strings (e.g. 'YYYY-MM-DD'), adjusts endDate to 23:59:59.999Z to prevent cutting off the day.
 */
export function parseDateBoundary(
    input: string | Date | undefined,
    isEnd: boolean,
): { date?: Date; error?: string } {
    if (!input) return {};
    if (input instanceof Date) {
        if (Number.isNaN(input.getTime())) return { error: 'Invalid Date object' };
        return { date: input };
    }
    const trimmed = String(input).trim();
    if (!trimmed) return {};
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const isoString = isEnd ? `${trimmed}T23:59:59.999Z` : `${trimmed}T00:00:00.000Z`;
        const d = new Date(isoString);
        if (Number.isNaN(d.getTime())) return { error: `Invalid date '${trimmed}'` };
        return { date: d };
    }
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) return { error: `Invalid timestamp '${trimmed}'` };
    return { date: d };
}

// ---------- Implementation of Service functions -------------

// Makes jobs with the same laneKey run one at a time, in the order they arrive.
// Jobs on different lanes don't wait for each other, and a failed job never blocks the next one.
const parcelLaneLocks = new Map<string, Promise<unknown>>();

export async function runInParcelLane<T>(laneKey: string, fn: () => Promise<T>): Promise<T> {
    const previous = parcelLaneLocks.get(laneKey) ?? Promise.resolve();

    let releaseLock: () => void;
    const currentLock = new Promise<void>((resolve) => {
        releaseLock = resolve;
    });

    parcelLaneLocks.set(laneKey, currentLock);

    try {
        await previous.catch(() => { });
        return await fn();
    } finally {
        releaseLock!();
        if (parcelLaneLocks.get(laneKey) === currentLock) {
            parcelLaneLocks.delete(laneKey);
        }
    }
}

// to record a single shipment event
export const recordShipmentEventService = async (
    merchantIdInput: string | Types.ObjectId,
    input: RecordShipmentEventInput,
): Promise<ServiceResponse<RecordShipmentEventResult>> => {
    // Phase 1: Input Validation & Sanitization
    if (!merchantIdInput || !Types.ObjectId.isValid(merchantIdInput)) {
        throw new AppError(400, 'Invalid merchant id', 'invalid_merchant_id');
    }
    const merchantId =
        merchantIdInput instanceof Types.ObjectId
            ? merchantIdInput
            : new Types.ObjectId(merchantIdInput);

    if (!input || typeof input !== 'object') {
        throw new AppError(400, 'Invalid input payload', 'invalid_input');
    }

    const carrier = input.carrier?.trim() as Carrier;
    if (!carrier) {
        throw new AppError(400, 'Carrier is required', 'missing_carrier');
    }
    if (!CARRIERS.includes(carrier)) {
        throw new AppError(400, `Invalid carrier '${carrier}'. Supported: ${CARRIERS.join(', ')}`, 'invalid_carrier');
    }

    const trackingNumber = input.trackingNumber?.trim();
    if (!trackingNumber) {
        throw new AppError(400, 'Tracking number is required', 'missing_tracking_number');
    }

    const hasExplicitTimeStamp =
        input.occurredAt !== undefined &&
        input.occurredAt !== null &&
        String(input.occurredAt).trim() !== '';

    let occurredAt: Date;
    if (hasExplicitTimeStamp) {
        const parsed = parseCarrierTimestamp(input.occurredAt);
        if (!parsed) {
            throw new AppError(400, 'Invalid occurredAt timestamp', 'invalid_date');
        }
        occurredAt = parsed;
    } else {
        occurredAt = new Date();
    }

    let batchObjectId: Types.ObjectId | undefined;
    if (input.batchId !== undefined && input.batchId !== null && input.batchId !== '') {
        if (!Types.ObjectId.isValid(input.batchId)) {
            throw new AppError(400, 'Invalid batch id', 'invalid_batch_id');
        }
        batchObjectId =
            input.batchId instanceof Types.ObjectId
                ? input.batchId
                : new Types.ObjectId(input.batchId);
    }

    const rawStatus = input.rawStatus?.trim() || 'UNKNOWN';
    const rawRemarks = input.rawRemarks?.trim() || '';
    const carrierEventId = input.carrierEventId?.trim() || undefined;
    const normalizedPayload = input.payload ?? input.payLoad ?? {};

    // Phase 2: Compute Canonical Event Key
    const eventKey = computeEventKey({
        merchantId: merchantId.toString(),
        carrier,
        trackingNumber,
        rawStatus,
        rawRemarks,
        occurredAt,
        carrierEventId,
    });

    // Phase 3: Intent Resolution
    let intent: Intent;
    if (input.intent) {
        intent = input.intent;
    } else {
        const normalized = normalizeCarrierStatus(rawStatus);
        intent = normalized ? { kind: 'CARRIER_STATUS', status: normalized } : { kind: 'INFORMATIONAL' };
    }

    // Phase 4: Transactional State Application (Serialized per Parcel Lane)
    const laneKey = `${merchantId.toString()}:${carrier}:${trackingNumber}`;

    return await runInParcelLane(laneKey, async () => {
        const command = {
            merchantId,
            carrier,
            trackingNumber,
            intent,
            event: {
                eventKey,
                eventHash: toEventHashBuffer(eventKey),
                merchantId,
                carrier,
                trackingNumber,
                source: input.source,
                rawStatus,
                rawRemarks,
                occurredAt,
                batchId: batchObjectId,
                payload: normalizedPayload,
            },
        };

        const detailed = await applyEventDetailed(command);
        const disposition = detailed.disposition;
        const nextStatus = detailed.nextStatus;
        const appliedEffects = detailed.appliedEffects ?? [];

        // Phase 6: Response Formatting

        const isDuplicate = disposition === 'DUPLICATE';
        const isApplied = disposition === 'APPLIED';

        return {
            success: true,
            status: isApplied ? 201 : 200,
            message: isApplied
                ? 'Shipment event applied successfully'
                : isDuplicate
                    ? 'Duplicate event acknowledged'
                    : `Shipment event processed with disposition '${disposition}'`,
            data: {
                disposition,
                eventKey,
                carrier,
                trackingNumber,
                occurredAt,
                isDuplicate,
                nextStatus: isDuplicate ? undefined : nextStatus,
                appliedEffects,
            },
            error: null,
        };
    });
};

// to ingest a batch of shipment events
export const bulkRecordShipmentEventsService = async (
    merchantIdInput: string | Types.ObjectId,
    input: BulkRecordEventsInput,
): Promise<ServiceResponse<BulkRecordEventsResult>> => {
    // Phase 1: Batch Validation & Boundary Check

    // return if merchant is not valid
    if (!merchantIdInput || !Types.ObjectId.isValid(merchantIdInput)) {
        throw new AppError(400, 'Invalid merchant id', 'invalid_merchant_id');
    }
    const merchantId =
        merchantIdInput instanceof Types.ObjectId
            ? merchantIdInput
            : new Types.ObjectId(merchantIdInput);
    // return if events is not an array
    if (!input || !Array.isArray(input.events)) {
        throw new AppError(400, 'Invalid input: events array is required', 'invalid_input');
    }
    // return if no event is provided
    const total = input.events.length;
    if (total === 0) {
        return {
            success: true,
            status: 200,
            message: 'No events provided in batch',
            data: {
                total: 0,
                applied: 0,
                duplicates: 0,
                noop: 0,
                unknownShipments: 0,
                rejected: 0,
                results: [],
            },
            error: null,
        };
    }
    // return if more than 500 events are provided
    if (total > 500) {
        throw new AppError(400, 'Batch size exceeds maximum limit of 500 events', 'batch_limit_exceeded');
    }
    // return if batch is invalid
    let batchObjectId: string | Types.ObjectId | undefined;
    if (input.batchId !== undefined && input.batchId !== null && input.batchId !== '') {
        if (!Types.ObjectId.isValid(input.batchId)) {
            throw new AppError(400, 'Invalid batch id', 'invalid_batch_id');
        }
        batchObjectId =
            input.batchId instanceof Types.ObjectId
                ? input.batchId
                : new Types.ObjectId(input.batchId);
    }

    // Phase 2: Row Pre-Processing & Soft Validation
    const results: BulkEventRowResult[] = new Array(total);
    // interface for valid rows
    interface PreparedRow {
        index: number;
        carrier: Carrier;
        trackingNumber: string;
        eventKey: string;
        occurredAt: Date;
        rawStatus: string;
        rawRemarks: string;
        carrierEventId?: string;
        payload: Record<string, unknown>;
        intent: Intent;
        source: EventSource;
    }

    const validRows: PreparedRow[] = [];
    const validEventKeysSet = new Set<string>();
    // mark invalid rows are STALE_REJECTED
    for (let i = 0; i < total; i++) {
        const row = input.events[i];
        const originalIndex = i + 1;

        if (!row || typeof row !== 'object') {
            results[i] = {
                index: originalIndex,
                trackingNumber: 'UNKNOWN',
                carrier: 'POSTEX',
                eventKey: '',
                disposition: 'STALE_REJECTED',
                isDuplicate: false,
                reason: 'Row payload is invalid or empty',
            };
            continue;
        }
        //  if the carrier is not provided or is unknown
        const carrier = row.carrier?.trim() as Carrier;
        if (!carrier || !CARRIERS.includes(carrier)) {
            results[i] = {
                index: originalIndex,
                trackingNumber: row.trackingNumber?.trim() || 'UNKNOWN',
                carrier: carrier || ('UNKNOWN' as any),
                eventKey: '',
                disposition: 'STALE_REJECTED',
                isDuplicate: false,
                reason: `Invalid or missing carrier '${row.carrier}'`,
            };
            continue;
        }
        // if there is not tracking number
        const trackingNumber = row.trackingNumber?.trim();
        if (!trackingNumber) {
            results[i] = {
                index: originalIndex,
                trackingNumber: 'UNKNOWN',
                carrier,
                eventKey: '',
                disposition: 'STALE_REJECTED',
                isDuplicate: false,
                reason: 'Tracking number is required',
            };
            continue;
        }
        // if there is not explicit time stamp or a broken timestamp
        const hasExplicitTimeStamp =
            row.occurredAt !== undefined &&
            row.occurredAt !== null &&
            String(row.occurredAt).trim() !== '';

        let occurredAt: Date;
        if (hasExplicitTimeStamp) {
            const parsed = parseCarrierTimestamp(row.occurredAt);
            if (!parsed) {
                results[i] = {
                    index: originalIndex,
                    trackingNumber,
                    carrier,
                    eventKey: '',
                    disposition: 'STALE_REJECTED',
                    isDuplicate: false,
                    reason: 'Invalid occurredAt timestamp',
                };
                continue;
            }
            occurredAt = parsed;
        } else {
            occurredAt = new Date();
        }
        // normalize the raw status and remarks
        const rawStatus = row.rawStatus?.trim() || 'UNKNOWN';
        const rawRemarks = row.rawRemarks?.trim() || '';
        const carrierEventId = row.carrierEventId?.trim() || undefined;
        const normalizedPayload = row.payload ?? row.payLoad ?? {};
        // compute the event key
        const eventKey = computeEventKey({
            merchantId: merchantId.toString(),
            carrier,
            trackingNumber,
            rawStatus,
            rawRemarks,
            occurredAt,
            carrierEventId,
        });
        // set the intent of the event
        let intent: Intent;
        if (row.intent) {
            intent = row.intent;
        } else {
            const normalized = normalizeCarrierStatus(rawStatus);
            intent = normalized ? { kind: 'CARRIER_STATUS', status: normalized } : { kind: 'INFORMATIONAL' };
        }
        // set the source of the event
        const source = row.source || 'FILE_IMPORT';
        // add the row to valid rows
        validRows.push({
            index: originalIndex,
            carrier,
            trackingNumber,
            eventKey,
            occurredAt,
            rawStatus,
            rawRemarks,
            carrierEventId,
            payload: normalizedPayload,
            intent,
            source,
        });
        validEventKeysSet.add(eventKey);
    }

    // Phase 3: Upfront Batch Deduplication Check via indexed eventHash

    const validHashes = Array.from(validEventKeysSet).map((k) => toEventHashBuffer(k));
    const existingDocs =
        validHashes.length > 0
            ? await ShipmentEvent.find({
                merchantId,
                eventHash: { $in: validHashes },
            })
                .select('eventKey')
                .lean()
                .exec()
            : [];

    const existingKeysSet = new Set<string>(existingDocs.map((d: any) => d.eventKey));

    const inBatchSeenKeys = new Set<string>();
    const candidateRows: PreparedRow[] = [];

    for (const row of validRows) {
        if (existingKeysSet.has(row.eventKey) || inBatchSeenKeys.has(row.eventKey)) {
            results[row.index - 1] = {
                index: row.index,
                trackingNumber: row.trackingNumber,
                carrier: row.carrier,
                eventKey: row.eventKey,
                disposition: 'DUPLICATE',
                isDuplicate: true,
            };
        } else {
            inBatchSeenKeys.add(row.eventKey);
            candidateRows.push(row);
        }
    }

    // Phase 4: group by carrier and tracking number and sort oldest to newest

    const parcelGroups = new Map<string, PreparedRow[]>();
    for (const row of candidateRows) {
        const key = `${row.carrier}:${row.trackingNumber}`;
        const list = parcelGroups.get(key) || [];
        list.push(row);
        parcelGroups.set(key, list);
    }

    for (const rows of parcelGroups.values()) {
        rows.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    }

    // Phase 5: Process using parallel lanes
    const parcelLanes = Array.from(parcelGroups.values());
    const CONCURRENCY_LIMIT = 15; // max 15 lanes at a time

    const processParcelLane = async (laneRows: PreparedRow[]): Promise<void> => {
        if (laneRows.length === 0) return;
        const laneKey = `${merchantId.toString()}:${laneRows[0].carrier}:${laneRows[0].trackingNumber}`;

        await runInParcelLane(laneKey, async () => {
            for (const row of laneRows) {
                try {
                    const command = {
                        merchantId,
                        carrier: row.carrier,
                        trackingNumber: row.trackingNumber,
                        intent: row.intent,
                        event: {
                            eventKey: row.eventKey,
                            eventHash: toEventHashBuffer(row.eventKey),
                            merchantId,
                            carrier: row.carrier,
                            trackingNumber: row.trackingNumber,
                            source: row.source,
                            rawStatus: row.rawStatus,
                            rawRemarks: row.rawRemarks,
                            occurredAt: row.occurredAt,
                            batchId: batchObjectId,
                            payload: row.payload,
                        },
                    };
                    //result etc of the event is decided here
                    const res = await applyEventDetailed(command);
                    results[row.index - 1] = {
                        index: row.index,
                        trackingNumber: row.trackingNumber,
                        carrier: row.carrier,
                        eventKey: row.eventKey,
                        disposition: res.disposition,
                        isDuplicate: res.isDuplicate,
                    };
                } catch (err: any) {
                    // if an event throws error , only that row is marked as STALE_REJECTED
                    results[row.index - 1] = {
                        index: row.index,
                        trackingNumber: row.trackingNumber,
                        carrier: row.carrier,
                        eventKey: row.eventKey,
                        disposition: 'STALE_REJECTED',
                        isDuplicate: false,
                        reason: err?.message || 'Processing failed',
                    };
                }
            }
        });
    };

    const executing: Promise<void>[] = [];
    for (const lane of parcelLanes) {
        const p: Promise<void> = processParcelLane(lane).then(() => {
            const idx = executing.indexOf(p);
            if (idx !== -1) executing.splice(idx, 1);
        });
        executing.push(p);
        if (executing.length >= CONCURRENCY_LIMIT) {
            await Promise.race(executing);
        }
    }
    await Promise.all(executing);

    // Phase 6: Count the result and update the batch record
    let applied = 0;
    let duplicates = 0;
    let noop = 0;
    let unknownShipments = 0;
    let rejected = 0;
    const errorsToLog: Array<{ row: number; reason: string }> = [];

    for (const res of results) {
        if (!res) continue;
        switch (res.disposition) {
            case 'APPLIED':
                applied++;
                break;
            case 'DUPLICATE':
                duplicates++;
                break;
            case 'NOOP':
                noop++;
                break;
            case 'UNKNOWN_SHIPMENT':
                unknownShipments++;
                break;
            case 'STALE_REJECTED':
            case 'STALE_OUT_OF_ORDER':
                rejected++;
                if (res.reason) {
                    errorsToLog.push({ row: res.index, reason: res.reason });
                }
                break;
            default:
                rejected++;
                if (res.reason) {
                    errorsToLog.push({ row: res.index, reason: res.reason });
                }
                break;
        }
    }

    if (batchObjectId) {
        try {
            const updateOps: Record<string, unknown> = {
                $inc: {
                    rowCount: total,
                    applied,
                    duplicates,
                    rejected: rejected + unknownShipments,
                },
            };
            if (errorsToLog.length > 0) {
                updateOps.$push = {
                    errors: { $each: errorsToLog.slice(0, 50) },
                };
            }
            await ImportBatch.updateOne({ _id: batchObjectId, merchantId }, updateOps).exec();
        } catch {
            // Metrics update should not fail batch execution
        }
    }

    // Phase 7: Build the response to return
    const hasFailures = rejected > 0 || duplicates > 0 || unknownShipments > 0;
    const statusCode = hasFailures ? 207 : applied > 0 ? 201 : 200;
    const message = hasFailures
        ? 'Batch processed with some duplicate, rejected, or unapplied items'
        : 'All shipment events applied successfully';

    return {
        success: true,
        status: statusCode,
        message,
        data: {
            total,
            applied,
            duplicates,
            noop,
            unknownShipments,
            rejected,
            results,
        },
        error: null,
    };
};

// to list shipment events with keyset pagination
export const listShipmentEventsService = async (
    merchantIdInput: string | Types.ObjectId,
    filter: ListShipmentEventsFilter = {},
): Promise<ServiceResponse<ListShipmentEventsResult>> => {
    // Phase 1: Input Validation & Sanitization
    if (!merchantIdInput || !Types.ObjectId.isValid(merchantIdInput)) {
        throw new AppError(400, 'Invalid merchant id', 'invalid_merchant_id');
    }
    const merchantId =
        merchantIdInput instanceof Types.ObjectId
            ? merchantIdInput
            : new Types.ObjectId(merchantIdInput);
    // calculate the page size using limit
    const limit = Math.min(Math.max(filter.limit ?? 20, 1), 100);
    const query: Record<string, unknown> = { merchantId };

    // Phase 2: Build the DB query using cursor - merchants sees only their own records
    if (filter.cursor && Types.ObjectId.isValid(filter.cursor)) {
        query._id = { $lt: new Types.ObjectId(filter.cursor) };
    }

    if (filter.carrier) {
        const carrier = filter.carrier.trim() as Carrier;
        if (!CARRIERS.includes(carrier)) {
            throw new AppError(400, `Invalid carrier '${carrier}'. Supported: ${CARRIERS.join(', ')}`, 'invalid_carrier');
        }
        query.carrier = carrier;
    }

    if (filter.trackingNumber?.trim()) {
        query.trackingNumber = filter.trackingNumber.trim();
    }

    if (filter.source) {
        query.source = filter.source;
    }

    if (filter.disposition) {
        query.disposition = filter.disposition;
    }

    if (filter.batchId && Types.ObjectId.isValid(filter.batchId)) {
        query.batchId = new Types.ObjectId(filter.batchId);
    }

    if (filter.startDate || filter.endDate) {
        const dateQuery: Record<string, Date> = {};
        let parsedStart: Date | undefined;
        let parsedEnd: Date | undefined;

        if (filter.startDate) {
            const res = parseDateBoundary(filter.startDate, false);
            if (res.error || !res.date) {
                throw new AppError(400, res.error || 'Invalid startDate timestamp', 'invalid_date');
            }
            parsedStart = res.date;
            dateQuery.$gte = res.date;
        }

        if (filter.endDate) {
            const res = parseDateBoundary(filter.endDate, true);
            if (res.error || !res.date) {
                throw new AppError(400, res.error || 'Invalid endDate timestamp', 'invalid_date');
            }
            parsedEnd = res.date;
            dateQuery.$lte = res.date;
        }

        if (parsedStart && parsedEnd && parsedStart > parsedEnd) {
            throw new AppError(400, 'startDate cannot be after endDate', 'invalid_date_range');
        }

        query.occurredAt = dateQuery;
    }

    // Phase 3: Execute the query build above with proper projections
    const docs = await ShipmentEvent.find(query)
        .sort({ _id: -1 })
        .limit(limit + 1)
        .select('_id eventKey carrier trackingNumber source rawStatus rawRemarks occurredAt disposition batchId shipmentId payload createdAt')
        .lean()
        .exec();

    const hasMore = docs.length > limit;
    const sliced = hasMore ? docs.slice(0, limit) : docs;
    const nextCursor = hasMore ? (sliced[sliced.length - 1] as any)._id.toString() : undefined;

    // Phase 4: Clean and Present the output
    const presentedEvents = sliced.map((doc: any) => ({
        id: doc._id.toString(),
        eventKey: doc.eventKey,
        carrier: doc.carrier,
        trackingNumber: doc.trackingNumber,
        source: doc.source,
        rawStatus: doc.rawStatus,
        rawRemarks: doc.rawRemarks,
        occurredAt: doc.occurredAt,
        batchId: doc.batchId ? doc.batchId.toString() : undefined,
        shipmentId: doc.shipmentId ? doc.shipmentId.toString() : undefined,
        disposition: doc.disposition,
        payload: doc.payload ?? {},
        createdAt: doc.createdAt,
    }));

    return {
        success: true,
        status: 200,
        message: 'Shipment events retrieved successfully',
        data: {
            events: presentedEvents,
            nextCursor,
            totalReturned: presentedEvents.length,
        },
        error: null,
    };
};

// to retrieve shipment event timeline by carrier and tracking number
export const getShipmentTimelineService = async (
    merchantIdInput: string | Types.ObjectId,
    carrierInput: string,
    trackingNumberInput: string,
): Promise<ServiceResponse<ShipmentTimeLineResult>> => {
    // Phase 1: Input Validation & Sanitization
    if (!merchantIdInput || !Types.ObjectId.isValid(merchantIdInput)) {
        throw new AppError(400, 'Invalid merchant id', 'invalid_merchant_id');
    }
    const merchantId =
        merchantIdInput instanceof Types.ObjectId
            ? merchantIdInput
            : new Types.ObjectId(merchantIdInput);

    const carrier = carrierInput?.trim() as Carrier;
    if (!carrier || !CARRIERS.includes(carrier)) {
        throw new AppError(400, `Invalid carrier '${carrierInput}'. Supported: ${CARRIERS.join(', ')}`, 'invalid_carrier');
    }

    const trackingNumber = trackingNumberInput?.trim();
    if (!trackingNumber) {
        throw new AppError(400, 'Tracking number is required', 'missing_tracking_number');
    }

    // Phase 2: Execute query strictly scope to the merchant

    //find the shipment
    const shipment = await Shipment.findOne({
        merchantId,
        carrier,
        trackingNumber,
    })
        .select('_id status')
        .lean<{ _id: Types.ObjectId; status: Status }>()
        .exec();
    // find the shipment event
    const events = await ShipmentEvent.find({
        merchantId,
        carrier,
        trackingNumber,
    })
        .sort({ occurredAt: 1 })
        .select('_id eventKey carrier trackingNumber source rawStatus rawRemarks occurredAt disposition batchId payload createdAt')
        .lean()
        .exec();
    // return if no shipment or event found
    if (!shipment && events.length === 0) {
        throw new AppError(404, `Shipment not found for tracking number '${trackingNumber}'`, 'shipment_not_found');
    }

    // Phase 3: Clean and Present the output
    const presentedTimeline = events.map((doc: any) => ({
        id: doc._id.toString(),
        eventKey: doc.eventKey,
        source: doc.source,
        rawStatus: doc.rawStatus,
        rawRemarks: doc.rawRemarks,
        occurredAt: doc.occurredAt,
        disposition: doc.disposition,
        batchId: doc.batchId ? doc.batchId.toString() : undefined,
        payload: doc.payload ?? {},
        createdAt: doc.createdAt,
    }));

    return {
        success: true,
        status: 200,
        message: 'Shipment timeline retrieved successfully',
        data: {
            carrier,
            trackingNumber,
            shipmentId: shipment ? shipment._id.toString() : undefined,
            currentStatus: shipment?.status,
            totalEvents: presentedTimeline.length,
            timeline: presentedTimeline,
        },
        error: null,
    };
};

// to calculate aggregate ledger metrics
export const getLedgerMetricsService = async (
    merchantIdInput: string | Types.ObjectId,
    filter: LedgerMetricsFilter = {},
): Promise<ServiceResponse<LedgerMetricsResult>> => {
    // Phase 1: Input Validation & Build the filter
    if (!merchantIdInput || !Types.ObjectId.isValid(merchantIdInput)) {
        throw new AppError(400, 'Invalid merchant id', 'invalid_merchant_id');
    }
    const merchantId =
        merchantIdInput instanceof Types.ObjectId
            ? merchantIdInput
            : new Types.ObjectId(merchantIdInput);

    const match: Record<string, unknown> = { merchantId };

    if (filter.carrier) {
        const carrier = filter.carrier.trim() as Carrier;
        if (!CARRIERS.includes(carrier)) {
            throw new AppError(400, `Invalid carrier '${carrier}'. Supported: ${CARRIERS.join(', ')}`, 'invalid_carrier');
        }
        match.carrier = carrier;
    }

    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;

    if (filter.startDate || filter.endDate) {
        const dateMatch: Record<string, Date> = {};
        if (filter.startDate) {
            const res = parseDateBoundary(filter.startDate, false);
            if (res.error || !res.date) {
                throw new AppError(400, res.error || 'Invalid startDate timestamp', 'invalid_date');
            }
            parsedStartDate = res.date;
            dateMatch.$gte = res.date;
        }

        if (filter.endDate) {
            const res = parseDateBoundary(filter.endDate, true);
            if (res.error || !res.date) {
                throw new AppError(400, res.error || 'Invalid endDate timestamp', 'invalid_date');
            }
            parsedEndDate = res.date;
            dateMatch.$lte = res.date;
        }

        if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
            throw new AppError(400, 'startDate cannot be after endDate', 'invalid_date_range');
        }

        match.occurredAt = dateMatch;
    } else if (!filter.allTime) {
        // Default to last 30 days to protect against collection-wide scans on high-volume dashboards
        parsedEndDate = new Date();
        parsedStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        match.occurredAt = { $gte: parsedStartDate, $lte: parsedEndDate };
    }

    // Phase 2: Single-pass aggregation grouping by disposition and source (BN-05)
    const rows = await ShipmentEvent.aggregate([
        { $match: match },
        {
            $group: {
                _id: {
                    disposition: '$disposition',
                    source: '$source',
                },
                count: { $sum: 1 },
            },
        },
    ]).exec();

    // Phase 3: Metrics Zero-Filling & Result Formatting
    const allDispositions: Disposition[] = [
        'APPLIED',
        'NOOP',
        'STALE_REJECTED',
        'STALE_OUT_OF_ORDER',
        'UNKNOWN_SHIPMENT',
        'DUPLICATE',
    ];
    const byDisposition: Record<Disposition, number> & Record<string, number> = allDispositions.reduce((acc, d) => {
        acc[d] = 0;
        return acc;
    }, {} as Record<Disposition, number> & Record<string, number>);

    const allSources: EventSource[] = [
        'CARRIER_POLL',
        'CARRIER_WEBHOOK',
        'FILE_IMPORT',
        'CUSTOMER',
        'MERCHANT',
    ];
    const bySource: Record<EventSource, number> & Record<string, number> = allSources.reduce((acc, s) => {
        acc[s] = 0;
        return acc;
    }, {} as Record<EventSource, number> & Record<string, number>);

    let totalEvents = 0;
    for (const item of rows ?? []) {
        const count = typeof item.count === 'number' ? item.count : 0;
        totalEvents += count;
        const d = item._id?.disposition ? String(item._id.disposition) : 'UNKNOWN';
        const s = item._id?.source ? String(item._id.source) : 'UNKNOWN';
        byDisposition[d] = (byDisposition[d] ?? 0) + count;
        bySource[s] = (bySource[s] ?? 0) + count;
    }

    return {
        success: true,
        status: 200,
        message: 'Ledger metrics calculated successfully',
        data: {
            totalEvents,
            byDisposition,
            bySource,
            period: {
                startDate: parsedStartDate,
                endDate: parsedEndDate,
            },
        },
        error: null,
    };
};

// Aliases for compatibility
export const recordShipmentEvent = recordShipmentEventService;
export const bulkRecordShipmentEvents = bulkRecordShipmentEventsService;
export const listShipmentEvents = listShipmentEventsService;
export const getShipmentTimeline = getShipmentTimelineService;
export const getLedgerMetrics = getLedgerMetricsService;
