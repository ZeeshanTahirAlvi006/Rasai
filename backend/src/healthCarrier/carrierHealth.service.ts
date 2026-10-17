import { carrierHealthModel, type CarrierHealthDoc } from './carrierHealth.model.js';
import {
  CARRIERS,
  type Carrier,
  type breakerState,
  type CarrierAdapter,
  type CarrierUpdate,
  type MerchantCarrierCredentials
} from '../types/index.js';
import {
  isRetriableBreakerError,
  extractErrorCode,
  DEFAULT_BASE_BACKOFF_MS,
  DEFAULT_MAX_BACKOFF_MS
} from "./carrierHealth.utils.js";
import { LeopardsAdapter } from "./adapters/leopards.adapter.js";
import { Shipment } from "../models/index.js";
import { touchPolled } from "../shipment/shipment.service.js";
import { AppError } from "../middleware/error.js";

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
}

export interface ExecuteBreakerProbeData {
  carrier: Carrier;
  simulateFailure?: boolean;
  useFallback?: boolean;
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
      `Circuit breaker for carrier '${carrier}' is ${state}. Calls suspended.${seconds > 0 ? ` Retry after ${seconds}s.` : ''
      }`,
      'circuit_breaker_open',
      {
        carrier,
        state,
        retryAfterMs,
        backOffUntil,
      },
      retryAfterMs,
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

// Carrier Config & Adapter Resolvers
export const getCarrierConfig = async (
  carrier: Carrier,
  merchantId?: string
): Promise<MerchantCarrierCredentials | null> => {
  return {
    merchantId: merchantId || '',
    carrier,
    apiKey: process.env[`${carrier}_API_KEY`] || '',
    apiSecret: process.env[`${carrier}_API_SECRET`] || '',
    extra: {}
  };
};

export const getCarrierAdapter = (carrier: Carrier): CarrierAdapter | null => {
  if (carrier === 'LEOPARDS') {
    return LeopardsAdapter;
  }

  return {
    carrier,
    limits: { maxBatch: 10, minIntervalMs: 1000 },
    async fetchUpdates(creds: MerchantCarrierCredentials, trackingNumbers: string[]): Promise<CarrierUpdate[]> {
      return trackingNumbers.map((trackingNumber) => ({
        trackingNumber,
        rawStatus: 'IN_TRANSIT',
        rawRemarks: 'In transit to destination hub',
        occurredAt: new Date(),
        payload: { carrier: creds.carrier }
      }));
    },
    normalize(update: CarrierUpdate) {
      switch (update.rawStatus.toUpperCase()) {
        case 'DELIVERED': return 'DELIVERED';
        case 'OUT_FOR_DELIVERY': return 'OUT_FOR_DELIVERY';
        case 'NDR':
        case 'FAILED_ATTEMPT': return 'NDR_ACTIVE';
        case 'RETURNED': return 'RTO_DELIVERED';
        default: return 'IN_TRANSIT';
      }
    }
  };
};

// ==================== SERVICE IMPLEMENTATIONS ====================

// Check availability service
export const checkAvailabilityService = async (
  carrier: Carrier
): Promise<ServiceResponse<CarrierAvailability>> => {
  if (!carrier || !CARRIERS.includes(carrier)) {
    throw new AppError(400, 'carrier is required and must be valid', 'invalid_carrier');
  }

  const doc = await carrierHealthModel.findOne({ carrier })
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
        remainingBackOffMs: 0
      },
      error: null
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
        reason: canaryExpired
          ? 'Canary trial time out. Eligilble for re-probe'
          : 'canary trial active'
      },
      error: null
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
      reason: isExpired
        ? 'BACK OF EXPIRED; ELIGIBLE FOR CANARY CLAIM'
        : 'CARRIER IN COOLDOWN BACKOFF'
    },
    error: null
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
  const current = await carrierHealthModel.findOne({ carrier })
    .select('state backOffUntil')
    .exec();

  if (!current || current.state === 'CLOSED') {
    return {
      success: true,
      status: 200,
      message: 'permisson acquired',
      data: {
        allowed: true,
        isCanary: false,
        state: 'CLOSED',
      },
      error: null
    };
  }

  const canaryDoc = await carrierHealthModel.claimCanary(carrier, canaryTimeoutMs);
  if (canaryDoc) {
    return {
      success: true,
      status: 200,
      message: 'permisson acquired',
      data: {
        allowed: true,
        isCanary: true,
        state: 'HALF_OPEN',
        reason: 'Canary lease successfully claimed',
      },
      error: null
    };
  }

  const backoffTime = current.backOffUntil ? current.backOffUntil.getTime() : 0;
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
      reason:
        current.state === 'HALF_OPEN'
          ? 'Canary trial in progress by another worker'
          : `Carrier cooldown active until ${current.backOffUntil?.toISOString() || 'unknown'}`,
    },
    error: null
  };
};

// Record success service
export const recordSuccessService = async (
  carrier: Carrier
): Promise<ServiceResponse<CarrierHealthDoc>> => {
  if (!carrier || !CARRIERS.includes(carrier)) {
    throw new AppError(400, 'carrier is required and must be valid', 'invalid_carrier');
  }

  const doc = await carrierHealthModel.recordSuccess(carrier);
  if (!doc) {
    throw new AppError(400, `Could not record success for ${carrier}. Circuit may be OPEN.`, 'circuit_open_or_not_found');
  }

  return {
    success: true,
    status: 200,
    message: 'success recorded',
    data: doc,
    error: null
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

  const doc = await carrierHealthModel.recordFailure(carrier, threshold, baseBackOffMs, errorCode);
  if (!doc) {
    throw new AppError(400, `Could not record failure for ${carrier}`, 'record_failure_failed');
  }

  return {
    success: true,
    status: 200,
    message: 'failure recorded',
    data: doc,
    error: null
  };
};

// Execute under breaker probe service (for the probe endpoint)
export const executeWithBreakerProbeService = async (
  data: ExecuteBreakerProbeData
): Promise<ServiceResponse<any>> => {
  const { carrier, simulateFailure, useFallback } = data;
  if (!carrier || !CARRIERS.includes(carrier)) {
    throw new AppError(400, 'Carrier is required and must be valid', 'carrier_required');
  }

  const result = await executeWithBreaker(
    carrier,
    async () => {
      if (simulateFailure) {
        const err = new Error('Simulated upstream carrier failure');
        (err as any).status = 500;
        throw err;
      }
      return {
        carrier,
        executedAt: new Date(),
        probeStatus: 'SUCCESS'
      };
    },
    {
      fallback: useFallback
        ? async () => ({ carrier, executedAt: new Date(), probeStatus: 'FALLBACK' })
        : undefined
    }
  );

  return {
    success: true,
    status: 200,
    message: 'Operation executed successfully under circuit breaker',
    data: result,
    error: null
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
  if (!creds) {
    throw new AppError(404, 'No credentials configured for carrier', 'carrier_credentials_not_found');
  }

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
      normalizedStatus: carrierAdapter.normalize(u)
    }));
    await touchPolled(carrier, [trackingNumber], merchantId).catch(() => { });

    return {
      success: true,
      status: 200,
      message: 'Tracking data retrieved successfully',
      data: {
        carrier,
        trackingNumber,
        trackingHealth: 'HEALTHY',
        updates: normalizedUpdates
      },
      error: null
    };
  } catch (err: any) {
    if (err instanceof CircuitBreakerOpenError) {
      const degradeFilter: Record<string, unknown> = { carrier, trackingNumber };
      if (merchantId) degradeFilter.merchantId = merchantId;
      await Shipment.updateMany(
        degradeFilter,
        { $set: { trackingHealth: 'DEGRADED' } }
      ).catch(() => { });
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

  const doc = await carrierHealthModel.findOne({ carrier });
  if (!doc) {
    throw new AppError(404, `Carrier health doc not found for ${carrier}`, 'carrier_not_found');
  }

  return {
    success: true,
    status: 200,
    message: `Carrier health fetched for ${carrier}`,
    data: doc,
    error: null
  };
};

// Get all carriers health service
export const getAllCarriersHealthService = async (): Promise<ServiceResponse<CarrierHealthSummary[]>> => {
  const docs = await carrierHealthModel.find().lean().exec();
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
    error: null
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

  return {
    success: true,
    status: 200,
    message: `Circuit breaker reset for ${carrier}`,
    data: result,
    error: null
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

  return {
    success: true,
    status: 200,
    message: `Circuit breaker tripped for ${carrier}`,
    data: result,
    error: null
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
      permission.retryAfterMs ?? 0
    );
  }

  try {
    const result = await operation();
    // Record success upon completion
    await recordSuccessService(carrier).catch((err) =>
      console.error(`Failed to record success for ${carrier}:`, err)
    );
    return result;
  } catch (err) {
    const isRetriable = options?.isRetriableError
      ? options.isRetriableError(err)
      : isRetriableBreakerError(err);

    if (isRetriable) {
      const code = options?.errorCodeExtractor
        ? options.errorCodeExtractor(err)
        : extractErrorCode(err);

      await recordFailureService(carrier, err, { errorCode: code }).catch((recordErr) =>
        console.error(`Failed to record failure for ${carrier}:`, recordErr)
      );
    }

    if (options?.fallback) {
      return options.fallback();
    }

    throw err;
  }
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
  return carrierHealthModel.findOne({ carrier });
};
