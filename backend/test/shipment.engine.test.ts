// test/shipment.engine.test.ts
import { Types } from 'mongoose';
import { applyEvent } from '../src/shipment/shipment.engine.js';
import { Shipment } from '../src/shipment/shipment.model.js';
import { ShipmentEvent } from '../src/shipmentEvent/ShipmentEvent.model.js';
import { OutboxMessage } from '../src/models/OutboxMessage.js';
import { computeEventKey } from '../src/utils/eventKey.js';
import type { Carrier } from '../src/types/index.js';

describe('shipment.engine (applyEvent)', () => {
  const merchantId = new Types.ObjectId();
  const carrier: Carrier = 'POSTEX';
  const trackingNumber = 'PK-998877';

  async function createInitialShipment(status: any = 'BOOKED') {
    return Shipment.create({
      merchantId,
      carrier,
      trackingNumber,
      customerPhone: 'v1:dummy:tag:ct',
      customerPhoneHash: 'hash123',
      orderValueCOD: 2500,
      status,
      stateVersion: 0,
      ndrAttempt: 0,
      needsManifest: false,
    });
  }

  it('ledgers an identical retry only once (fast path DUPLICATE)', async () => {
    await createInitialShipment();
    const now = new Date();
    const eventKey = computeEventKey({
      merchantId: merchantId.toString(),
      carrier,
      trackingNumber,
      rawStatus: 'IN_TRANSIT',
      occurredAt: now,
    });

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
        payload: {},
      },
    };

    const first = await applyEvent(cmd);
    expect(first).toBe('APPLIED');

    const second = await applyEvent(cmd);
    expect(second).toBe('DUPLICATE');

    const eventCount = await ShipmentEvent.countDocuments({ eventKey });
    expect(eventCount).toBe(1);
  });

  it('does not send a second NDR message for a repeated NDR status (same-status NOOP)', async () => {
    await createInitialShipment('OUT_FOR_DELIVERY');
    const t1 = new Date('2026-10-11T10:00:00Z');
    const t2 = new Date('2026-10-11T10:30:00Z');

    // First NDR event: transitions to NDR_ACTIVE and enqueues NDR_UTILITY_TEMPLATE
    const eventKey1 = computeEventKey({
      merchantId: merchantId.toString(),
      carrier,
      trackingNumber,
      rawStatus: 'NDR_ACTIVE',
      occurredAt: t1,
    });

    await applyEvent({
      merchantId,
      carrier,
      trackingNumber,
      intent: { kind: 'CARRIER_STATUS', status: 'NDR_ACTIVE' },
      event: {
        eventKey: eventKey1,
        merchantId,
        carrier,
        trackingNumber,
        source: 'CARRIER_POLL',
        rawStatus: 'NDR_ACTIVE',
        occurredAt: t1,
        payload: {},
      },
    });

    expect(await OutboxMessage.countDocuments({ messageType: 'NDR_UTILITY_TEMPLATE' })).toBe(1);

    // Second NDR event with newer timestamp: current is already NDR_ACTIVE -> NOOP
    const eventKey2 = computeEventKey({
      merchantId: merchantId.toString(),
      carrier,
      trackingNumber,
      rawStatus: 'NDR_ACTIVE',
      rawRemarks: 'second scan attempt',
      occurredAt: t2,
    });

    const secondDisp = await applyEvent({
      merchantId,
      carrier,
      trackingNumber,
      intent: { kind: 'CARRIER_STATUS', status: 'NDR_ACTIVE' },
      event: {
        eventKey: eventKey2,
        merchantId,
        carrier,
        trackingNumber,
        source: 'CARRIER_POLL',
        rawStatus: 'NDR_ACTIVE',
        rawRemarks: 'second scan attempt',
        occurredAt: t2,
        payload: {},
      },
    });

    expect(secondDisp).toBe('NOOP');
    // Still exactly 1 outbox message
    expect(await OutboxMessage.countDocuments({ messageType: 'NDR_UTILITY_TEMPLATE' })).toBe(1);
  });

  it('ignores a late carrier event that predates the projection (STALE_OUT_OF_ORDER)', async () => {
    await createInitialShipment('OUT_FOR_DELIVERY');
    const t2 = new Date('2026-10-11T12:00:00Z');
    const t1 = new Date('2026-10-11T11:00:00Z'); // older event arriving late

    // Apply t2 first
    await applyEvent({
      merchantId,
      carrier,
      trackingNumber,
      intent: { kind: 'CARRIER_STATUS', status: 'NDR_ACTIVE' },
      event: {
        eventKey: computeEventKey({
          merchantId: merchantId.toString(),
          carrier,
          trackingNumber,
          rawStatus: 'NDR_ACTIVE',
          occurredAt: t2,
        }),
        merchantId,
        carrier,
        trackingNumber,
        source: 'CARRIER_POLL',
        rawStatus: 'NDR_ACTIVE',
        occurredAt: t2,
        payload: {},
      },
    });

    // Late event with timestamp t1 < t2
    const lateDisp = await applyEvent({
      merchantId,
      carrier,
      trackingNumber,
      intent: { kind: 'CARRIER_STATUS', status: 'OUT_FOR_DELIVERY' },
      event: {
        eventKey: computeEventKey({
          merchantId: merchantId.toString(),
          carrier,
          trackingNumber,
          rawStatus: 'OUT_FOR_DELIVERY',
          occurredAt: t1,
        }),
        merchantId,
        carrier,
        trackingNumber,
        source: 'CARRIER_POLL',
        rawStatus: 'OUT_FOR_DELIVERY',
        occurredAt: t1,
        payload: {},
      },
    });

    expect(lateDisp).toBe('STALE_OUT_OF_ORDER');
    const current = await Shipment.findOne({ merchantId, carrier, trackingNumber });
    expect(current?.status).toBe('NDR_ACTIVE');
  });

  it('allows a second NDR after a reschedule and increments ndrAttempt', async () => {
    await createInitialShipment('OUT_FOR_DELIVERY');
    const t1 = new Date('2026-10-11T09:00:00Z');
    const t2 = new Date('2026-10-11T10:00:00Z');
    const t3 = new Date('2026-10-12T09:00:00Z');

    // 1. First NDR attempt
    await applyEvent({
      merchantId,
      carrier,
      trackingNumber,
      intent: { kind: 'CARRIER_STATUS', status: 'NDR_ACTIVE' },
      event: {
        eventKey: 'event-1',
        merchantId,
        carrier,
        trackingNumber,
        source: 'CARRIER_POLL',
        rawStatus: 'NDR_ACTIVE',
        occurredAt: t1,
        payload: {},
      },
    });

    let shipment = await Shipment.findOne({ merchantId, carrier, trackingNumber });
    expect(shipment?.status).toBe('NDR_ACTIVE');
    expect(shipment?.ndrAttempt).toBe(1);

    // 2. Customer reschedules
    await applyEvent({
      merchantId,
      carrier,
      trackingNumber,
      intent: {
        kind: 'CUSTOMER_RESCHEDULE',
        date: new Date('2026-10-12T00:00:00Z'),
      },
      event: {
        eventKey: 'event-2',
        merchantId,
        carrier,
        trackingNumber,
        source: 'CUSTOMER',
        rawStatus: 'RESCHEDULED',
        occurredAt: t2,
        payload: {},
      },
    });

    shipment = await Shipment.findOne({ merchantId, carrier, trackingNumber });
    expect(shipment?.status).toBe('RESOLVED_RESCHEDULED');
    expect(shipment?.needsManifest).toBe(true);

    // 3. Second NDR attempt after failed delivery on rescheduled date
    await applyEvent({
      merchantId,
      carrier,
      trackingNumber,
      intent: { kind: 'CARRIER_STATUS', status: 'NDR_ACTIVE' },
      event: {
        eventKey: 'event-3',
        merchantId,
        carrier,
        trackingNumber,
        source: 'CARRIER_POLL',
        rawStatus: 'NDR_ACTIVE',
        occurredAt: t3,
        payload: {},
      },
    });

    shipment = await Shipment.findOne({ merchantId, carrier, trackingNumber });
    expect(shipment?.status).toBe('NDR_ACTIVE');
    expect(shipment?.ndrAttempt).toBe(2);

    // Check two distinct outbox templates with unique dedupe keys
    const messages = await OutboxMessage.find({
      shipmentId: shipment?._id,
      messageType: 'NDR_UTILITY_TEMPLATE',
    });
    expect(messages.length).toBe(2);
  });

  it('queues a DELIVERY_CORRECTION message when delivered follows dispatched NDR template', async () => {
    const s = await createInitialShipment('NDR_ACTIVE');
    await Shipment.updateOne({ _id: s._id }, { $set: { ndrTemplateDispatched: true } });

    // Simulate pre-existing dispatched NDR template
    await OutboxMessage.create({
      merchantId: s.merchantId,
      shipmentId: s._id,
      dedupeKey: `${s._id}:NDR_UTILITY_TEMPLATE:1`,
      channel: 'META_WHATSAPP',
      messageType: 'NDR_UTILITY_TEMPLATE',
      payload: {},
      status: 'DISPATCHED',
      scheduledFor: new Date(),
      attempts: 1,
      priorityScore: 100,
    });

    const now = new Date();
    await applyEvent({
      merchantId,
      carrier,
      trackingNumber,
      intent: { kind: 'CARRIER_STATUS', status: 'DELIVERED' },
      event: {
        eventKey: 'event-delivered',
        merchantId,
        carrier,
        trackingNumber,
        source: 'CARRIER_POLL',
        rawStatus: 'DELIVERED',
        occurredAt: now,
        payload: {},
      },
    });

    const correction = await OutboxMessage.findOne({
      shipmentId: s._id,
      messageType: 'DELIVERY_CORRECTION',
    });
    expect(correction).not.toBeNull();
    expect(correction?.status).toBe('PENDING');
  });

  it('returns UNKNOWN_SHIPMENT when shipment does not exist and creates audit event', async () => {
    const randomTracking = 'UNKNOWN-12345';
    const now = new Date();
    const eventKey = 'unknown-event-key';

    const disp = await applyEvent({
      merchantId,
      carrier,
      trackingNumber: randomTracking,
      intent: { kind: 'CARRIER_STATUS', status: 'IN_TRANSIT' },
      event: {
        eventKey,
        merchantId,
        carrier,
        trackingNumber: randomTracking,
        source: 'CARRIER_POLL',
        rawStatus: 'IN_TRANSIT',
        occurredAt: now,
        payload: {},
      },
    });

    expect(disp).toBe('UNKNOWN_SHIPMENT');
    const event = await ShipmentEvent.findOne({ eventKey });
    expect(event?.disposition).toBe('UNKNOWN_SHIPMENT');
  });
});
