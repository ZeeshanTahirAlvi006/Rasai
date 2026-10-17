import API from './api';
import type {
  Carrier,
  ApiResponse,
  CarrierHealthSummary,
  CarrierAvailability,
  TrackingData
} from '../types/carrierHealth';

export const carrierHealthApi = {
  //Fetch health summary and circuit status for all carriers
  async getSummary(): Promise<ApiResponse<CarrierHealthSummary[]>> {
    const res = await API.get<ApiResponse<CarrierHealthSummary[]>>('/carrier-health/summary');
    return res.data;
  },

  //Check availability and cooldown state for a specific carrier

  async checkAvailability(carrier: Carrier): Promise<ApiResponse<CarrierAvailability>> {
    const res = await API.get<ApiResponse<CarrierAvailability>>(`/carrier-health/${carrier}/availability`);
    return res.data;
  },

  //Query execution permission (canary lease probe)
  async checkPermission(carrier: Carrier): Promise<ApiResponse<any>> {
    const res = await API.post<ApiResponse<any>>(`/carrier-health/${carrier}/permission`);
    return res.data;
  },

  //Track a shipment via carrier adapter under circuit breaker protection
  async trackShipment(carrier: Carrier, trackingNumber: string): Promise<ApiResponse<TrackingData>> {
    const res = await API.post<ApiResponse<TrackingData>>('/carrier-health/track', {
      carrier,
      trackingNumber,
    });
    return res.data;
  },

  //Execute an operation under circuit breaker with simulated failure / fallback
  async executeWithBreaker(
    carrier: Carrier,
    options?: { simulateFailure?: boolean; useFallback?: boolean }
  ): Promise<ApiResponse<any>> {
    const res = await API.post<ApiResponse<any>>(`/carrier-health/${carrier}/execute`, options || {});
    return res.data;
  },

  //Record a success telemetry probe
  async recordSuccess(carrier: Carrier): Promise<ApiResponse<any>> {
    const res = await API.post<ApiResponse<any>>(`/carrier-health/${carrier}/success`);
    return res.data;
  },

  //Record a failure telemetry probe
  async recordFailure(
    carrier: Carrier,
    data?: { threshold?: number; baseBackOffMs?: number; errorCode?: string }
  ): Promise<ApiResponse<any>> {
    const res = await API.post<ApiResponse<any>>(`/carrier-health/${carrier}/failure`, data || {});
    return res.data;
  },

  //Administratively reset a tripped circuit breaker back to CLOSED
  async resetBreaker(carrier: Carrier): Promise<ApiResponse<any>> {
    const res = await API.post<ApiResponse<any>>(`/carrier-health/${carrier}/reset`);
    return res.data;
  },

  //Administratively quarantine a carrier by tripping circuit breaker to OPEN
  async tripBreaker(carrier: Carrier, durationMs?: number, reason?: string): Promise<ApiResponse<any>> {
    const res = await API.post<ApiResponse<any>>(`/carrier-health/${carrier}/trip`, {
      durationMs,
      reason,
    });
    return res.data;
  },
};

export default carrierHealthApi;
