//a genuine retry of the same event must produce the same key.
import crypto from 'crypto';
import type { Carrier } from '../types/index.js';

export function computeEventKey(e: {
  merchantId: string;
  carrier: Carrier;
  trackingNumber: string;
  rawStatus: string;
  rawRemarks?: string;
  occurredAt: Date;
  carrierEventId?: string; // carrier's event id, Meta wamid, or a synthetic id
}): string {
  // JSON.stringify of an array avoids delimiter collisions in remarks
  const canonical = e.carrierEventId
    ? JSON.stringify(['id', e.merchantId, e.carrier, e.carrierEventId])
    : JSON.stringify([
      'fp',
      e.merchantId,
      e.carrier,
      e.trackingNumber,
      e.rawStatus.trim().toLowerCase(),
      (e.rawRemarks ?? '').trim().toLowerCase(),
      e.occurredAt.toISOString(),
    ]);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export function computeEventHashBinary(e: Parameters<typeof computeEventKey>[0]): Buffer {
  const hex = computeEventKey(e);
  return Buffer.from(hex, 'hex').subarray(0, 16);
}
