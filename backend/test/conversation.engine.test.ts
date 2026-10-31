// test/conversation.engine.test.ts
// Comprehensive integration test suite for Bolt 3 WhatsApp Conversation Engine.
import crypto from 'crypto';
import mongoose, { Types } from 'mongoose';
import { ConversationSession } from '../src/models/ConversationSession';
import { Shipment, type IShipment } from '../src/shipment/shipment.model';
import { OutboxMessage } from '../src/models/OutboxMessage';
import {
  verifyMetaSignature,
  getNextAvailablePktDates,
} from '../src/conversation/conversation.utils';
import {
  processInboundCustomerTurn,
  serializeForPhone,
} from '../src/conversation/conversation.service';
import { encryptPhone, hashPhone } from '../src/utils/phone';
import { metaClient } from '../src/outbox/metaClient';

describe('conversation.engine', () => {
  const merchantId = new Types.ObjectId();
  const rawPhone = '+923001234567';
  const encryptedPhone = encryptPhone(rawPhone);
  const customerPhoneHash = hashPhone(rawPhone);

  beforeEach(async () => {
    jest.restoreAllMocks();
    // Spy on metaClient to avoid live HTTP calls during unit tests
    jest.spyOn(metaClient, 'sendInteractiveSessionMessage').mockResolvedValue({
      messages: [{ id: `wamid_bot_${Date.now()}` }],
      simulated: true,
      wamid: `wamid_bot_${Date.now()}`,
    } as any);
  });

  const createTestShipment = async (overrides: Record<string, any> = {}): Promise<IShipment> => {
    return (await Shipment.create({
      merchantId,
      carrier: 'TRAX',
      trackingNumber: `TRK-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      status: 'NDR_ACTIVE',
      ndrAttempt: 1,
      orderValueCOD: 2500,
      customerPhone: encryptedPhone,
      customerPhoneHash,
      needsManifest: false,
      ndrTemplateDispatched: true,
      ...overrides,
    })) as any;
  };

  describe('Meta Webhook Signature Verification (B3-RC-06)', () => {
    const appSecret = 'secret_key_12345';
    const rawPayload = Buffer.from(JSON.stringify({ test: 'payload_data' }));

    it('returns true for a valid sha256 HMAC signature', () => {
      const hmac = crypto.createHmac('sha256', appSecret).update(rawPayload).digest('hex');
      const validHeader = `sha256=${hmac}`;

      const result = verifyMetaSignature(rawPayload, validHeader, appSecret);
      expect(result).toBe(true);
    });

    it('returns false for tampered payload', () => {
      const hmac = crypto.createHmac('sha256', appSecret).update(rawPayload).digest('hex');
      const validHeader = `sha256=${hmac}`;
      const tamperedPayload = Buffer.from(JSON.stringify({ test: 'tampered' }));

      const result = verifyMetaSignature(tamperedPayload, validHeader, appSecret);
      expect(result).toBe(false);
    });

    it('returns false if header is missing sha256= prefix or malformed', () => {
      expect(verifyMetaSignature(rawPayload, 'invalid_header', appSecret)).toBe(false);
      expect(verifyMetaSignature(rawPayload, undefined, appSecret)).toBe(false);
    });
  });

  describe('Delivery Date Helper (getNextAvailablePktDates)', () => {
    it('returns next 3 dates skipping Sundays', () => {
      // Friday 2026-10-23
      const baseDate = new Date('2026-10-23T10:00:00Z');
      const dates = getNextAvailablePktDates(baseDate, 3);

      expect(dates).toHaveLength(3);
      // None of the dates should fall on Sunday
      dates.forEach((d) => {
        expect(d.date.getUTCDay()).not.toBe(0);
        expect(d.id).toMatch(/^DATE_\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  describe('Leased Deduplication (B3-RC-01)', () => {
    it('processes inbound message on first try and deduplicates on second redelivery', async () => {
      const shipment = await createTestShipment();
      const wamid = `wamid_dedupe_${Date.now()}`;

      // First turn
      const firstResult = await processInboundCustomerTurn({
        wamid,
        from: rawPhone,
        timestamp: new Date(),
        type: 'BUTTON',
        rawAction: `ACTION_RESCHEDULE:${shipment._id}`,
        targetShipmentId: String(shipment._id),
        text: '1. Reschedule delivery',
      });

      expect(firstResult.processed).toBe(true);

      // Immediate re-delivery of identical wamid
      const duplicateResult = await processInboundCustomerTurn({
        wamid,
        from: rawPhone,
        timestamp: new Date(),
        type: 'BUTTON',
        rawAction: `ACTION_RESCHEDULE:${shipment._id}`,
        targetShipmentId: String(shipment._id),
        text: '1. Reschedule delivery',
      });

      expect(duplicateResult.processed).toBe(false);
      expect(duplicateResult.reason).toBe('DUPLICATE_OR_ACTIVE_LEASE');
    });
  });

  describe('Full Reschedule Conversation Flow', () => {
    it('executes full 4-turn state transition from AWAITING_CHOICE to DONE, marking needsManifest & enqueueing confirmation', async () => {
      const shipment = await createTestShipment();
      const shipmentIdStr = String(shipment._id);

      // --- Turn 1: Customer taps "1. Reschedule delivery" (ACTION_RESCHEDULE) ---
      const turn1 = await processInboundCustomerTurn({
        wamid: `wamid_turn1_${Date.now()}`,
        from: rawPhone,
        timestamp: new Date(),
        type: 'BUTTON',
        rawAction: `ACTION_RESCHEDULE:${shipmentIdStr}`,
        targetShipmentId: shipmentIdStr,
        text: '1. Reschedule delivery',
      });

      expect(turn1.processed).toBe(true);
      expect(turn1.nextState).toBe('AWAITING_DATE');

      let session = await ConversationSession.findById(turn1.sessionId);
      expect(session).toBeDefined();
      expect(session?.state).toBe('AWAITING_DATE');
      expect(session?.draft.pendingAction).toBe('RESCHEDULE');
      expect(session?.messages.length).toBeGreaterThanOrEqual(1);

      // --- Turn 2: Customer selects a delivery date from interactive list ---
      const turn2 = await processInboundCustomerTurn({
        wamid: `wamid_turn2_${Date.now()}`,
        from: rawPhone,
        timestamp: new Date(),
        type: 'LIST',
        rawAction: `DATE_2026-10-25:${shipmentIdStr}`,
        targetShipmentId: shipmentIdStr,
        text: 'Sun, Oct 25',
      });

      expect(turn2.processed).toBe(true);
      expect(turn2.nextState).toBe('AWAITING_LOCATION');

      session = await ConversationSession.findById(turn1.sessionId);
      expect(session?.state).toBe('AWAITING_LOCATION');
      expect(session?.draft.date).toBeDefined();

      // --- Turn 3: Customer shares WhatsApp Location GPS Pin ---
      const turn3 = await processInboundCustomerTurn({
        wamid: `wamid_turn3_${Date.now()}`,
        from: rawPhone,
        timestamp: new Date(),
        type: 'LOCATION',
        coordinates: { lat: 24.8607, lng: 67.0011 },
        targetShipmentId: shipmentIdStr,
        text: 'Shared WhatsApp GPS Pin',
      });

      expect(turn3.processed).toBe(true);
      expect(turn3.nextState).toBe('CONFIRMING');

      session = await ConversationSession.findById(turn1.sessionId);
      expect(session?.state).toBe('CONFIRMING');
      expect(session?.draft.coordinates?.lat).toBe(24.8607);
      expect(session?.draft.coordinates?.lng).toBe(67.0011);

      // --- Turn 4: Customer taps "Confirm Delivery" (CONFIRM_RESCHEDULE) ---
      const turn4 = await processInboundCustomerTurn({
        wamid: `wamid_turn4_${Date.now()}`,
        from: rawPhone,
        timestamp: new Date(),
        type: 'BUTTON',
        rawAction: `CONFIRM_RESCHEDULE:${shipmentIdStr}`,
        targetShipmentId: shipmentIdStr,
        text: 'Confirm Delivery',
      });

      expect(turn4.processed).toBe(true);
      expect(turn4.nextState).toBe('DONE');

      // Verify Session Completed
      session = await ConversationSession.findById(turn1.sessionId);
      expect(session?.state).toBe('DONE');

      // Verify Shipment updated with needsManifest: true and rescheduledDate (B3-BUG-02)
      const updatedShipment = await Shipment.findById(shipment._id);
      expect(updatedShipment?.needsManifest).toBe(true);
      expect(updatedShipment?.rescheduledDate).toBeDefined();
      expect(updatedShipment?.customerCoordinates?.lat).toBe(24.8607);
      expect(updatedShipment?.customerCoordinates?.lng).toBe(67.0011);

      // Verify RESCHEDULE_CONFIRMATION OutboxMessage was enqueued by applyEvent (B3-BUG-02)
      const outboxMsg = await OutboxMessage.findOne({
        shipmentId: shipment._id,
        messageType: 'RESCHEDULE_CONFIRMATION',
      });
      expect(outboxMsg).toBeDefined();
      expect(outboxMsg?.status).toBe('PENDING');
    });
  });

  describe('Wrong Details Retraction Flow (B3-RC-02)', () => {
    it('logs CUSTOMER_CORRECTION event, sets disputeRetractionRequested, and proceeds to AWAITING_DATE', async () => {
      const shipment = await createTestShipment();
      const shipmentIdStr = String(shipment._id);

      const turn = await processInboundCustomerTurn({
        wamid: `wamid_corr_${Date.now()}`,
        from: rawPhone,
        timestamp: new Date(),
        type: 'BUTTON',
        rawAction: `ACTION_CORRECTION:${shipmentIdStr}`,
        targetShipmentId: shipmentIdStr,
        text: '2. Wrong delivery details',
      });

      expect(turn.processed).toBe(true);
      expect(turn.nextState).toBe('AWAITING_DATE');

      const updatedShipment = await Shipment.findById(shipment._id);
      expect(updatedShipment?.disputeRetractionRequested).toBe(true);

      const session = await ConversationSession.findById(turn.sessionId);
      expect(session?.draft.correctionRecorded).toBe(true);
    });
  });

  describe('Cancel Order Flow', () => {
    it('transitions to CONFIRMING on ACTION_CANCEL, and upon CONFIRM_CANCEL cancels shipment and clears manifest flag', async () => {
      const shipment = await createTestShipment({ needsManifest: true });
      const shipmentIdStr = String(shipment._id);

      // Turn 1: Cancel requested
      const turn1 = await processInboundCustomerTurn({
        wamid: `wamid_cancel_req_${Date.now()}`,
        from: rawPhone,
        timestamp: new Date(),
        type: 'BUTTON',
        rawAction: `ACTION_CANCEL:${shipmentIdStr}`,
        targetShipmentId: shipmentIdStr,
        text: '3. Cancel order',
      });

      expect(turn1.processed).toBe(true);
      expect(turn1.nextState).toBe('CONFIRMING');

      // Turn 2: Cancel confirmed
      const turn2 = await processInboundCustomerTurn({
        wamid: `wamid_cancel_conf_${Date.now()}`,
        from: rawPhone,
        timestamp: new Date(),
        type: 'BUTTON',
        rawAction: `CONFIRM_CANCEL:${shipmentIdStr}`,
        targetShipmentId: shipmentIdStr,
        text: 'Confirm Cancel',
      });

      expect(turn2.processed).toBe(true);
      expect(turn2.nextState).toBe('DONE');

      const updatedShipment = await Shipment.findById(shipment._id);
      expect(updatedShipment?.status).toBe('CANCELLED');
      expect(updatedShipment?.needsManifest).toBe(false);
    });
  });

  describe('Per-Phone Serialization Lane (B3-RC-02)', () => {
    it('serializes operations for the same phone hash sequentially', async () => {
      const results: number[] = [];
      const testHash = 'test_hash_sequential';

      const op1 = serializeForPhone(testHash, async () => {
        await new Promise((r) => setTimeout(r, 50));
        results.push(1);
      });

      const op2 = serializeForPhone(testHash, async () => {
        results.push(2);
      });

      await Promise.all([op1, op2]);
      expect(results).toEqual([1, 2]);
    });
  });
});
