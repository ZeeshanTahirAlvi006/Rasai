// Canonical event identity, timestamp, and status normalization.
// Every ingestion path (API, CSV import, poller, webhook) MUST use these so the
// same carrier event always produces the same eventKey / eventHash.
import crypto from 'crypto';
import type { Types } from 'mongoose';
import type { Status } from '../types/index.js';

export interface ComputeEventKeyInput {
  merchantId: string | Types.ObjectId;
  carrier: string;
  trackingNumber: string;
  rawStatus?: string;
  rawRemarks?: string;
  occurredAt: Date | string | number | null | undefined;
  carrierEventId?: string; // carrier's event id, Meta wamid, or a synthetic id
}

const collapse = (value?: string): string => (value ? value.trim().replace(/\s+/g, ' ') : '');

// All four carriers operate in Asia/Karachi (UTC+5, no DST).
const PKT_OFFSET = '+05:00';
const NAIVE_DATETIME = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Parses carrier timestamps. Timezone-naive values are interpreted as PKT, not UTC.
// Returns null when the value is missing or unparseable.
export function parseCarrierTimestamp(input: Date | string | number | null | undefined): Date | null {
  if (input === undefined || input === null) return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  if (typeof input === 'number') {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const trimmed = String(input).trim();
  if (!trimmed) return null;

  let iso = trimmed;
  const naive = NAIVE_DATETIME.exec(trimmed);
  if (naive) iso = `${naive[1]}T${naive[2]}${PKT_OFFSET}`;
  else if (DATE_ONLY.test(trimmed)) iso = `${trimmed}T00:00:00${PKT_OFFSET}`;

  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function computeEventKey(input: ComputeEventKeyInput): string {
  const merchantId = String(input.merchantId ?? '').trim();
  const carrier = collapse(input.carrier).toUpperCase();
  const trackingNumber = collapse(input.trackingNumber).toUpperCase();
  if (!merchantId || !carrier || !trackingNumber) {
    throw new Error('merchantId, carrier and trackingNumber are required');
  }

  const carrierEventId = collapse(input.carrierEventId);
  if (carrierEventId) {
    const idPreImage = JSON.stringify(['v1', 'CARRIER_EVENT_ID', merchantId, carrier, trackingNumber, carrierEventId]);
    return crypto.createHash('sha256').update(idPreImage, 'utf8').digest('hex');
  }

  let occurredAt = 'NO_TIMESTAMP';
  const hasTimestamp =
    input.occurredAt !== undefined && input.occurredAt !== null && String(input.occurredAt).trim() !== '';
  if (hasTimestamp) {
    const parsed = parseCarrierTimestamp(input.occurredAt);
    if (!parsed) throw new Error('invalid occurredAt date');
    occurredAt = parsed.toISOString();
  }

  // JSON.stringify of an array avoids delimiter collisions in remarks
  const tuplePreImage = JSON.stringify([
    'v1',
    'CANONICAL_TUPLE',
    merchantId,
    carrier,
    trackingNumber,
    collapse(input.rawStatus || 'UNKNOWN').toUpperCase(),
    collapse(input.rawRemarks).toLowerCase(),
    occurredAt,
  ]);
  return crypto.createHash('sha256').update(tuplePreImage, 'utf8').digest('hex');
}

// 16-byte binary hash stored in shipment_events.eventHash (indexed).
export function eventKeyToHash(eventKey: string): Buffer {
  const trimmed = typeof eventKey === 'string' ? eventKey.trim() : '';
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return Buffer.from(trimmed, 'hex').subarray(0, 16);
  return crypto.createHash('sha256').update(String(eventKey || '')).digest().subarray(0, 16);
}

export function computeEventHashBinary(input: ComputeEventKeyInput): Buffer {
  return eventKeyToHash(computeEventKey(input));
}

const CANONICAL_STATUSES = new Set<Status>([
  'BOOKED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'NDR_ACTIVE', 'RESOLVED_RESCHEDULED',
  'RTO_INITIATED', 'RTO_DELIVERED', 'DELIVERED', 'CANCELLED',
]);

// Maps raw carrier vocabulary (PostEx/Trax/Leopards/TCS exports) to a canonical Status.
// Returns null for informational / unmapped scans: they are ledgered as NOOP, never applied.
export function normalizeCarrierStatus(rawStatus: string | undefined | null): Status | null {
  const s = collapse(rawStatus ?? '').toUpperCase().replace(/[\s\-/]+/g, '_');
  if (!s) return null;
  if (CANONICAL_STATUSES.has(s as Status)) return s as Status;

  if (s.includes('CANCEL')) return 'CANCELLED';

  if (s.includes('RETURN') || /(^|_)RTO($|_)/.test(s)) {
    if (s.includes('DELIVER') || /^RETURNED(_TO_(SHIPPER|ORIGIN|MERCHANT|VENDOR|SENDER))?$/.test(s)) {
      return 'RTO_DELIVERED';
    }
    return 'RTO_INITIATED';
  }

  if (
    /UNDELIVER|NOT_DELIVER|FAIL|ATTEMPT|REFUSE|UNAVAILABLE|NOT_AVAILABLE|NOT_RESPOND|NO_RESPONSE|INCOMPLETE_ADDRESS|WRONG_ADDRESS|ADDRESS_NOT_FOUND|(^|_)NDR($|_)/.test(s)
  ) {
    return 'NDR_ACTIVE';
  }

  if (/OUT_FOR_DELIVERY|(^|_)OFD($|_)|WITH_COURIER|WITH_RIDER|ON_ROUTE_FOR_DELIVERY/.test(s)) return 'OUT_FOR_DELIVERY';
  if (s.includes('DELIVERED')) return 'DELIVERED';
  if (/TRANSIT|ARRIVED|DEPARTED|DISPATCHED|SHIPPED|PICKED|HUB|IN_PROCESS|FORWARDED/.test(s)) return 'IN_TRANSIT';
  if (/BOOKED|ORDER_CREATED|PICKUP_REQUEST/.test(s)) return 'BOOKED';

  return null;
}
