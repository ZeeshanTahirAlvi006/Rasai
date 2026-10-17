/// <reference types="jest" />
// test/engine.applyEvent.test.ts
import { describe, it, expect } from '@jest/globals';
import { Types } from 'mongoose';
import { applyEvent, applyEventDetailed } from '../src/engine/applyEvent.js';
import { Shipment } from '../src/shipment/shipment.model.js';
import { ShipmentEvent } from '../src/shipmentEvent/ShipmentEvent.model.js';
import { computeEventKey } from '../src/shipmentEvent/ShipmentEvent.utils.js';
import type { Carrier } from '../src/types/index.js';

describe('engine/applyEvent (Core State Transition Engine)', () => {
  const merchantId = new Types.ObjectId();
  const carrier: Carrier = 'TRAX';
  const trackingNumber = 'TRAX-889900';

  async function createTestShipment(status: any = 'BOOKED') {
    return Shipment.create({
      merchantId,
      carrier,
      trackingNumber,
      customerPhone: 'v1:dummy:tag:ct',
      customerPhoneHash: 'hash-trax-123',
      orderValueCOD: 3500,
      status,
      stateVersion: 0,
      ndrAttempt: 0,
      needsManifest: false,
    });
  }

  it('successfully transitions shipment status and returns APPLIED', async () => {
    await createTestShipment('BOOKED');
    const now = new Date();
    const eventKey = computeEventKey({
      merchantId: merchantId.toString(),
      carrier,
      trackingNumber,
      rawStatus: 'IN_TRANSIT',
      occurredAt: now,
    });

    const res = await applyEventDetailed({
      merchantId,
      carrier,
      trackingNumber,
      intent: { kind: 'CARRIER_STATUS', status: 'IN_TRANSIT' },
      event: {
        eventKey,
        merchantId,
        carrier,
        trackingNumber,
        source: 'CARRIER_POLL',
        rawStatus: 'IN_TRANSIT',
        occurredAt: now,
      },
    });

    expect(res.disposition).toBe('APPLIED');
    expect(res.isDuplicate).toBe(false);
    expect(res.nextStatus).toBe('IN_TRANSIT');

    const updated = await Shipment.findOne({ merchantId, carrier, trackingNumber });
    expect(updated?.status).toBe('IN_TRANSIT');
    expect(updated?.stateVersion).toBe(1);
  });

  it('returns DUPLICATE on replay with identical eventKey', async () => {
    await createTestShipment('BOOKED');
    const now = new Date();
    const eventKey = 'test-dup-key-1';

    const cmd = {
      merchantId,
      carrier,
      trackingNumber,
      intent: { kind: 'CARRIER_STATUS' as const, status: 'IN_TRANSIT' as const },
      event: {
        eventKey,
        merchantId,
        carrier,
        trackingNumber,
        source: 'CARRIER_POLL' as const,
        rawStatus: 'IN_TRANSIT',
        occurredAt: now,
      },
    };

    const first = await applyEvent(cmd);
    expect(first).toBe('APPLIED');

    const second = await applyEvent(cmd);
    expect(second).toBe('DUPLICATE');

    const detailed = await applyEventDetailed(cmd);
    expect(detailed.disposition).toBe('DUPLICATE');
    expect(detailed.isDuplicate).toBe(true);
  });

  it('rejects stale out-of-order events with STALE_OUT_OF_ORDER', async () => {
    await createTestShipment('OUT_FOR_DELIVERY');
    const t2 = new Date('2026-10-15T12:00:00Z');
    const t1 = new Date('2026-10-15T11:00:00Z');

    // Apply newer event t2
    await applyEvent({
      merchantId,
      carrier,
      trackingNumber,
      intent: { kind: 'CARRIER_STATUS', status: 'NDR_ACTIVE' },
      event: {
        eventKey: 'event-t2',
        merchantId,
        carrier,
        trackingNumber,
        source: 'CARRIER_POLL',
        rawStatus: 'NDR_ACTIVE',
        occurredAt: t2,
      },
    });

    // Older event t1 arrives late
    const lateRes = await applyEventDetailed({
      merchantId,
      carrier,
      trackingNumber,
      intent: { kind: 'CARRIER_STATUS', status: 'OUT_FOR_DELIVERY' },
      event: {
        eventKey: 'event-t1',
        merchantId,
        carrier,
        trackingNumber,
        source: 'CARRIER_POLL',
        rawStatus: 'OUT_FOR_DELIVERY',
        occurredAt: t1,
      },
    });

    expect(lateRes.disposition).toBe('STALE_OUT_OF_ORDER');
    expect(lateRes.nextStatus).toBe('NDR_ACTIVE');
  });

  it('returns UNKNOWN_SHIPMENT and records ledger entry when parcel not found', async () => {
    const unknownTracking = 'UNKNOWN-999';
    const now = new Date();
    const eventKey = 'unknown-event-key-1';

    const disp = await applyEvent({
      merchantId,
      carrier,
      trackingNumber: unknownTracking,
      intent: { kind: 'CARRIER_STATUS', status: 'IN_TRANSIT' },
      event: {
        eventKey,
        merchantId,
        carrier,
        trackingNumber: unknownTracking,
        source: 'CARRIER_POLL',
        rawStatus: 'IN_TRANSIT',
        occurredAt: now,
      },
    });

    expect(disp).toBe('UNKNOWN_SHIPMENT');
    const ledger = await ShipmentEvent.findOne({ eventKey });
    expect(ledger?.disposition).toBe('UNKNOWN_SHIPMENT');
  });

  it('handles customer reschedule and marks needsManifest', async () => {
    await createTestShipment('NDR_ACTIVE');
    const now = new Date();
    const rescheduleDate = new Date('2026-10-20T10:00:00Z');

    const res = await applyEventDetailed({
      merchantId,
      carrier,
      trackingNumber,
      intent: {
        kind: 'CUSTOMER_RESCHEDULE',
        date: rescheduleDate,
        coordinates: { lat: 33.6844, lng: 73.0479 },
      },
      event: {
        eventKey: 'reschedule-event-1',
        merchantId,
        carrier,
        trackingNumber,
        source: 'CUSTOMER',
        rawStatus: 'RESCHEDULED',
        occurredAt: now,
      },
    });

    expect(res.disposition).toBe('APPLIED');
    expect(res.nextStatus).toBe('RESOLVED_RESCHEDULED');

    const shipment = await Shipment.findOne({ merchantId, carrier, trackingNumber });
    expect(shipment?.status).toBe('RESOLVED_RESCHEDULED');
    expect(shipment?.needsManifest).toBe(true);
    expect(shipment?.customerCoordinates?.lat).toBe(33.6844);
    expect(shipment?.customerCoordinates?.lng).toBe(73.0479);
  });

  it('rejects events older than 90 days with STALE_REJECTED (Retention Horizon)', async () => {
    await createTestShipment('BOOKED');
    const oldTimestamp = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000);

    const res = await applyEventDetailed({
      merchantId,
      carrier,
      trackingNumber,
      intent: { kind: 'CARRIER_STATUS', status: 'IN_TRANSIT' },
      event: {
        eventKey: 'old-event-95d',
        merchantId,
        carrier,
        trackingNumber,
        source: 'CARRIER_POLL',
        rawStatus: 'IN_TRANSIT',
        occurredAt: oldTimestamp,
      },
    });

    expect(res.disposition).toBe('STALE_REJECTED');
    expect(res.isDuplicate).toBe(false);
  });

  it('sets ndrTemplateDispatched to true on shipment when ENQUEUE_NDR_TEMPLATE is emitted', async () => {
    await createTestShipment('OUT_FOR_DELIVERY');
    const now = new Date();

    const res = await applyEventDetailed({
      merchantId,
      carrier,
      trackingNumber,
      intent: { kind: 'CARRIER_STATUS', status: 'NDR_ACTIVE' },
      event: {
        eventKey: 'ndr-template-flag-test-1',
        merchantId,
        carrier,
        trackingNumber,
        source: 'CARRIER_POLL',
        rawStatus: 'CUSTOMER_UNAVAILABLE',
        occurredAt: now,
      },
    });

    expect(res.disposition).toBe('APPLIED');
    expect(res.nextStatus).toBe('NDR_ACTIVE');

    const s = await Shipment.findOne({ merchantId, carrier, trackingNumber });
    expect(s?.ndrTemplateDispatched).toBe(true);
  });
});

