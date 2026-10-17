import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { type Carrier } from '../types/index.js';
import {
  checkAvailabilityService,
  acquireExecutionPermissionService,
  recordSuccessService,
  recordFailureService,
  executeWithBreakerProbeService,
  trackShipmentService,
  getAllCarriersHealthService,
  resetCarrierBreakerService,
  forceTripBreakerService,
  getCarrierConfig,
  getCarrierAdapter
} from './carrierHealth.service.js';

// Re-export adapters & credentials resolvers for backwards compatibility
export { getCarrierConfig, getCarrierAdapter };

// Check availability
export const checkAvailabilityController = asyncHandler(async (req: Request, res: Response) => {
  const carrier = req.params.carrier as Carrier;
  const result = await checkAvailabilityService(carrier);
  const response = {
    success: result?.success,
    message: result?.message,
    data: result?.data,
    error: result?.error
  };
  return res.status(result?.status as number).json(response);
});

// Acquire execution permission
export const acquireExecutionPermissionController = asyncHandler(async (req: Request, res: Response) => {
  const carrier = req.params.carrier as Carrier;
  const result = await acquireExecutionPermissionService(carrier);
  const response = {
    success: result?.success,
    message: result?.message,
    data: result?.data,
    error: result?.error
  };
  return res.status(result?.status as number).json(response);
});

// Record success
export const recordSuccessController = asyncHandler(async (req: Request, res: Response) => {
  const carrier = req.params.carrier as Carrier;
  const result = await recordSuccessService(carrier);
  const response = {
    success: result?.success,
    message: result?.message,
    data: result?.data,
    error: result?.error
  };
  return res.status(result?.status as number).json(response);
});

// Record failure
export const recordFailureController = asyncHandler(async (req: Request, res: Response) => {
  const carrier = req.params.carrier as Carrier;
  const { threshold, baseBackOffMs, errorCode } = { ...req.params, ...req.body };
  const result = await recordFailureService(carrier, undefined, {
    threshold: threshold ? Number(threshold) : undefined,
    baseBackOffMs: baseBackOffMs ? Number(baseBackOffMs) : undefined,
    errorCode: errorCode ? String(errorCode) : undefined
  });
  const response = {
    success: result?.success,
    message: result?.message,
    data: result?.data,
    error: result?.error
  };
  return res.status(result?.status as number).json(response);
});

// Execute under breaker probe
export const executeWithBreakerController = asyncHandler(async (req: Request, res: Response) => {
  const carrier = req.params.carrier as Carrier;
  const { simulateFailure, useFallback } = req.body || {};

  try {
    const result = await executeWithBreakerProbeService({ carrier, simulateFailure, useFallback });
    const response = {
      success: result?.success,
      message: result?.message,
      data: result?.data,
      error: result?.error
    };
    return res.status(result?.status as number).json(response);
  } catch (err: any) {
    if (err?.status === 503 && err?.retryAfterMs) {
      const retrySeconds = Math.ceil(err.retryAfterMs / 1000);
      if (retrySeconds > 0) {
        res.setHeader('Retry-After', retrySeconds);
      }
      return res.status(503).json({
        success: false,
        message: err.message,
        data: err.data,
        error: err.error
      });
    }
    throw err;
  }
});

// Track shipment under circuit breaker protection
export const trackShipmentController = asyncHandler(async (req: Request, res: Response) => {
  const { carrier, trackingNumber, merchantId } = req.body;

  try {
    const result = await trackShipmentService({ carrier, trackingNumber, merchantId });
    const response = {
      success: result?.success,
      message: result?.message,
      data: result?.data,
      error: result?.error
    };
    return res.status(result?.status as number).json(response);
  } catch (err: any) {
    if (err?.status === 503 && err?.retryAfterMs) {
      const retrySeconds = Math.ceil(err.retryAfterMs / 1000);
      if (retrySeconds > 0) {
        res.setHeader('Retry-After', retrySeconds);
      }
      return res.status(503).json({
        success: false,
        message: err.message,
        data: err.data,
        error: err.error
      });
    }
    throw err;
  }
});

// Get overall health summary of all carriers
export const getAllCarriersHealthController = asyncHandler(async (_req: Request, res: Response) => {
  const result = await getAllCarriersHealthService();
  const response = {
    success: result?.success,
    message: result?.message,
    data: result?.data,
    error: result?.error
  };
  return res.status(result?.status as number).json(response);
});

// Reset carrier circuit breaker
export const resetCarrierBreakerController = asyncHandler(async (req: Request, res: Response) => {
  const carrier = req.params.carrier as Carrier;
  const result = await resetCarrierBreakerService(carrier);
  const response = {
    success: result?.success,
    message: result?.message,
    data: result?.data,
    error: result?.error
  };
  return res.status(result?.status as number).json(response);
});

// Force trip carrier circuit breaker
export const forceTripBreakerController = asyncHandler(async (req: Request, res: Response) => {
  const carrier = req.params.carrier as Carrier;
  const durationMs = req.body?.durationMs;
  const reason = req.body?.reason || 'MANUAL_OVERRIDE';
  const result = await forceTripBreakerService(carrier, durationMs, reason);
  const response = {
    success: result?.success,
    message: result?.message,
    data: result?.data,
    error: result?.error
  };
  return res.status(result?.status as number).json(response);
});

// Aliases matching auth.controller style naming
export const checkAvailability = checkAvailabilityController;
export const acquireExecutionPermission = acquireExecutionPermissionController;
export const recordSuccess = recordSuccessController;
export const recordFailure = recordFailureController;
export const executeWithBreaker = executeWithBreakerController;
export const trackShipment = trackShipmentController;
export const getAllCarriersHealth = getAllCarriersHealthController;
export const resetCarrierBreaker = resetCarrierBreakerController;
export const forceTripBreaker = forceTripBreakerController;