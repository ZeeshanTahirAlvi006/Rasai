// src/types/shipment.ts

export const CARRIERS = ['POSTEX', 'TRAX', 'LEOPARDS', 'TCS'] as const;
export type Carrier = (typeof CARRIERS)[number];

export const SHIPMENT_STATUSES = [
  'BOOKED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'NDR_ACTIVE',
  'RESOLVED_RESCHEDULED',
  'RTO_INITIATED',
  'RTO_DELIVERED',
  'DELIVERED',
  'CANCELLED',
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export type TrackingHealth = 'HEALTHY' | 'DEGRADED';
export type DisputeStatus = 'NONE' | 'PENDING' | 'SUBMITTED' | 'RETRACTED' | 'SETTLED';

export interface IShipmentCoordinates {
  lat: number;
  lng: number;
}

export interface IShipment {
  _id: string;
  merchantId: string;
  carrier: Carrier;
  trackingNumber: string;
  status: ShipmentStatus;
  stateVersion: number;
  ndrAttempt: number;
  orderValueCOD: number;
  customerPhoneMasked?: string;
  customerCoordinates?: IShipmentCoordinates;
  rescheduledDate?: string;
  destinationStationCode?: string;
  needsManifest: boolean;
  lastManifestedAt?: string;
  disputeStatus: DisputeStatus;
  disputeRetractionRequested: boolean;
  settlementCutoff?: string;
  callLogAttempts: number;
  trackingHealth: TrackingHealth;
  lastCarrierEventAt?: string;
  lastPolledAt?: string;
  updatedAt: string;
}

export interface IShipmentEvent {
  _id: string;
  merchantId: string;
  carrier: Carrier;
  trackingNumber: string;
  rawStatus: string;
  rawRemarks?: string;
  occurredAt: string;
  carrierEventId?: string;
  batchId?: string;
  shipmentId?: string;
  disposition?: 'APPLIED' | 'NOOP' | 'STALE_REJECTED' | 'STALE_OUT_OF_ORDER' | 'UNKNOWN_SHIPMENT' | 'DUPLICATE';
  source?: 'CARRIER_POLL' | 'CARRIER_WEBHOOK' | 'FILE_IMPORT' | 'CUSTOMER' | 'MERCHANT';
  effectsApplied?: string[];
  payload?: Record<string, unknown>;
  createdAt?: string;
}

export interface BulkCreateRowInput {
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

export interface BulkCreateResponse {
  created: number;
  duplicates: number;
  rejected: number;
  results: BulkCreateRowResult[];
}

export interface ListShipmentsFilter {
  cursor?: string;
  limit?: number;
  status?: ShipmentStatus | ShipmentStatus[] | string;
  carrier?: Carrier;
  trackingHealth?: TrackingHealth;
  needsManifest?: boolean;
  trackingNumber?: string;
}

export interface ListShipmentsResponse {
  shipments: IShipment[];
  nextCursor?: string;
}

export interface GetShipmentResponse {
  shipment: IShipment;
  timeline: IShipmentEvent[];
}

export interface UpdateShipmentInput {
  expectedVersion: number;
  customerPhone?: string;
  orderValueCOD?: number;
  destinationStationCode?: string;
}

export interface CancelShipmentResponse {
  disposition: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  error: string | null;
}

export interface ApiCallLogEntry {
  id: string;
  timestamp: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  endpoint: string;
  status: number;
  durationMs: number;
  requestBody?: unknown;
  responseBody?: unknown;
  isError: boolean;
}

// ─────────────────────────────────────────────────────────────
// Shipment Event Ledger & Telemetry Types
// ─────────────────────────────────────────────────────────────

export const EVENT_SOURCES = [
  'CARRIER_POLL',
  'CARRIER_WEBHOOK',
  'FILE_IMPORT',
  'CUSTOMER',
  'MERCHANT',
] as const;
export type EventSource = (typeof EVENT_SOURCES)[number];

export const EVENT_DISPOSITIONS = [
  'APPLIED',
  'NOOP',
  'STALE_REJECTED',
  'STALE_OUT_OF_ORDER',
  'UNKNOWN_SHIPMENT',
  'DUPLICATE',
] as const;
export type EventDisposition = (typeof EVENT_DISPOSITIONS)[number];

export interface RecordShipmentEventInput {
  carrier: Carrier;
  trackingNumber: string;
  source: EventSource;
  rawStatus?: string;
  rawRemarks?: string;
  occurredAt?: string;
  carrierEventId?: string;
  batchId?: string;
  intent?: {
    kind: string;
    [key: string]: unknown;
  };
  payload?: Record<string, unknown>;
  payLoad?: Record<string, unknown>;
}

export interface RecordShipmentEventResult {
  disposition: EventDisposition | string;
  isDuplicate?: boolean;
  eventKey?: string;
  shipmentId?: string;
  nextStatus?: ShipmentStatus;
  effectsApplied?: string[];
}

export interface BulkRecordEventsInput {
  events: RecordShipmentEventInput[];
  batchId?: string;
}

export interface BulkRecordEventsRowResult {
  index: number;
  trackingNumber: string;
  carrier: Carrier;
  eventKey?: string;
  disposition: EventDisposition | string;
  isDuplicate: boolean;
  reason?: string;
}

export interface BulkRecordEventsResult {
  processed: number;
  batchId?: string;
  results: BulkRecordEventsRowResult[];
}

export interface ListShipmentEventsFilter {
  cursor?: string;
  limit?: number;
  carrier?: Carrier;
  trackingNumber?: string;
  source?: EventSource | string;
  disposition?: EventDisposition | string;
  batchId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ListShipmentEventsResult {
  events: Array<
    IShipmentEvent & {
      id?: string;
      batchId?: string;
      shipmentId?: string;
    }
  >;
  nextCursor?: string;
  totalReturned: number;
}

export interface LedgerMetricsFilter {
  carrier?: Carrier;
  startDate?: string;
  endDate?: string;
}

export interface LedgerMetricsResult {
  totalEvents: number;
  byDisposition: Record<string, number>;
  bySource: Record<string, number>;
  period: {
    startDate?: string;
    endDate?: string;
  };
}

export interface ShipmentTimelineResult {
  carrier: Carrier;
  trackingNumber: string;
  shipmentId?: string;
  currentStatus?: ShipmentStatus;
  totalEvents: number;
  timeline: Array<
    IShipmentEvent & {
      id?: string;
      batchId?: string;
      shipmentId?: string;
    }
  >;
}
