// src/api/carrierHealthApi.ts
// Typed API client for carrier health summaries, circuit breaker permissions, poller controls, credentials, and manual overrides.
import API from './api';
import { recordLog } from './telemetry';
import type {
  Carrier,
  ApiResponse,
  CarrierHealthSummary,
  CarrierAvailability,
  TrackingData,
  PollerStatusData,
  MerchantCarrierCredentialData,
  UpsertCarrierCredentialPayload,
  CarrierWebhookSimulationPayload,
} from '../types/carrierHealth';

async function loggedRequest<T>(
  method: string,
  endpoint: string,
  requestFn: () => Promise<{ status: number; data: ApiResponse<T> }>,
  payload?: any,
): Promise<ApiResponse<T>> {
  const start = performance.now();
  try {
    const res = await requestFn();
    recordLog({
      timestamp: new Date().toLocaleTimeString(),
      endpoint,
      method,
      status: res.status,
      durationMs: Math.round(performance.now() - start),
      payload,
      response: res.data,
      error: null,
    });
    return res.data;
  } catch (err: any) {
    recordLog({
      timestamp: new Date().toLocaleTimeString(),
      endpoint,
      method,
      status: err.response?.status || 500,
      durationMs: Math.round(performance.now() - start),
      payload,
      response: err.response?.data,
      error: err.response?.data?.message || err.message,
    });
    throw err;
  }
}

export const carrierHealthApi = {
  // Fetch health summary and circuit status for all carriers
  getSummary(): Promise<ApiResponse<CarrierHealthSummary[]>> {
    const endpoint = '/carrier-health/summary';
    return loggedRequest('GET', endpoint, () => API.get<ApiResponse<CarrierHealthSummary[]>>(endpoint));
  },

  // Check availability and cooldown state for a specific carrier
  checkAvailability(carrier: Carrier): Promise<ApiResponse<CarrierAvailability>> {
    const endpoint = `/carrier-health/${carrier}/availability`;
    return loggedRequest('GET', endpoint, () => API.get<ApiResponse<CarrierAvailability>>(endpoint));
  },

  // Query execution permission (canary lease probe)
  checkPermission(carrier: Carrier): Promise<ApiResponse<any>> {
    const endpoint = `/carrier-health/${carrier}/permission`;
    return loggedRequest('POST', endpoint, () => API.post<ApiResponse<any>>(endpoint));
  },

  // Track a shipment via carrier adapter under circuit breaker protection
  trackShipment(carrier: Carrier, trackingNumber: string): Promise<ApiResponse<TrackingData>> {
    const endpoint = '/carrier-health/track';
    const body = { carrier, trackingNumber };
    return loggedRequest('POST', endpoint, () => API.post<ApiResponse<TrackingData>>(endpoint, body), body);
  },

  // Execute an operation under circuit breaker with simulated failure / fallback
  executeWithBreaker(
    carrier: Carrier,
    options?: { simulateFailure?: boolean; useFallback?: boolean; simulate429?: boolean; simulate403?: boolean }
  ): Promise<ApiResponse<any>> {
    const endpoint = `/carrier-health/${carrier}/execute`;
    return loggedRequest('POST', endpoint, () => API.post<ApiResponse<any>>(endpoint, options || {}), options);
  },

  // Record a success telemetry probe
  recordSuccess(carrier: Carrier): Promise<ApiResponse<any>> {
    const endpoint = `/carrier-health/${carrier}/success`;
    return loggedRequest('POST', endpoint, () => API.post<ApiResponse<any>>(endpoint));
  },

  // Record a failure telemetry probe
  recordFailure(
    carrier: Carrier,
    data?: { threshold?: number; baseBackOffMs?: number; errorCode?: string }
  ): Promise<ApiResponse<any>> {
    const endpoint = `/carrier-health/${carrier}/failure`;
    return loggedRequest('POST', endpoint, () => API.post<ApiResponse<any>>(endpoint, data || {}), data);
  },

  // Administratively reset a tripped circuit breaker back to CLOSED
  resetBreaker(carrier: Carrier): Promise<ApiResponse<any>> {
    const endpoint = `/carrier-health/${carrier}/reset`;
    return loggedRequest('POST', endpoint, () => API.post<ApiResponse<any>>(endpoint));
  },

  // Administratively quarantine a carrier by tripping circuit breaker to OPEN
  tripBreaker(carrier: Carrier, durationMs?: number, reason?: string): Promise<ApiResponse<any>> {
    const endpoint = `/carrier-health/${carrier}/trip`;
    const body = { durationMs, reason };
    return loggedRequest('POST', endpoint, () => API.post<ApiResponse<any>>(endpoint, body), body);
  },

  // Get adaptive poller status across cadence tiers
  getPollerStatus(): Promise<ApiResponse<PollerStatusData>> {
    const endpoint = '/carrier-health/poll/status';
    return loggedRequest('GET', endpoint, () => API.get<ApiResponse<PollerStatusData>>(endpoint));
  },

  // Manually trigger an adaptive polling sweep
  triggerPollerSweep(payload?: { carrier?: Carrier; force?: boolean }): Promise<ApiResponse<any>> {
    const endpoint = '/carrier-health/poll/trigger';
    return loggedRequest('POST', endpoint, () => API.post<ApiResponse<any>>(endpoint, payload || {}), payload);
  },

  // List merchant configured carrier credentials & webhook flags
  listCarrierCredentials(): Promise<ApiResponse<MerchantCarrierCredentialData[]>> {
    const endpoint = '/carrier-health/credentials';
    return loggedRequest('GET', endpoint, () => API.get<ApiResponse<MerchantCarrierCredentialData[]>>(endpoint));
  },

  // Upsert merchant carrier credentials & webhook configuration
  upsertCarrierCredential(payload: UpsertCarrierCredentialPayload): Promise<ApiResponse<any>> {
    const endpoint = '/carrier-health/credentials';
    return loggedRequest('POST', endpoint, () => API.post<ApiResponse<any>>(endpoint, payload), payload);
  },

  // Delete merchant carrier credential override
  deleteCarrierCredential(carrier: Carrier): Promise<ApiResponse<any>> {
    const endpoint = `/carrier-health/credentials/${carrier}`;
    return loggedRequest('DELETE', endpoint, () => API.delete<ApiResponse<any>>(endpoint));
  },

  // Simulate a signed carrier webhook payload (Console QA)
  simulateCarrierWebhook(payload: CarrierWebhookSimulationPayload): Promise<ApiResponse<any>> {
    const endpoint = '/carrier-health/webhooks/simulate';
    return loggedRequest('POST', endpoint, () => API.post<ApiResponse<any>>(endpoint, payload), payload);
  },
};

export default carrierHealthApi;
