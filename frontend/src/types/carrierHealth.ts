export type Carrier = 'LEOPARDS' | 'POSTEX' | 'TRAX' | 'TCS';
export type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CarrierAvailability {
  carrier: Carrier;
  isAvailable: boolean;
  state: BreakerState;
  remainingBackOffMs: number;
  backOffUntil?: string;
  reason?: string;
}

export interface CarrierHealthSummary {
  carrier: Carrier;
  state: BreakerState;
  failureCount: number;
  tripCount: number;
  lastFailureAt?: string;
  lastSuccessAt?: string;
  lastTrippedAt?: string;
  backOffUntil?: string;
  lastCanaryAt?: string;
  lastErrorCode?: string | null;
  isHealthy: boolean;
  remainingBackoffMs: number;
}

export interface TrackingPayload {
  source?: string;
  canonicalStatus?: string;
  activeStepText?: string;
  deliveredHeader?: string;
  signedBy?: string;
  carrier?: string;
  [key: string]: any;
}

export interface CarrierUpdate {
  trackingNumber: string;
  rawStatus: string;
  rawRemarks?: string;
  occuredAt: string;
  payload?: TrackingPayload;
  normalizedStatus?: string;
}

export interface TrackingData {
  carrier: Carrier;
  trackingNumber: string;
  trackingHealth: 'HEALTHY' | 'DEGRADED';
  updates: CarrierUpdate[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  error: string | null;
}
