//------ Carries and Status Types ------
export const CARRIERS = ['POSTEX', 'TRAX', "LEOPARDS", "TCS"] as const
export type Carrier = (typeof CARRIERS)[number]
// Status messages
export type Status = | 'BOOKED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'NDR_ACTIVE'
  | 'RESOLVED_RESCHEDULED'
  | 'RTO_INITIATED'
  | 'RTO_DELIVERED'
  | 'DELIVERED'
  | 'CANCELLED';

// source of the event
export type EventSource =
  | 'CARRIER_POLL'
  | 'CARRIER_WEBHOOK'
  | 'FILE_IMPORT'
  | 'CUSTOMER'
  | 'MERCHANT';
// disposition status
export type Disposition =
  | 'APPLIED'
  | 'NOOP'
  | 'STALE_REJECTED'
  | 'STALE_OUT_OF_ORDER'
  | 'UNKNOWN_SHIPMENT'
  | 'DUPLICATE';


// ------- Outbox Types -------
export type OutboxChannel = 'META_WHATSAPP' | 'CARRIER_API' | 'EMAIL';
//type of message being sent
export type OutboxMessageType = | 'NDR_UTILITY_TEMPLATE'
  | 'RTO_NOTICE'
  | 'DELIVERY_CORRECTION'
  | 'RESCHEDULE_CONFIRMATION'
  | 'REATTEMPT_DISPATCH';
// status of outbox message
export type OutboxStatus = | 'PENDING'
  | 'PROCESSING'
  | 'DISPATCHED'
  | 'DISCARDED_STALE'
  | 'FAILED';
// ------- Conversations --------

export type ConversationState = | 'AWAITING_CHOICE'
  | 'AWAITING_DATE'
  | 'AWAITING_LOCATION'
  | 'CONFIRMING'
  | 'DONE'
  | 'EXPIRED';

// -------- Dispute Types---------
export type DisputeStatus = | 'NONE'
  | 'PENDING'
  | 'SUBMITTED'
  | 'RETRACTED'
  | 'SETTLED';

// ---- Health tracking types ------
export type TrackingHealth = 'HEALTHY' | "DEGRADED"

// -------- CIRCUIT BREAKER TYPES ------
export const BREAKER_STATES = ["CLOSED", "OPEN", "HALF_OPEN"] as const
export type breakerState = (typeof BREAKER_STATES)[number]

// ------- Coordinates interface ---------
export interface Coordinates {
  lat: number,
  lng: number
}

// -------- State machine types and interfaces -------
export type Intent = | { kind: 'CARRIER_STATUS'; status: Status }
  // Carrier scan with no state meaning (or an unmapped raw status): ledgered as NOOP
  | { kind: 'INFORMATIONAL' }
  | { kind: 'CUSTOMER_RESCHEDULE'; date: Date; coordinates?: Coordinates }
  | { kind: 'CUSTOMER_CORRECTION' }
  | { kind: 'MERCHANT_CANCEL' };

export type Effect = | 'INCREMENT_NDR_ATTEMPT'
  | 'ENQUEUE_NDR_TEMPLATE'
  | 'ENQUEUE_RTO_NOTICE'
  | 'ENQUEUE_DELIVERY_CORRECTION'
  | 'PURGE_PENDING_OUTBOX'
  | 'MARK_NEEDS_MANIFEST'
  | 'CLEAR_NEEDS_MANIFEST'
  | 'RETRACT_DISPUTE'
  // Customer-confirmed reschedule: enqueue the confirmation template (B3-BUG-02)
  | 'ENQUEUE_RESCHEDULE_CONFIRMATION';

// Conversation states that still accept customer input
export const ACTIVE_CONVERSATION_STATES: ConversationState[] = [
  'AWAITING_CHOICE',
  'AWAITING_DATE',
  'AWAITING_LOCATION',
  'CONFIRMING',
];
export interface Decision {
  next: Status,
  effects: Effect[],
  disposition: 'APPLIED' | "NOOP" | "STALE_REJECTED"
}

//--------Carrier adapter tpyes and interfaces
export interface CarrierUpdate {
  trackingNumber: string,
  rawStatus: string,
  rawRemarks: string,
  occurredAt: Date,
  carrierEventId?: string,
  payload: Record<string, unknown>
}

export interface MerchantCarrierCredentials {
  merchantId: string,
  carrier: Carrier,
  apiKey: string,
  apiSecret: string,
  extra: Record<string, unknown>
}
export interface CarrierAdapter {
  carrier: Carrier,
  fetchUpdates(
    creds: MerchantCarrierCredentials,
    trackingNumbers: string[],

  ): Promise<CarrierUpdate[]>;
  normalize(update: CarrierUpdate): Status | null;
  limits: { maxBatch: number, minIntervalMs: number }

}