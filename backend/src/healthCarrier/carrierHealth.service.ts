// src/healthCarrier/carrierHealth.service.ts
// Circuit breaker pattern engine, adaptive polling integration, and health tracking service across Leopards, PostEx, Trax, and TCS couriers.
import { Types } from 'mongoose';
import crypto from 'crypto';
import { carrierHealthModel, type CarrierHealthDoc } from './carrierHealth.model.js';
import {
  CARRIERS,
  type Carrier,
  type breakerState,
  type CarrierAdapter,
  type CarrierUpdate,
  type MerchantCarrierCredentials,
  type Intent,
  type Status,
} from '../types/index.js';
import {
  isRetriableBreakerError,
  isImmediateTripError,
  extractRetryAfterMs,
  extractErrorCode,
  DEFAULT_BASE_BACKOFF_MS,
  DEFAULT_MAX_BACKOFF_MS,
} from './carrierHealth.utils.js';
import { LeopardsAdapter } from './adapters/leopards.adapter.js';
import { PostExAdapter } from './adapters/postex.adapter.js';
import { TraxAdapter } from './adapters/trax.adapter.js';
import { TcsAdapter } from './adapters/tcs.adapter.js';
import {
  getCarrierConfig,
  listMerchantCarrierCredentials,
  upsertMerchantCarrierCredential,
  deleteMerchantCarrierCredential,
} from './carrierCredentials.service.js';
import { Shipment, ShipmentEvent } from '../models/index.js';
import { touchPolled } from '../shipment/shipment.service.js';
import { AppError } from '../middleware/error.js';
import { applyEventDetailed } from '../engine/applyEvent.js';
import { toEventHashBuffer } from '../shipmentEvent/ShipmentEvent.model.js';
import { computeEventKey, parseCarrierTimestamp, normalizeCarrierStatus } from '../utils/eventKey.js';
import { alertOps } from '../utils/opsAlert.js';

// Common Service Response Interface 
export interface ServiceResponse<T = any> {
  success: boolean;
  status: number;
  message: string;
  data: T;
  error: string | null;
}

// Types and Interfaces
export interface CarrierAvailability {
  carrier: Carrier;
  isAvailable: boolean;
  state: breakerState;
  remainingBackOffMs: number;
  backOffUntil?: Date;
  reason?: string;
}

export interface ExecutionPermission {
  allowed: boolean;
  isCanary: boolean;
  state: breakerState;
  retryAfterMs?: number;
  backOffUntil?: Date;
  reason?: string;
}

export interface CarrierHealthSummary {
  carrier: Carrier;
  state: breakerState;
  failureCount: number;
  tripCount: number;
  lastFailureAt?: Date;
  lastSuccessAt?: Date;
  lastTrippedAt?: Date;
  backOffUntil?: Date;
  lastCanaryAt?: Date;
  lastErrorCode?: string | null;
  isHealthy: boolean;
  remainingBackoffMs: number;
}

export interface ExecuteBreakerOptions<T> {
  fallback?: () => Promise<T>;
  timeoutMs?: number;
  isRetriableError?: (error: unknown) => boolean;
  errorCodeExtractor?: (error: unknown) => string | undefined;
}

export interface RecordFailureOptions {
  threshold?: number;
  baseBackOffMs?: number;
  errorCode?: string;
  forceImmediateTrip?: boolean;
  retryAfterMs?: number;
}

export interface ExecuteBreakerProbeData {
  carrier: Carrier;
  simulateFailure?: boolean;
  useFallback?: boolean;
  simulate429?: boolean;
  simulate403?: boolean;
}

export interface TrackShipmentInput {
  carrier: Carrier;
  trackingNumber: string;
  merchantId?: string;
}

// Custom Circuit Breaker Error Class extending standard AppError
export class CircuitBreakerOpenError extends AppError {
  public readonly carrier: Carrier;
  public readonly state: breakerState;
  public override readonly retryAfterMs: number;
  public readonly backOffUntil?: Date;

  constructor(carrier: Carrier, state: breakerState, retryAfterMs = 0, backOffUntil?: Date) {
    const seconds = Math.ceil(retryAfterMs / 1000);
    super(
      503,
      `Circuit breaker for carrier '${carrier}' is ${state}. Calls suspended.${
        seconds > 0 ? ` Retry after ${seconds}s.` : ''
      }`,
      'circuit_breaker_open',
      {
        carrier,
        state,
        retryAfterMs,
        backOffUntil,
      },
      retryAfterMs
    );
    this.name = 'CircuitBreakerOpenError';
    this.carrier = carrier;
    this.state = state;
    this.retryAfterMs = retryAfterMs;
    this.backOffUntil = backOffUntil;
    Object.setPrototypeOf(this, CircuitBreakerOpenError.prototype);
  }
}

// Configuration Defaults
const DEFAULT_FAILURE_THRESHOLD = 5;
const DEFAULT_CANARY_TIMEOUT_MS = 30_000; // 30s canary lease

// Re-export getCarrierConfig from credentials service
export { getCarrierConfig };

// Adapter Resolver for all 4 carriers (Spec §5.1, §5.2)
export const getCarrierAdapter = (carrier: Carrier): CarrierAdapter | null => {
  switch (carrier) {
    case 'LEOPARDS':
      return LeopardsAdapter;
    case 'POSTEX':
      return PostExAdapter;
    case 'TRAX':
      return TraxAdapter;
    case 'TCS':
      return TcsAdapter;
    default:
      return null;
  }
};

// ==================== SHARED INGESTION HELPER (B4-RC-03, B4-BN-03) ====================

/**
 * Ingests a batch of carrier updates for a merchant:
 * 1. Groups by tracking number and sorts chronologically occurredAt ASC (B4-RC-03)
 * 2. Pre-computes eventHash and queries shipment_events once up-front to deduplicate (B4-BN-03)
 * 3. Applies new milestones through applyEventDetailed
 */
export async function ingestCarrierUpdatesForMerchant(
  merchantId: Types.ObjectId | string,
  carrier: Carrier,
  updates: CarrierUpdate[],
  source: 'CARRIER_POLL' | 'CARRIER_WEBHOOK' = 'CARRIER_POLL'
): Promise<{ applied: number; skipped: number }> {
  if (!updates || updates.length === 0) {
    return { applied: 0, skipped: 0 };
  }

  const merchantObjectId =
    typeof merchantId === 'string' ? new Types.ObjectId(merchantId) : merchantId;
  const adapter = getCarrierAdapter(carrier);

  // Group by tracking number
  const byTracking = new Map<string, CarrierUpdate[]>();
  for (const update of updates) {
    const list = byTracking.get(update.trackingNumber) || [];
    list.push(update);
    byTracking.set(update.trackingNumber, list);
  }

  // Chronological sort: oldest milestones first to prevent STALE_REJECTED (B4-RC-03)
  for (const list of byTracking.values()) {
    list.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  }

  const prepared: Array<{
    update: CarrierUpdate;
    eventKey: string;
    eventHash: Buffer;
    rawStatus: string;
    normalized: Status | null;
    occurredAt: Date;
  }> = [];

  const hashes: Buffer[] = [];

  for (const list of byTracking.values()) {
    for (const update of list) {
      const rawStatus = update.rawStatus || 'UNKNOWN';
      const normalized = adapter?.normalize(update) ?? normalizeCarrierStatus(rawStatus);
      const occurredAt = update.occurredAt
        ? (parseCarrierTimestamp(update.occurredAt) ?? new Date(update.occurredAt))
        : new Date(0);

      const eventKey = computeEventKey({
        merchantId: merchantObjectId.toString(),
        carrier,
        trackingNumber: update.trackingNumber,
        rawStatus,
        rawRemarks: update.rawRemarks || '',
        occurredAt,
        carrierEventId: update.carrierEventId,
      });

      const eventHash = toEventHashBuffer(eventKey);
      hashes.push(eventHash);
      prepared.push({
        update,
        eventKey,
        eventHash,
        rawStatus,
        normalized,
        occurredAt,
      });
    }
  }

  // Up-front batch deduplication query against shipment_events (B4-BN-03)
  const existingEvents = await ShipmentEvent.find({
    merchantId: merchantObjectId,
    eventHash: { $in: hashes },
  })
    .select('eventKey -_id')
    .lean()
    .exec();

  const existingKeys = new Set(existingEvents.map((e) => e.eventKey));

  let applied = 0;
  let skipped = 0;

  for (const item of prepared) {
    if (existingKeys.has(item.eventKey)) {
      skipped++;
      continue;
    }

    try {
      const intent: Intent = item.normalized
        ? { kind: 'CARRIER_STATUS', status: item.normalized }
        : { kind: 'INFORMATIONAL' };

      await applyEventDetailed({
        merchantId: merchantObjectId,
        carrier,
        trackingNumber: item.update.trackingNumber,
        intent,
        event: {
          eventKey: item.eventKey,
          eventHash: item.eventHash,
          merchantId: merchantObjectId,
          carrier,
          trackingNumber: item.update.trackingNumber,
          source,
          rawStatus: item.rawStatus,
          rawRemarks: item.update.rawRemarks || '',
          occurredAt: item.occurredAt,
          payload: item.update.payload || {},
        },
      });
      applied++;
      existingKeys.add(item.eventKey);
    } catch (err: any) {
      console.warn(`[IngestCarrierUpdates] Failed to apply event for ${carrier}:${item.update.trackingNumber}:`, err?.message);
    }
  }

  return { applied, skipped };
}

// ==================== SERVICE IMPLEMENTATIONS ====================

// Check availability service
export const checkAvailabilityService = async (
  carrier: Carrier
): Promise<ServiceResponse<CarrierAvailability>> => {
  if (!carrier || !CARRIERS.includes(carrier)) {
    throw new AppError(400, 'carrier is required and must be valid', 'invalid_carrier');
  }

  const doc = await carrierHealthModel
    .findOne({ carrier })
    .select('state lastCanaryAt backOffUntil')
    .lean()
    .exec();

  const now = Date.now();
  if (!doc || doc.state === 'CLOSED') {
    return {
      success: true,
      status: 200,
      message: 'Carrier available',
      data: {
        carrier,
        isAvailable: true,
        state: 'CLOSED',
        remainingBackOffMs: 0,
      },
      error: null,
    };
  }

  const backOffTime = doc.backOffUntil ? new Date(doc.backOffUntil).getTime() : 0;
  const remainingBackOffMs = Math.max(0, backOffTime - now);

  if (doc.state === 'HALF_OPEN') {
    const canaryTime = doc.lastCanaryAt ? new Date(doc.lastCanaryAt).getTime() : 0;
    const canaryExpired = now - canaryTime >= DEFAULT_CANARY_TIMEOUT_MS;

    return {
      success: true,
      status: 200,
      message: canaryExpired ? 'Canary trial time out. Eligible for re-probe' : 'canary trial active',
      data: {
        carrier,
        isAvailable: true,
        state: 'HALF_OPEN',
        remainingBackOffMs: 0,
        reason: canaryExpired ? 'Canary trial time out. Eligible for re-probe' : 'canary trial active',
      },
      error: null,
    };
  }

  const isExpired = remainingBackOffMs === 0;
  return {
    success: true,
    status: 200,
    message: isExpired ? 'Cooldown expired, carrier eligible for canary claim' : 'Carrier in cooldown backoff',
    data: {
      carrier,
      isAvailable: isExpired,
      state: 'OPEN',
      backOffUntil: doc.backOffUntil ? new Date(doc.backOffUntil) : undefined,
      remainingBackOffMs,
      reason: isExpired ? 'BACKOFF EXPIRED; ELIGIBLE FOR CANARY CLAIM' : 'CARRIER IN COOLDOWN BACKOFF',
    },
    error: null,
  };
};

// Acquire execution permission service
export const acquireExecutionPermissionService = async (
  carrier: Carrier,
  canaryTimeoutMs = DEFAULT_CANARY_TIMEOUT_MS
): Promise<ServiceResponse<ExecutionPermission>> => {
  if (!carrier || !CARRIERS.includes(carrier)) {
    throw new AppError(400, 'carrier is required and must be valid', 'invalid_carrier');
  }

  const now = new Date();
  const current = await carrierHealthModel
    .findOne({ carrier })
    .select('state backOffUntil')
    .lean()
    .exec();

  if (!current || current.state === 'CLOSED') {
    return {
      success: true,
      status: 200,
      message: 'permission acquired',
      data: {
        allowed: true,
        isCanary: false,
        state: 'CLOSED',
      },
      error: null,
    };
  }

  const canaryDoc = await carrierHealthModel.claimCanary(carrier, canaryTimeoutMs);
  if (canaryDoc) {
    return {
      success: true,
      status: 200,
      message: 'permission acquired',
      data: {
        allowed: true,
        isCanary: true,
        state: 'HALF_OPEN',
        reason: 'Canary lease successfully claimed',
      },
      error: null,
    };
  }

  const backoffTime = current.backOffUntil ? new Date(current.backOffUntil).getTime() : 0;
  const retryAfterMs = Math.max(0, backoffTime - now.getTime());

  return {
    success: true,
    status: 200,
    message: 'permission denied',
    data: {
      allowed: false,
      isCanary: false,
      state: current.state,
      retryAfterMs,
      backOffUntil: current.backOffUntil ? new Date(current.backOffUntil) : undefined,
      reason:
        current.state === 'HALF_OPEN'
          ? 'Canary trial in progress by another worker'
          : `Carrier cooldown active until ${current.backOffUntil?.toISOString() || 'unknown'}`,
    },
    error: null,
  };
};

// Record success service
export const recordSuccessService = async (
  carrier: Carrier,
  isCanary = false
): Promise<ServiceResponse<CarrierHealthDoc>> => {
  if (!carrier || !CARRIERS.includes(carrier)) {
    throw new AppError(400, 'carrier is required and must be valid', 'invalid_carrier');
  }

  const doc = await carrierHealthModel.recordSuccess(carrier, isCanary);
  if (!doc) {
    throw new AppError(
      400,
      `Could not record success for ${carrier}. Circuit may be OPEN or non-canary.`,
      'circuit_open_or_not_found'
    );
  }

  // If a canary closed the breaker, restore degraded shipments for this carrier to HEALTHY (B4-RC-04)
  if (isCanary && doc.state === 'CLOSED') {
    await Shipment.updateMany(
      { carrier, trackingHealth: 'DEGRADED' },
      { $set: { trackingHealth: 'HEALTHY' } }
    ).catch(() => {});
  }

  return {
    success: true,
    status: 200,
    message: 'success recorded',
    data: doc,
    error: null,
  };
};

// Record failure service
export const recordFailureService = async (
  carrier: Carrier,
  error?: unknown,
  options?: RecordFailureOptions
): Promise<ServiceResponse<CarrierHealthDoc>> => {
  if (!carrier || !CARRIERS.includes(carrier)) {
    throw new AppError(400, 'carrier is required and must be valid', 'invalid_carrier');
  }

  const threshold = options?.threshold ?? DEFAULT_FAILURE_THRESHOLD;
  const baseBackOffMs = options?.baseBackOffMs ?? DEFAULT_BASE_BACKOFF_MS;
  const errorCode = options?.errorCode ?? extractErrorCode(error);
  const forceImmediateTrip = options?.forceImmediateTrip ?? isImmediateTripError(error);
  const retryAfterMs = options?.retryAfterMs ?? extractRetryAfterMs(error);

  const doc = await carrierHealthModel.recordFailure(carrier, threshold, baseBackOffMs, errorCode, {
    forceImmediateTrip,
    retryAfterMs,
  });

  if (!doc) {
    throw new AppError(400, `Could not record failure for ${carrier}`, 'record_failure_failed');
  }

  // When breaker trips to OPEN: bulk-mark active shipments DEGRADED and emit OpsAlert (B4-RC-04, B4-BUG-06)
  if (doc.state === 'OPEN') {
    await Shipment.updateMany(
      {
        carrier,
        status: { $nin: ['DELIVERED', 'CANCELLED', 'RTO_DELIVERED'] },
        trackingHealth: { $ne: 'DEGRADED' },
      },
      { $set: { trackingHealth: 'DEGRADED' } }
    ).catch(() => {});

    await alertOps(
      'CARRIER_BREAKER_OPEN',
      {
        carrier,
        tripCount: doc.tripCount,
        backOffUntil: doc.backOffUntil,
        lastErrorCode: doc.lastErrorCode,
      },
      { severity: 'CRITICAL', dedupeScope: carrier, source: 'carrier_circuit_breaker' }
    ).catch(() => {});
  }

  return {
    success: true,
    status: 200,
    message: 'failure recorded',
    data: doc,
    error: null,
  };
};

// Execute under breaker probe service
export const executeWithBreakerProbeService = async (
  data: ExecuteBreakerProbeData
): Promise<ServiceResponse<any>> => {
  const { carrier, simulateFailure, useFallback, simulate429, simulate403 } = data;
  if (!carrier || !CARRIERS.includes(carrier)) {
    throw new AppError(400, 'Carrier is required and must be valid', 'carrier_required');
  }

  const result = await executeWithBreaker(
    carrier,
    async () => {
      if (simulate429) {
        const err: any = new Error('Simulated upstream HTTP 429 Too Many Requests');
        err.status = 429;
        err.response = { status: 429, headers: { 'retry-after': '120' } };
        throw err;
      }
      if (simulate403) {
        const err: any = new Error('Simulated upstream HTTP 403 Cloudflare Security Challenge');
        err.status = 403;
        err.response = { status: 403 };
        throw err;
      }
      if (simulateFailure) {
        const err: any = new Error('Simulated upstream carrier failure');
        err.status = 500;
        throw err;
      }
      return {
        carrier,
        executedAt: new Date(),
        probeStatus: 'SUCCESS',
      };
    },
    {
      fallback: useFallback
        ? async () => ({ carrier, executedAt: new Date(), probeStatus: 'FALLBACK' })
        : undefined,
    }
  );

  return {
    success: true,
    status: 200,
    message: 'Operation executed successfully under circuit breaker',
    data: result,
    error: null,
  };
};

// Track shipment under circuit breaker protection service
export const trackShipmentService = async (
  input: TrackShipmentInput
): Promise<ServiceResponse<any>> => {
  const { carrier, trackingNumber, merchantId } = input;

  if (!carrier || !trackingNumber) {
    throw new AppError(400, 'carrier and tracking number are required', 'carrier_and_tracking_number_required');
  }

  if (!CARRIERS.includes(carrier)) {
    throw new AppError(400, 'Invalid carrier', 'invalid_carrier');
  }

  const creds = await getCarrierConfig(carrier, merchantId);
  const carrierAdapter = getCarrierAdapter(carrier);
  if (!carrierAdapter) {
    throw new AppError(501, 'Adapter not implemented for carrier', 'carrier_adapter_not_implemented');
  }

  try {
    const trackingData = await executeWithBreaker(carrier, async () => {
      return await carrierAdapter.fetchUpdates(creds, [trackingNumber]);
    });

    const normalizedUpdates = trackingData.map((u) => ({
      ...u,
      normalizedStatus: carrierAdapter.normalize(u),
    }));

    await touchPolled(carrier, [trackingNumber], merchantId).catch(() => {});

    // Ingest discovered updates using shared chronological & dedup helper (B4-RC-03, B4-BN-03)
    if (merchantId && Types.ObjectId.isValid(merchantId)) {
      await ingestCarrierUpdatesForMerchant(merchantId, carrier, trackingData, 'CARRIER_POLL');
    }

    return {
      success: true,
      status: 200,
      message: 'Tracking data retrieved successfully',
      data: {
        carrier,
        trackingNumber,
        trackingHealth: 'HEALTHY',
        updates: normalizedUpdates,
      },
      error: null,
    };
  } catch (err: any) {
    if (err instanceof CircuitBreakerOpenError) {
      const degradeFilter: Record<string, unknown> = { carrier, trackingNumber };
      if (merchantId) degradeFilter.merchantId = merchantId;
      await Shipment.updateMany(degradeFilter, { $set: { trackingHealth: 'DEGRADED' } }).catch(() => {});
    }

    throw err;
  }
};

// Get single carrier health document service
export const getCarrierHealthService = async (
  carrier: Carrier
): Promise<ServiceResponse<CarrierHealthDoc>> => {
  if (!carrier || !CARRIERS.includes(carrier)) {
    throw new AppError(400, 'carrier is required and must be valid', 'invalid_carrier');
  }

  const doc = await carrierHealthModel
    .findOne({ carrier })
    .select('carrier state failureCount tripCount lastFailureAt lastSuccessAt lastTrippedAt backOffUntil lastCanaryAt lastErrorCode updatedAt')
    .lean()
    .exec();

  if (!doc) {
    throw new AppError(404, `Carrier health doc not found for ${carrier}`, 'carrier_not_found');
  }

  return {
    success: true,
    status: 200,
    message: `Carrier health fetched for ${carrier}`,
    data: doc as CarrierHealthDoc,
    error: null,
  };
};

// Get all carriers health service
export const getAllCarriersHealthService = async (): Promise<ServiceResponse<CarrierHealthSummary[]>> => {
  const docs = await carrierHealthModel
    .find()
    .select('carrier state failureCount tripCount lastFailureAt lastSuccessAt lastTrippedAt backOffUntil lastCanaryAt lastErrorCode updatedAt')
    .lean()
    .exec();
  const docMap = new Map(docs.map((d) => [d.carrier, d]));
  const now = Date.now();

  const summary = CARRIERS.map((carrier) => {
    const doc = docMap.get(carrier);
    if (!doc) {
      return {
        carrier,
        state: 'CLOSED' as const,
        failureCount: 0,
        tripCount: 0,
        isHealthy: true,
        remainingBackoffMs: 0,
      };
    }

    const backoffTime = doc.backOffUntil ? new Date(doc.backOffUntil).getTime() : 0;
    const remainingBackoffMs = Math.max(0, backoffTime - now);
    const isHealthy = doc.state === 'CLOSED' && doc.failureCount === 0;

    return {
      carrier,
      state: doc.state,
      failureCount: doc.failureCount,
      tripCount: doc.tripCount,
      lastFailureAt: doc.lastFailureAt ? new Date(doc.lastFailureAt) : undefined,
      lastSuccessAt: doc.lastSuccessAt ? new Date(doc.lastSuccessAt) : undefined,
      lastTrippedAt: doc.lastTrippedAt ? new Date(doc.lastTrippedAt) : undefined,
      backOffUntil: doc.backOffUntil ? new Date(doc.backOffUntil) : undefined,
      lastCanaryAt: doc.lastCanaryAt ? new Date(doc.lastCanaryAt) : undefined,
      lastErrorCode: doc.lastErrorCode,
      isHealthy,
      remainingBackoffMs,
    };
  });

  return {
    success: true,
    status: 200,
    message: 'Carriers health summary',
    data: summary,
    error: null,
  };
};

// Reset carrier breaker service
export const resetCarrierBreakerService = async (
  carrier: Carrier
): Promise<ServiceResponse<CarrierHealthDoc>> => {
  if (!carrier || !CARRIERS.includes(carrier)) {
    throw new AppError(400, 'carrier is required and must be valid', 'invalid_carrier');
  }

  const result = await carrierHealthModel.findOneAndUpdate(
    { carrier },
    {
      $set: {
        state: 'CLOSED',
        failureCount: 0,
        tripCount: 0,
        lastSuccessAt: new Date(),
      },
      $unset: {
        backOffUntil: '',
        lastCanaryAt: '',
        lastErrorCode: '',
      },
    },
    { returnDocument: 'after', upsert: true }
  );

  // Restore degraded active shipments back to HEALTHY
  await Shipment.updateMany(
    { carrier, trackingHealth: 'DEGRADED' },
    { $set: { trackingHealth: 'HEALTHY' } }
  ).catch(() => {});

  return {
    success: true,
    status: 200,
    message: `Circuit breaker reset for ${carrier}`,
    data: result,
    error: null,
  };
};

// Force trip breaker service
export const forceTripBreakerService = async (
  carrier: Carrier,
  durationMs = DEFAULT_MAX_BACKOFF_MS,
  reason = 'MANUAL_OVERRIDE'
): Promise<ServiceResponse<CarrierHealthDoc>> => {
  if (!carrier || !CARRIERS.includes(carrier)) {
    throw new AppError(400, 'carrier is required and must be valid', 'invalid_carrier');
  }

  const now = new Date();
  const backOffUntil = new Date(now.getTime() + durationMs);

  const result = await carrierHealthModel.findOneAndUpdate(
    { carrier },
    {
      $set: {
        state: 'OPEN',
        lastTrippedAt: now,
        backOffUntil,
        lastErrorCode: reason,
      },
      $inc: { tripCount: 1 },
    },
    { returnDocument: 'after', upsert: true }
  );

  // Bulk degrade shipments and alert
  await Shipment.updateMany(
    {
      carrier,
      status: { $nin: ['DELIVERED', 'CANCELLED', 'RTO_DELIVERED'] },
      trackingHealth: { $ne: 'DEGRADED' },
    },
    { $set: { trackingHealth: 'DEGRADED' } }
  ).catch(() => {});

  await alertOps(
    'CARRIER_BREAKER_OPEN',
    { carrier, tripCount: result.tripCount, backOffUntil, lastErrorCode: reason },
    { severity: 'CRITICAL', dedupeScope: carrier, source: 'manual_override' }
  ).catch(() => {});

  return {
    success: true,
    status: 200,
    message: `Circuit breaker tripped for ${carrier}`,
    data: result,
    error: null,
  };
};

// Higher-order execution wrapper that runs an asynchronous operation protected by the circuit breaker
export const executeWithBreaker = async <T>(
  carrier: Carrier,
  operation: () => Promise<T>,
  options?: ExecuteBreakerOptions<T>
): Promise<T> => {
  const permissionResult = await acquireExecutionPermissionService(carrier);
  const permission = permissionResult.data;

  if (!permission.allowed) {
    if (options?.fallback) {
      return options.fallback();
    }
    throw new CircuitBreakerOpenError(
      carrier,
      permission.state,
      permission.retryAfterMs ?? 0,
      permission.backOffUntil
    );
  }

  try {
    const result = await operation();
    await recordSuccessService(carrier, permission.isCanary).catch((err) =>
      console.error(`Failed to record success for ${carrier}:`, err)
    );
    return result;
  } catch (err) {
    const isRetriable = options?.isRetriableError
      ? options.isRetriableError(err)
      : isRetriableBreakerError(err);

    if (isRetriable) {
      const isImmediate = isImmediateTripError(err);
      const retryAfterMs = extractRetryAfterMs(err);
      const code = options?.errorCodeExtractor
        ? options.errorCodeExtractor(err)
        : extractErrorCode(err);

      await recordFailureService(carrier, err, {
        errorCode: code,
        forceImmediateTrip: isImmediate,
        retryAfterMs,
      }).catch((recordErr) =>
        console.error(`Failed to record failure for ${carrier}:`, recordErr)
      );
    }

    if (options?.fallback) {
      return options.fallback();
    }

    throw err;
  }
};

// ==================== CARRIER WEBHOOK PROCESSOR (Spec §5.5) ====================

export interface CarrierWebhookSimulationInput {
  carrier: Carrier;
  trackingNumber: string;
  rawStatus: string;
  rawRemarks?: string;
  merchantId?: string;
  occurredAt?: Date | string;
}

/**
 * Verifies raw-byte webhook signatures using constant-time comparison (crypto.timingSafeEqual)
 */
export function verifyCarrierWebhookSignature(
  carrier: Carrier,
  rawBody: Buffer | string | undefined,
  headers: Record<string, string | string[] | undefined>,
  secret: string
): boolean {
  if (!secret) return true; // If no secret configured, allow (open endpoint)

  const rawBuf = Buffer.isBuffer(rawBody)
    ? rawBody
    : typeof rawBody === 'string'
    ? Buffer.from(rawBody, 'utf8')
    : Buffer.alloc(0);

  // Normalize header keys to lowercase
  const lowerHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    lowerHeaders[k.toLowerCase()] = Array.isArray(v) ? v[0] : String(v || '');
  }

  const sigHeader =
    lowerHeaders['x-signature'] ||
    lowerHeaders['x-signature-sha256'] ||
    lowerHeaders['x-hub-signature-256'] ||
    lowerHeaders[`x-${carrier.toLowerCase()}-signature`];

  if (sigHeader) {
    const cleanSig = sigHeader.trim().replace(/^sha256=/i, '').toLowerCase();
    const computedHex = crypto.createHmac('sha256', secret).update(rawBuf).digest('hex').toLowerCase();
    const bufA = Buffer.from(cleanSig, 'utf8');
    const bufB = Buffer.from(computedHex, 'utf8');
    if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
      return true;
    }
  }

  // Also support Token-based header authentication
  const authHeader = lowerHeaders['authorization'] || lowerHeaders['x-api-key'];
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const bufA = Buffer.from(token, 'utf8');
    const bufB = Buffer.from(secret, 'utf8');
    if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
      return true;
    }
  }

  return false;
}

export async function processCarrierWebhookService(
  carrier: Carrier,
  body: any,
  rawBody?: Buffer,
  headers: Record<string, any> = {}
): Promise<ServiceResponse<any>> {
  if (!carrier || !CARRIERS.includes(carrier)) {
    throw new AppError(400, 'Invalid carrier', 'invalid_carrier');
  }

  const trackingNumber = String(
    body?.trackingNumber ||
    body?.tracking_number ||
    body?.cn ||
    body?.CN ||
    body?.consignmentNumber ||
    ''
  ).trim().toUpperCase();

  if (!trackingNumber) {
    throw new AppError(400, 'Tracking number missing from webhook payload', 'missing_tracking_number');
  }

  // Look up shipment to resolve merchantId and credential configuration
  let merchantId = body?.merchantId ? String(body.merchantId) : '';
  if (!merchantId) {
    const shipment = await Shipment.findOne({ carrier, trackingNumber })
      .select('merchantId')
      .lean()
      .exec();
    if (shipment) {
      merchantId = shipment.merchantId.toString();
    }
  }

  // Resolve carrier credentials & webhook configuration
  const creds = await getCarrierConfig(carrier, merchantId);
  const webhookEnabled = Boolean(creds?.extra?.webhookEnabled);

  // Enforce feature flag (Spec §5.5)
  if (!webhookEnabled) {
    throw new AppError(
      403,
      `Webhooks are disabled for carrier ${carrier}. Enable in Merchant Carrier Settings.`,
      'carrier_webhooks_disabled'
    );
  }

  // Verify HMAC signature if secret configured
  const webhookSecret = (creds?.extra?.webhookSecret as string) || '';
  if (webhookSecret) {
    const isValid = verifyCarrierWebhookSignature(carrier, rawBody, headers, webhookSecret);
    if (!isValid) {
      throw new AppError(401, 'Invalid webhook signature', 'invalid_webhook_signature');
    }
  }

  // Parse milestones from webhook payload
  const rawStatus = String(body?.status || body?.rawStatus || body?.orderStatus || 'IN_TRANSIT');
  const rawRemarks = String(body?.remarks || body?.rawRemarks || body?.message || rawStatus);
  const occurredAt = body?.occurredAt || body?.timestamp ? new Date(body.occurredAt || body.timestamp) : new Date();

  const update: CarrierUpdate = {
    trackingNumber,
    rawStatus,
    rawRemarks,
    occurredAt: isNaN(occurredAt.getTime()) ? new Date() : occurredAt,
    carrierEventId: body?.carrierEventId || `${trackingNumber}:wh:${Date.now()}`,
    payload: { source: 'CARRIER_WEBHOOK', raw: body },
  };

  if (merchantId && Types.ObjectId.isValid(merchantId)) {
    const result = await ingestCarrierUpdatesForMerchant(
      merchantId,
      carrier,
      [update],
      'CARRIER_WEBHOOK'
    );
    return {
      success: true,
      status: 200,
      message: 'Webhook processed successfully',
      data: {
        carrier,
        trackingNumber,
        applied: result.applied,
        skipped: result.skipped,
      },
      error: null,
    };
  }

  return {
    success: true,
    status: 200,
    message: 'Webhook acknowledged (no matching merchant found)',
    data: { carrier, trackingNumber, applied: 0, skipped: 1 },
    error: null,
  };
}

export async function simulateCarrierWebhookService(
  input: CarrierWebhookSimulationInput
): Promise<ServiceResponse<any>> {
  const { carrier, trackingNumber, rawStatus, rawRemarks, merchantId, occurredAt } = input;

  if (!carrier || !CARRIERS.includes(carrier)) {
    throw new AppError(400, 'Invalid carrier', 'invalid_carrier');
  }
  if (!trackingNumber) {
    throw new AppError(400, 'trackingNumber is required', 'missing_tracking_number');
  }

  const cleanCN = trackingNumber.trim().toUpperCase();
  let resolvedMerchantId = merchantId;

  if (!resolvedMerchantId) {
    const shipment = await Shipment.findOne({ carrier, trackingNumber: cleanCN })
      .select('merchantId')
      .lean()
      .exec();
    if (shipment) {
      resolvedMerchantId = shipment.merchantId.toString();
    }
  }

  const dateObj = occurredAt ? new Date(occurredAt) : new Date();
  const update: CarrierUpdate = {
    trackingNumber: cleanCN,
    rawStatus: rawStatus || 'OUT_FOR_DELIVERY',
    rawRemarks: rawRemarks || 'Simulated carrier webhook scan',
    occurredAt: isNaN(dateObj.getTime()) ? new Date() : dateObj,
    carrierEventId: `${cleanCN}:sim_wh:${Date.now()}`,
    payload: { source: 'CARRIER_WEBHOOK_SIMULATOR' },
  };

  if (resolvedMerchantId && Types.ObjectId.isValid(resolvedMerchantId)) {
    const result = await ingestCarrierUpdatesForMerchant(
      resolvedMerchantId,
      carrier,
      [update],
      'CARRIER_WEBHOOK'
    );
    return {
      success: true,
      status: 200,
      message: 'Simulated webhook processed',
      data: {
        carrier,
        trackingNumber: cleanCN,
        applied: result.applied,
        skipped: result.skipped,
      },
      error: null,
    };
  }

  return {
    success: true,
    status: 200,
    message: 'Simulated webhook received (no merchant linked)',
    data: { carrier, trackingNumber: cleanCN, applied: 0, skipped: 1 },
    error: null,
  };
}

// Credentials CRUD Services
export const listCarrierCredentialsService = async (merchantId: string): Promise<ServiceResponse<any>> => {
  const result = await listMerchantCarrierCredentials(merchantId);
  return {
    success: true,
    status: 200,
    message: 'Merchant carrier credentials retrieved',
    data: result,
    error: null,
  };
};

export const upsertCarrierCredentialService = async (
  merchantId: string,
  input: any
): Promise<ServiceResponse<any>> => {
  const result = await upsertMerchantCarrierCredential(merchantId, input);
  return {
    success: true,
    status: 200,
    message: 'Carrier credentials updated successfully',
    data: result,
    error: null,
  };
};

export const deleteCarrierCredentialService = async (
  merchantId: string,
  carrier: Carrier
): Promise<ServiceResponse<any>> => {
  await deleteMerchantCarrierCredential(merchantId, carrier);
  return {
    success: true,
    status: 200,
    message: `Carrier credentials deleted for ${carrier}`,
    data: { carrier },
    error: null,
  };
};

// Bootstrapper: Ensures default records exist in MongoDB for all defined carriers
export async function initializeAllCarriers(): Promise<void> {
  const operations = CARRIERS.map((carrier) => ({
    updateOne: {
      filter: { carrier },
      update: {
        $setOnInsert: {
          carrier,
          state: 'CLOSED' as const,
          failureCount: 0,
          tripCount: 0,
        },
      },
      upsert: true,
    },
  }));

  if (operations.length > 0) {
    await carrierHealthModel.bulkWrite(operations as any);
  }
}

// Aliases for compatibility
export const checkAvailability = checkAvailabilityService;
export const acquireExecutionPermission = acquireExecutionPermissionService;
export const recordSuccess = recordSuccessService;
export const recordFailure = recordFailureService;
export const getAllCarriersHealth = getAllCarriersHealthService;
export const resetCarrierBreaker = resetCarrierBreakerService;
export const forceTripBreaker = forceTripBreakerService;
export const getCarrierHealth = async (carrier: Carrier): Promise<CarrierHealthDoc | null> => {
  return carrierHealthModel
    .findOne({ carrier })
    .select('carrier state failureCount tripCount lastFailureAt lastSuccessAt lastTrippedAt backOffUntil lastCanaryAt lastErrorCode updatedAt')
    .lean()
    .exec() as any;
};
