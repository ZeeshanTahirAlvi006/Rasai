// src/healthCarrier/carrierHealth.controller.ts
// Express controller for carrier circuit breaker health, telemetry, tracking, manual overrides, poller controls, and webhooks.
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
  getCarrierAdapter,
  processCarrierWebhookService,
  simulateCarrierWebhookService,
  listCarrierCredentialsService,
  upsertCarrierCredentialService,
  deleteCarrierCredentialService,
} from './carrierHealth.service.js';
import {
  getPollerStatusService,
} from './carrierPoller.worker.js';
import {
  triggerCarrierPollerSweep,
} from './carrierPoller.queue.js';

// Re-export adapters & credentials resolvers for backwards compatibility
export { getCarrierConfig, getCarrierAdapter };

// Check availability
export const checkAvailabilityController = asyncHandler(async (req: Request, res: Response) => {
  const carrier = String(req.params.carrier).toUpperCase() as Carrier;
  const result = await checkAvailabilityService(carrier);
  return res.status(result.status).json(result);
});

// Acquire execution permission
export const acquireExecutionPermissionController = asyncHandler(async (req: Request, res: Response) => {
  const carrier = String(req.params.carrier).toUpperCase() as Carrier;
  const result = await acquireExecutionPermissionService(carrier);
  return res.status(result.status).json(result);
});

// Record success
export const recordSuccessController = asyncHandler(async (req: Request, res: Response) => {
  const carrier = String(req.params.carrier).toUpperCase() as Carrier;
  const result = await recordSuccessService(carrier);
  return res.status(result.status).json(result);
});

// Record failure
export const recordFailureController = asyncHandler(async (req: Request, res: Response) => {
  const carrier = String(req.params.carrier).toUpperCase() as Carrier;
  const { threshold, baseBackOffMs, errorCode } = { ...req.params, ...req.body };
  const result = await recordFailureService(carrier, undefined, {
    threshold: threshold ? Number(threshold) : undefined,
    baseBackOffMs: baseBackOffMs ? Number(baseBackOffMs) : undefined,
    errorCode: errorCode ? String(errorCode) : undefined,
  });
  return res.status(result.status).json(result);
});

// Execute under breaker probe
export const executeWithBreakerController = asyncHandler(async (req: Request, res: Response) => {
  const carrier = String(req.params.carrier).toUpperCase() as Carrier;
  const { simulateFailure, useFallback, simulate429, simulate403 } = req.body || {};

  try {
    const result = await executeWithBreakerProbeService({
      carrier,
      simulateFailure,
      useFallback,
      simulate429,
      simulate403,
    });
    return res.status(result.status).json(result);
  } catch (err: any) {
    if (err?.status === 503 && err?.retryAfterMs) {
      const retrySeconds = Math.ceil(err.retryAfterMs / 1000);
      if (retrySeconds > 0) {
        res.setHeader('Retry-After', retrySeconds);
      }
      return res.status(503).json({
        success: false,
        status: 503,
        message: err.message,
        data: err.data,
        error: err.error,
      });
    }
    throw err;
  }
});

// Track shipment under circuit breaker protection
export const trackShipmentController = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = String((req as any).user?.merchantId || req.body?.merchantId || '');
  const { carrier, trackingNumber } = req.body;

  try {
    const result = await trackShipmentService({ carrier, trackingNumber, merchantId });
    return res.status(result.status).json(result);
  } catch (err: any) {
    if (err?.status === 503 && err?.retryAfterMs) {
      const retrySeconds = Math.ceil(err.retryAfterMs / 1000);
      if (retrySeconds > 0) {
        res.setHeader('Retry-After', retrySeconds);
      }
      return res.status(503).json({
        success: false,
        status: 503,
        message: err.message,
        data: err.data,
        error: err.error,
      });
    }
    throw err;
  }
});

// Get overall health summary of all carriers
export const getAllCarriersHealthController = asyncHandler(async (_req: Request, res: Response) => {
  const result = await getAllCarriersHealthService();
  return res.status(result.status).json(result);
});

// Reset carrier circuit breaker
export const resetCarrierBreakerController = asyncHandler(async (req: Request, res: Response) => {
  const carrier = String(req.params.carrier).toUpperCase() as Carrier;
  const result = await resetCarrierBreakerService(carrier);
  return res.status(result.status).json(result);
});

// Force trip carrier circuit breaker
export const forceTripBreakerController = asyncHandler(async (req: Request, res: Response) => {
  const carrier = String(req.params.carrier).toUpperCase() as Carrier;
  const durationMs = req.body?.durationMs;
  const reason = req.body?.reason || 'MANUAL_OVERRIDE';
  const result = await forceTripBreakerService(carrier, durationMs, reason);
  return res.status(result.status).json(result);
});

// Get adaptive poller status
export const getPollerStatusController = asyncHandler(async (_req: Request, res: Response) => {
  const result = await getPollerStatusService();
  return res.status(result.status).json(result);
});

// Trigger adaptive poller sweep manually
export const triggerPollerSweepController = asyncHandler(async (req: Request, res: Response) => {
  const carrier = req.body?.carrier ? (String(req.body.carrier).toUpperCase() as Carrier) : undefined;
  const force = Boolean(req.body?.force);
  const merchantId = String((req as any).user?.merchantId || '');

  const result = await triggerCarrierPollerSweep({ carrier, force, merchantId });
  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Carrier polling sweep triggered successfully',
    data: result,
    error: null,
  });
});

// List carrier credentials
export const listCarrierCredentialsController = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = String((req as any).user?.merchantId || req.query?.merchantId || '');
  const result = await listCarrierCredentialsService(merchantId);
  return res.status(result.status).json(result);
});

// Upsert carrier credentials
export const upsertCarrierCredentialController = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = String((req as any).user?.merchantId || req.body?.merchantId || '');
  const result = await upsertCarrierCredentialService(merchantId, req.body);
  return res.status(result.status).json(result);
});

// Delete carrier credential
export const deleteCarrierCredentialController = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = String((req as any).user?.merchantId || req.query?.merchantId || '');
  const carrier = String(req.params.carrier).toUpperCase() as Carrier;
  const result = await deleteCarrierCredentialService(merchantId, carrier);
  return res.status(result.status).json(result);
});

// Simulate carrier webhook (Console QA)
export const simulateCarrierWebhookController = asyncHandler(async (req: Request, res: Response) => {
  const result = await simulateCarrierWebhookService(req.body);
  return res.status(result.status).json(result);
});

// Public signed webhook receiver
export const receiveCarrierWebhookController = asyncHandler(async (req: Request, res: Response) => {
  const carrier = String(req.params.carrier).toUpperCase() as Carrier;
  const rawBody = (req as any).rawBody;
  const result = await processCarrierWebhookService(carrier, req.body, rawBody, req.headers);
  return res.status(result.status).json(result);
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
