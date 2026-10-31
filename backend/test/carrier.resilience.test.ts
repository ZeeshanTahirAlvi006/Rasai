// test/carrier.resilience.test.ts
// Unit and integration test suite for Unit 6 Carrier Adapters, Adaptive Poller, and Circuit Breaker Resilience.
import { Types } from 'mongoose';
import crypto from 'crypto';
import {
  checkAvailabilityService,
  acquireExecutionPermissionService,
  recordSuccessService,
  recordFailureService,
  executeWithBreaker,
  resetCarrierBreakerService,
  forceTripBreakerService,
  ingestCarrierUpdatesForMerchant,
  processCarrierWebhookService,
  simulateCarrierWebhookService,
  getCarrierAdapter,
} from '../src/healthCarrier/carrierHealth.service.js';
import { carrierHealthModel } from '../src/healthCarrier/carrierHealth.model.js';
import {
  getCarrierConfig,
  upsertMerchantCarrierCredential,
  deleteMerchantCarrierCredential,
  listMerchantCarrierCredentials,
  encryptCredential,
  decryptCredential,
} from '../src/healthCarrier/carrierCredentials.service.js';
import {
  runAdaptivePollingSweep,
  getPollerStatusService,
  calculateCutoff,
} from '../src/healthCarrier/carrierPoller.worker.js';
import {
  isRetriableBreakerError,
  isImmediateTripError,
  extractRetryAfterMs,
  calculateBackOffWithJitter,
} from '../src/healthCarrier/carrierHealth.utils.js';
import { PostExAdapter, normalizePostExStatus } from '../src/healthCarrier/adapters/postex.adapter.js';
import { TraxAdapter, normalizeTraxStatus } from '../src/healthCarrier/adapters/trax.adapter.js';
import { TcsAdapter, normalizeTcsStatus } from '../src/healthCarrier/adapters/tcs.adapter.js';
import { LeopardsAdapter, normalizeLeopardsStatus } from '../src/healthCarrier/adapters/leopards.adapter.js';
import { Shipment, ShipmentEvent, OpsAlert } from '../src/models/index.js';
import { bulkCreateShipments } from '../src/shipment/shipment.service.js';

describe('Carrier Adapters, Poller & Circuit Breaker Resilience (Bolt 4)', () => {
  const merchantId = new Types.ObjectId();

  beforeEach(async () => {
    await carrierHealthModel.deleteMany({});
    await Shipment.deleteMany({});
    await ShipmentEvent.deleteMany({});
    await OpsAlert.deleteMany({});
  });

  describe('1. Circuit Breaker 429/403 Immediate Trip & Retry-After (B4-BUG-01, B4-BUG-02, B4-BUG-06)', () => {
    it('classifies HTTP 429 and 403 as retriable and immediate trip errors', () => {
      const err429: any = new Error('Too Many Requests');
      err429.status = 429;
      err429.response = { status: 429, headers: { 'retry-after': '120' } };

      const err403: any = new Error('Cloudflare Challenge');
      err403.status = 403;
      err403.response = { status: 403 };

      const err404: any = new Error('Not Found');
      err404.status = 404;
      err404.response = { status: 404 };

      expect(isRetriableBreakerError(err429)).toBe(true);
      expect(isRetriableBreakerError(err403)).toBe(true);
      expect(isRetriableBreakerError(err404)).toBe(false);

      expect(isImmediateTripError(err429)).toBe(true);
      expect(isImmediateTripError(err403)).toBe(true);
      expect(isImmediateTripError(err404)).toBe(false);

      expect(extractRetryAfterMs(err429)).toBe(120_000);
    });

    it('immediately trips breaker on HTTP 429, honors Retry-After, bulk-degrades shipments, and fires OpsAlert', async () => {
      // Seed an active non-terminal shipment for POSTEX
      await bulkCreateShipments(merchantId, [
        {
          carrier: 'POSTEX',
          trackingNumber: 'POSTEX-ACTIVE-01',
          customerPhone: '03001234567',
          orderValueCOD: 2500,
        },
      ]);

      const activeBefore = await Shipment.findOne({ trackingNumber: 'POSTEX-ACTIVE-01' }).lean();
      expect(activeBefore?.trackingHealth).toBe('HEALTHY');

      // Execute an operation under breaker that fails with HTTP 429
      const err429: any = new Error('Rate limit exceeded');
      err429.status = 429;
      err429.response = { status: 429, headers: { 'retry-after': '90' } };

      await expect(
        executeWithBreaker('POSTEX', async () => {
          throw err429;
        })
      ).rejects.toThrow('Rate limit exceeded');

      // Verify circuit breaker state transitioned to OPEN immediately (first failure)
      const health = await carrierHealthModel.findOne({ carrier: 'POSTEX' }).lean();
      expect(health?.state).toBe('OPEN');
      expect(health?.tripCount).toBe(1);
      expect(health?.backOffUntil).toBeDefined();

      const backoffDuration = new Date(health!.backOffUntil!).getTime() - Date.now();
      expect(backoffDuration).toBeGreaterThanOrEqual(85_000); // 90s Retry-After honored

      // Verify active shipment bulk-degraded to DEGRADED (B4-RC-04)
      const activeAfter = await Shipment.findOne({ trackingNumber: 'POSTEX-ACTIVE-01' }).lean();
      expect(activeAfter?.trackingHealth).toBe('DEGRADED');

      // Verify OpsAlert emitted (B4-BUG-06)
      const alert = await OpsAlert.findOne({
        type: 'CARRIER_BREAKER_OPEN',
        dedupeScope: 'POSTEX',
      }).lean();
      expect(alert).not.toBeNull();
      expect(alert?.severity).toBe('CRITICAL');
    });

    it('immediately trips breaker on HTTP 403 (Cloudflare WAF)', async () => {
      const err403: any = new Error('Cloudflare 403 Security Challenge');
      err403.status = 403;
      err403.response = { status: 403 };

      await expect(
        executeWithBreaker('TRAX', async () => {
          throw err403;
        })
      ).rejects.toThrow('Cloudflare 403 Security Challenge');

      const health = await carrierHealthModel.findOne({ carrier: 'TRAX' }).lean();
      expect(health?.state).toBe('OPEN');
      expect(health?.tripCount).toBe(1);
    });

    it('does not inflate tripCount when subsequent 429 errors arrive while breaker is already OPEN (B4-RC-01)', async () => {
      const err429: any = new Error('HTTP 429 Too Many Requests');
      err429.status = 429;
      err429.response = { status: 429, headers: { 'retry-after': '60' } };

      await recordFailureService('POSTEX', err429, { forceImmediateTrip: true });
      const first = await carrierHealthModel.findOne({ carrier: 'POSTEX' }).lean();
      expect(first?.state).toBe('OPEN');
      expect(first?.tripCount).toBe(1);

      // Subsequent 429 errors arriving while circuit is already OPEN must NOT increment tripCount again
      await recordFailureService('POSTEX', err429, { forceImmediateTrip: true });
      await recordFailureService('POSTEX', err429, { forceImmediateTrip: true });
      const after = await carrierHealthModel.findOne({ carrier: 'POSTEX' }).lean();
      expect(after?.state).toBe('OPEN');
      expect(after?.tripCount).toBe(1);
    });

    it('classifies unknown non-network errors as non-retriable', () => {
      const genericError = new Error('Schema validation failed: missing field');
      expect(isRetriableBreakerError(genericError)).toBe(false);

      const typeError = new TypeError('Cannot read property of undefined');
      expect(isRetriableBreakerError(typeError)).toBe(false);

      const fetchError = new TypeError('fetch failed');
      (fetchError as any).cause = { code: 'ECONNREFUSED' };
      expect(isRetriableBreakerError(fetchError)).toBe(true);
    });
  });

  describe('2. Canary Lease, Recovery & TripCount Reset (RC-06, B4-BUG-03, B4-RC-04)', () => {
    it('restores HEALTHY and resets tripCount: 0 when a canary succeeds', async () => {
      // Seed a degraded shipment
      await bulkCreateShipments(merchantId, [
        {
          carrier: 'LEOPARDS',
          trackingNumber: 'LEO-DEGRADED-01',
          customerPhone: '03001234567',
          orderValueCOD: 1200,
        },
      ]);
      await Shipment.updateOne(
        { trackingNumber: 'LEO-DEGRADED-01' },
        { $set: { trackingHealth: 'DEGRADED' } }
      );

      // Setup an OPEN breaker with backOffUntil expired
      await carrierHealthModel.findOneAndUpdate(
        { carrier: 'LEOPARDS' },
        {
          $set: {
            state: 'OPEN',
            tripCount: 3,
            failureCount: 0,
            backOffUntil: new Date(Date.now() - 1000), // expired cooldown
          },
        },
        { upsert: true }
      );

      // Claim canary
      const canaryPermission = await acquireExecutionPermissionService('LEOPARDS');
      expect(canaryPermission.data.allowed).toBe(true);
      expect(canaryPermission.data.isCanary).toBe(true);
      expect(canaryPermission.data.state).toBe('HALF_OPEN');

      // Record canary success
      const successRes = await recordSuccessService('LEOPARDS', true);
      expect(successRes.data.state).toBe('CLOSED');
      expect(successRes.data.tripCount).toBe(0); // B4-BUG-03: tripCount reset on canary recovery
      expect(successRes.data.failureCount).toBe(0);

      // Verify degraded shipments restored to HEALTHY (B4-RC-04)
      const shipment = await Shipment.findOne({ trackingNumber: 'LEO-DEGRADED-01' }).lean();
      expect(shipment?.trackingHealth).toBe('HEALTHY');
    });

    it('rejects non-canary callers from transitioning HALF_OPEN to CLOSED (RC-06)', async () => {
      await carrierHealthModel.findOneAndUpdate(
        { carrier: 'TCS' },
        {
          $set: {
            state: 'HALF_OPEN',
            lastCanaryAt: new Date(),
          },
        },
        { upsert: true }
      );

      // Non-canary caller tries to record success
      await expect(recordSuccessService('TCS', false)).rejects.toThrow();

      // State remains HALF_OPEN
      const health = await carrierHealthModel.findOne({ carrier: 'TCS' }).lean();
      expect(health?.state).toBe('HALF_OPEN');
    });
  });

  describe('3. All 4 Carrier Adapters & Chronological Dedup (B4-RC-03, B4-BN-03, B4-BUG-04)', () => {
    it('normalizes statuses across PostEx, Trax, Leopards, and TCS', () => {
      expect(normalizePostExStatus('Order Booked')).toBe('BOOKED');
      expect(normalizePostExStatus('Out For Delivery')).toBe('OUT_FOR_DELIVERY');
      expect(normalizePostExStatus('Attempted - Customer Not Available')).toBe('NDR_ACTIVE');
      expect(normalizePostExStatus('Delivered to Consignee')).toBe('DELIVERED');
      expect(normalizePostExStatus('Return to Shipper Initiated')).toBe('RTO_INITIATED');

      expect(normalizeTraxStatus('Shipment Booked')).toBe('BOOKED');
      expect(normalizeTraxStatus('Rider Assigned - Out for Delivery')).toBe('OUT_FOR_DELIVERY');
      expect(normalizeTraxStatus('Undelivered - Consignee Unreachable')).toBe('NDR_ACTIVE');
      expect(normalizeTraxStatus('Shipment Delivered')).toBe('DELIVERED');

      expect(normalizeTcsStatus('Shipment Picked')).toBe('BOOKED');
      expect(normalizeTcsStatus('Out For Delivery')).toBe('OUT_FOR_DELIVERY');
      expect(normalizeTcsStatus('Bad Address / Closed')).toBe('NDR_ACTIVE');
      expect(normalizeTcsStatus('Shipment Delivered')).toBe('DELIVERED');

      expect(normalizeLeopardsStatus('Booked at Hub')).toBe('BOOKED');
      expect(normalizeLeopardsStatus('Assigned to Courier - Out for Delivery')).toBe('OUT_FOR_DELIVERY');
      expect(normalizeLeopardsStatus('Delivery Attempted - Consignee Not Available')).toBe('NDR_ACTIVE');
      expect(normalizeLeopardsStatus('Shipment Delivered')).toBe('DELIVERED');
    });

    it('ingests reverse-chronological milestones in chronological order (B4-RC-03) and dedups via eventHash (B4-BN-03)', async () => {
      // Seed a shipment for PostEx
      await bulkCreateShipments(merchantId, [
        {
          carrier: 'POSTEX',
          trackingNumber: 'POSTEX-DEDUP-01',
          customerPhone: '03001234567',
          orderValueCOD: 1800,
        },
      ]);

      // Simulate carrier returning newest milestone first
      const t1 = new Date('2026-10-20T10:00:00Z');
      const t2 = new Date('2026-10-20T14:00:00Z');
      const t3 = new Date('2026-10-20T16:00:00Z');

      const reverseUpdates = [
        {
          trackingNumber: 'POSTEX-DEDUP-01',
          rawStatus: 'Out For Delivery',
          rawRemarks: 'Courier en route',
          occurredAt: t3,
          carrierEventId: 'POSTEX-DEDUP-01:3:OFD',
          payload: {},
        },
        {
          trackingNumber: 'POSTEX-DEDUP-01',
          rawStatus: 'In Transit',
          rawRemarks: 'Departed Hub',
          occurredAt: t2,
          carrierEventId: 'POSTEX-DEDUP-01:2:IN_TRANSIT',
          payload: {},
        },
        {
          trackingNumber: 'POSTEX-DEDUP-01',
          rawStatus: 'Order Booked',
          rawRemarks: 'Booked',
          occurredAt: t1,
          carrierEventId: 'POSTEX-DEDUP-01:1:BOOKED',
          payload: {},
        },
      ];

      // Ingest batch
      const firstIngest = await ingestCarrierUpdatesForMerchant(
        merchantId,
        'POSTEX',
        reverseUpdates,
        'CARRIER_POLL'
      );

      expect(firstIngest.applied).toBe(3);
      expect(firstIngest.skipped).toBe(0);

      // Verify shipment reached OUT_FOR_DELIVERY (not stale rejected!)
      const s = await Shipment.findOne({ trackingNumber: 'POSTEX-DEDUP-01' }).lean();
      expect(s?.status).toBe('OUT_FOR_DELIVERY');

      // Ingest the EXACT same batch again: up-front eventHash filter skips all 3 (B4-BN-03)
      const secondIngest = await ingestCarrierUpdatesForMerchant(
        merchantId,
        'POSTEX',
        reverseUpdates,
        'CARRIER_POLL'
      );

      expect(secondIngest.applied).toBe(0);
      expect(secondIngest.skipped).toBe(3);
    });

    it('injects SIM429 and SIM403 in simulator mode for chaos testing', async () => {
      const adapter = getCarrierAdapter('POSTEX')!;
      const creds = await getCarrierConfig('POSTEX', merchantId.toString());

      await expect(
        adapter.fetchUpdates(creds, ['SIM429-TEST'])
      ).rejects.toThrow('HTTP 429 Too Many Requests');

      await expect(
        adapter.fetchUpdates(creds, ['SIM403-TEST'])
      ).rejects.toThrow('HTTP 403 Forbidden');
    });
  });

  describe('4. Adaptive Poller Sweep (Spec §5.3, B4-BN-02, B4-BN-05, B4-ML-04)', () => {
    it('selects due shipments across cadences, chunks by maxBatch, and advances lastPolledAt', async () => {
      // Seed shipments across tiers with lastPolledAt in the past
      await bulkCreateShipments(merchantId, [
        {
          carrier: 'POSTEX',
          trackingNumber: 'POLL-OFD-01',
          customerPhone: '03001234567',
          orderValueCOD: 1000,
        },
        {
          carrier: 'TRAX',
          trackingNumber: 'POLL-TRANSIT-01',
          customerPhone: '03001234567',
          orderValueCOD: 2000,
        },
      ]);

      // Move one to OUT_FOR_DELIVERY and set lastPolledAt = 0 (due)
      await Shipment.updateOne(
        { trackingNumber: 'POLL-OFD-01' },
        {
          $set: {
            status: 'OUT_FOR_DELIVERY',
            lastPolledAt: new Date(0),
          },
        }
      );
      await Shipment.updateOne(
        { trackingNumber: 'POLL-TRANSIT-01' },
        {
          $set: {
            status: 'IN_TRANSIT',
            lastPolledAt: new Date(0),
          },
        }
      );

      // Run sweep with force = true
      const telemetry = await runAdaptivePollingSweep({ force: true });

      expect(telemetry.parcelsPolledCount).toBeGreaterThanOrEqual(2);
      expect(telemetry.carriersAttempted).toContain('POSTEX');
      expect(telemetry.carriersAttempted).toContain('TRAX');

      // Verify lastPolledAt was stamped forward
      const s1 = await Shipment.findOne({ trackingNumber: 'POLL-OFD-01' }).lean();
      expect(new Date(s1!.lastPolledAt!).getTime()).toBeGreaterThan(Date.now() - 60_000);

      // Poller status service reflects current state
      const statusRes = await getPollerStatusService();
      expect(statusRes.status).toBe(200);
      expect(statusRes.data.tierStats.OFD).toBeDefined();
    });

    it('skips carriers whose circuit breaker is OPEN during adaptive sweep', async () => {
      await carrierHealthModel.findOneAndUpdate(
        { carrier: 'TCS' },
        {
          $set: {
            state: 'OPEN',
            backOffUntil: new Date(Date.now() + 600_000), // cooldown active
          },
        },
        { upsert: true }
      );

      const telemetry = await runAdaptivePollingSweep({ carrier: 'TCS' });
      expect(telemetry.skippedCircuitOpen).toContain('TCS');
      expect(telemetry.parcelsPolledCount).toBe(0);
    });
  });

  describe('5. Feature-Flagged Carrier Webhooks & Security (Spec §5.5, §6)', () => {
    const webhookSecret = 'test-secret-key-12345';

    beforeEach(async () => {
      // Configure credentials with webhookEnabled and webhookSecret
      await upsertMerchantCarrierCredential(merchantId.toString(), {
        carrier: 'TRAX',
        apiKey: 'test-trax-api-key',
        webhookEnabled: true,
        webhookSecret,
        simulationMode: true,
      });

      // Seed a shipment for webhook linking
      await bulkCreateShipments(merchantId, [
        {
          carrier: 'TRAX',
          trackingNumber: 'TRAX-WH-01',
          customerPhone: '03001234567',
          orderValueCOD: 3500,
        },
      ]);
    });

    it('rejects webhooks when feature flag webhookEnabled is false', async () => {
      // Set webhookEnabled: false
      await upsertMerchantCarrierCredential(merchantId.toString(), {
        carrier: 'TRAX',
        webhookEnabled: false,
      });

      const payload = {
        trackingNumber: 'TRAX-WH-01',
        status: 'DELIVERED',
        merchantId: merchantId.toString(),
      };

      await expect(
        processCarrierWebhookService('TRAX', payload, Buffer.from(JSON.stringify(payload)))
      ).rejects.toThrow('Webhooks are disabled for carrier TRAX');
    });

    it('rejects webhooks with invalid HMAC signatures', async () => {
      const payload = {
        trackingNumber: 'TRAX-WH-01',
        status: 'DELIVERED',
        merchantId: merchantId.toString(),
      };
      const rawBody = Buffer.from(JSON.stringify(payload));

      await expect(
        processCarrierWebhookService('TRAX', payload, rawBody, {
          'x-signature': 'invalid_signature_hash',
        })
      ).rejects.toThrow('Invalid webhook signature');
    });

    it('accepts and applies valid signed carrier webhook payloads', async () => {
      const payload = {
        trackingNumber: 'TRAX-WH-01',
        status: 'DELIVERED',
        remarks: 'Delivered to consignee via webhook',
        merchantId: merchantId.toString(),
      };
      const rawBody = Buffer.from(JSON.stringify(payload));
      const validSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      const result = await processCarrierWebhookService('TRAX', payload, rawBody, {
        'x-signature': validSignature,
      });

      expect(result.status).toBe(200);
      expect(result.data.applied).toBe(1);

      // Verify shipment reached DELIVERED
      const s = await Shipment.findOne({ trackingNumber: 'TRAX-WH-01' }).lean();
      expect(s?.status).toBe('DELIVERED');
    });

    it('accepts valid signatures in uppercase hex', async () => {
      const payload = {
        trackingNumber: 'TRAX-WH-01',
        status: 'DELIVERED',
        remarks: 'Delivered uppercase sig',
        merchantId: merchantId.toString(),
      };
      const rawBody = Buffer.from(JSON.stringify(payload));
      const validSignatureUpper = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex').toUpperCase();

      const result = await processCarrierWebhookService('TRAX', payload, rawBody, {
        'x-signature': `sha256=${validSignatureUpper}`,
      });

      expect(result.status).toBe(200);
    });

    it('supports console webhook simulation QA tool', async () => {
      const simResult = await simulateCarrierWebhookService({
        carrier: 'TRAX',
        trackingNumber: 'TRAX-WH-01',
        rawStatus: 'Out For Delivery',
        rawRemarks: 'Simulated dispatch scan',
        merchantId: merchantId.toString(),
      });

      expect(simResult.status).toBe(200);
      expect(simResult.data.applied).toBe(1);
    });
  });

  describe('6. Credentials CRUD and AES-256-GCM Encryption', () => {
    it('encrypts and decrypts carrier secrets correctly with HKDF subkeys', () => {
      const rawSecret = 'trax_secret_password_abc_987';
      const encrypted = encryptCredential(rawSecret);

      expect(encrypted.startsWith('v1:')).toBe(true);
      expect(decryptCredential(encrypted)).toBe(rawSecret);
    });

    it('manages merchant carrier credentials lifecycle', async () => {
      const upserted = await upsertMerchantCarrierCredential(merchantId.toString(), {
        carrier: 'POSTEX',
        apiKey: 'test-api-token-xyz',
        accountNumber: 'ACC-9988',
        webhookEnabled: true,
      });

      expect(upserted?.carrier).toBe('POSTEX');
      expect(upserted?.accountNumber).toBe('ACC-9988');

      const list = await listMerchantCarrierCredentials(merchantId.toString());
      const postex = list.find((c) => c.carrier === 'POSTEX');
      expect(postex?.isConfigured).toBe(true);
      expect(postex?.apiKeyMasked).toBe('****-xyz');
      expect(postex?.webhookEnabled).toBe(true);

      // Delete credential
      await deleteMerchantCarrierCredential(merchantId.toString(), 'POSTEX');
      const listAfter = await listMerchantCarrierCredentials(merchantId.toString());
      const postexAfter = listAfter.find((c) => c.carrier === 'POSTEX');
      expect(postexAfter?.isConfigured).toBe(false);
    });
  });
});
