// src/types/carrierHealth.ts
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

export interface PollerTierStats {
  totalDue: number;
  statuses: string[];
  baseIntervalMinutes: number;
}

export interface SweepTelemetry {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  carriersAttempted: Carrier[];
  parcelsPolledCount: number;
  updatesIngestedCount: number;
  skippedCircuitOpen: Carrier[];
  errors: Array<{ carrier: Carrier; message: string }>;
}

export interface PollerStatusData {
  tierStats: Record<string, PollerTierStats>;
  degradedShipmentsCount: number;
  lastSweep: SweepTelemetry | null;
}

export interface MerchantCarrierCredentialData {
  carrier: Carrier;
  isConfigured: boolean;
  source: 'DATABASE' | 'ENV' | 'NONE';
  apiKeyMasked: string;
  accountNumber: string;
  webhookEnabled: boolean;
  simulationMode: boolean;
  isActive: boolean;
  updatedAt?: string;
}

export interface UpsertCarrierCredentialPayload {
  carrier: Carrier;
  apiKey?: string;
  apiSecret?: string;
  accountNumber?: string;
  webhookEnabled?: boolean;
  webhookSecret?: string;
  simulationMode?: boolean;
  isActive?: boolean;
}

export interface CarrierWebhookSimulationPayload {
  carrier: Carrier;
  trackingNumber: string;
  rawStatus: string;
  rawRemarks?: string;
  merchantId?: string;
  occurredAt?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  error: string | null;
}
