import mongoose, { Types } from 'mongoose';
import { OutboxMessage } from '../src/models/OutboxMessage';
import { Shipment } from '../src/shipment/shipment.model';
import { MerchantWaTemplate } from '../src/models/MerchantWaTemplate';
import { OpsAlert } from '../src/models/OpsAlert';
import { processOutboxMessage } from '../src/outbox/outbox.worker';
import { sendGovernor } from '../src/outbox/sendGovernor';
import { metaClient, invalidateTemplateCache } from '../src/outbox/metaClient';
import { encryptPhone, hashPhone } from '../src/utils/phone';

describe('outbox.worker', () => {
  const merchantId = new Types.ObjectId();
  const rawPhone = '+923001234567';
  const encryptedPhone = encryptPhone(rawPhone);
  const customerPhoneHash = hashPhone(rawPhone);

  beforeEach(async () => {
    await sendGovernor.resetForTests();
    invalidateTemplateCache();
    jest.restoreAllMocks();
  });

  const createTestShipment = async (overrides: Record<string, any> = {}) => {
    return Shipment.create({
      merchantId,
      carrier: 'LEOPARDS',
      trackingNumber: `TRK-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      status: 'NDR_ACTIVE',
      ndrAttempt: 1,
      orderValueCOD: 1500,
      customerPhone: encryptedPhone,
      customerPhoneHash,
      needsManifest: false,
      ndrTemplateDispatched: false,
      ...overrides,
    });
  };

  it('Pre-flight: discards NDR_UTILITY_TEMPLATE if shipment status is no longer NDR_ACTIVE (B2-RC-04)', async () => {
    const shipment = await createTestShipment({ status: 'DELIVERED' });
    const msg = await OutboxMessage.create({
      merchantId,
      shipmentId: shipment._id,
      dedupeKey: `stale-status-${Date.now()}`,
      channel: 'META_WHATSAPP',
      messageType: 'NDR_UTILITY_TEMPLATE',
      status: 'PROCESSING',
      leaseVersion: 1,
      scheduledFor: new Date(),
      payload: { ndrAttempt: 1 },
    });

    await processOutboxMessage(String(msg._id), 1);

    const reloaded = await OutboxMessage.findById(msg._id);
    expect(reloaded?.status).toBe('DISCARDED_STALE');
  });

  it('Pre-flight: discards NDR_UTILITY_TEMPLATE if payload ndrAttempt does not match current shipment ndrAttempt (B2-RC-04)', async () => {
    // Shipment has advanced to NDR attempt 2
    const shipment = await createTestShipment({ status: 'NDR_ACTIVE', ndrAttempt: 2 });
    // Outbox message is from attempt 1
    const msg = await OutboxMessage.create({
      merchantId,
      shipmentId: shipment._id,
      dedupeKey: `stale-attempt-${Date.now()}`,
      channel: 'META_WHATSAPP',
      messageType: 'NDR_UTILITY_TEMPLATE',
      status: 'PROCESSING',
      leaseVersion: 1,
      scheduledFor: new Date(),
      payload: { ndrAttempt: 1 },
    });

    await processOutboxMessage(String(msg._id), 1);

    const reloaded = await OutboxMessage.findById(msg._id);
    expect(reloaded?.status).toBe('DISCARDED_STALE');
  });

  it('Pre-flight: discards RTO_NOTICE if shipment is no longer RTO_INITIATED (e.g. rescued) (B2-RC-04)', async () => {
    const shipment = await createTestShipment({ status: 'OUT_FOR_DELIVERY' });
    const msg = await OutboxMessage.create({
      merchantId,
      shipmentId: shipment._id,
      dedupeKey: `rto-rescued-${Date.now()}`,
      channel: 'META_WHATSAPP',
      messageType: 'RTO_NOTICE',
      status: 'PROCESSING',
      leaseVersion: 1,
      scheduledFor: new Date(),
      payload: { ndrAttempt: 1 },
    });

    await processOutboxMessage(String(msg._id), 1);

    const reloaded = await OutboxMessage.findById(msg._id);
    expect(reloaded?.status).toBe('DISCARDED_STALE');
  });

  it('Lease generation fencing: worker with stale leaseVersion cannot process or overwrite newer claim (B2-RC-01)', async () => {
    const shipment = await createTestShipment({ status: 'NDR_ACTIVE', ndrAttempt: 1 });
    const msg = await OutboxMessage.create({
      merchantId,
      shipmentId: shipment._id,
      dedupeKey: `fencing-test-${Date.now()}`,
      channel: 'META_WHATSAPP',
      messageType: 'NDR_UTILITY_TEMPLATE',
      status: 'PROCESSING',
      leaseVersion: 2, // Newer claim bumped it to 2
      scheduledFor: new Date(),
      payload: { ndrAttempt: 1 },
    });

    const sendSpy = jest.spyOn(metaClient, 'send');

    // Worker invokes with stale expectedLeaseVersion = 1
    await processOutboxMessage(String(msg._id), 1);

    expect(sendSpy).not.toHaveBeenCalled();
    const reloaded = await OutboxMessage.findById(msg._id);
    expect(reloaded?.status).toBe('PROCESSING'); // Untouched by stale worker
    expect(reloaded?.leaseVersion).toBe(2);
  });

  it('Governor throttling: reschedules message to PENDING without incrementing attempts (B2-RC-01)', async () => {
    const shipment = await createTestShipment({ status: 'NDR_ACTIVE', ndrAttempt: 1 });
    const msg = await OutboxMessage.create({
      merchantId,
      shipmentId: shipment._id,
      dedupeKey: `gov-throttled-${Date.now()}`,
      channel: 'META_WHATSAPP',
      messageType: 'NDR_UTILITY_TEMPLATE',
      status: 'PROCESSING',
      leaseVersion: 1,
      attempts: 0,
      scheduledFor: new Date(),
      payload: { ndrAttempt: 1 },
    });

    // Pause governor
    await sendGovernor.pause('META_WHATSAPP', 5000);

    await processOutboxMessage(String(msg._id), 1);

    const reloaded = await OutboxMessage.findById(msg._id);
    expect(reloaded?.status).toBe('PENDING');
    expect(reloaded?.attempts).toBe(0); // Attempts MUST NOT be burned on governor pause! (B2-RC-01)
    expect(new Date(reloaded!.scheduledFor).getTime()).toBeGreaterThan(Date.now());
  });

  it('Dispatches to Meta Cloud API, decrypts phone at send time, and marks DISPATCHED (B2-RC-02, B2-BUG-05)', async () => {
    const shipment = await createTestShipment({ status: 'NDR_ACTIVE', ndrAttempt: 1 });
    const msg = await OutboxMessage.create({
      merchantId,
      shipmentId: shipment._id,
      dedupeKey: `dispatch-success-${Date.now()}`,
      channel: 'META_WHATSAPP',
      messageType: 'NDR_UTILITY_TEMPLATE',
      status: 'PROCESSING',
      leaseVersion: 1,
      attempts: 0,
      leaseUntil: new Date(Date.now() + 60_000),
      scheduledFor: new Date(),
      payload: { ndrAttempt: 1, trackingNumber: shipment.trackingNumber },
    });

    const sendSpy = jest.spyOn(metaClient, 'send').mockResolvedValueOnce({
      messages: [{ id: 'wamid_test_12345' }],
    });

    await processOutboxMessage(String(msg._id), 1);

    expect(sendSpy).toHaveBeenCalledTimes(1);
    const [, , decryptedPhoneArg] = sendSpy.mock.calls[0];
    expect(decryptedPhoneArg).toBe(rawPhone); // Decrypted at send time!

    const reloaded = await OutboxMessage.findById(msg._id);
    expect(reloaded?.status).toBe('DISPATCHED');
    expect(reloaded?.providerMessageId).toBe('wamid_test_12345');
    expect(reloaded?.attempts).toBe(1);
    expect(reloaded?.leaseUntil).toBeUndefined();
  });

  it('Meta 131048 Spam Error: pauses governor, emits deduplicated OpsAlert, and reschedules message (B2-BN-04)', async () => {
    const shipment = await createTestShipment({ status: 'NDR_ACTIVE', ndrAttempt: 1 });
    const msg = await OutboxMessage.create({
      merchantId,
      shipmentId: shipment._id,
      dedupeKey: `meta-spam-${Date.now()}`,
      channel: 'META_WHATSAPP',
      messageType: 'NDR_UTILITY_TEMPLATE',
      status: 'PROCESSING',
      leaseVersion: 1,
      attempts: 0,
      leaseUntil: new Date(Date.now() + 60_000),
      scheduledFor: new Date(),
      payload: { ndrAttempt: 1 },
    });

    jest.spyOn(metaClient, 'send').mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          error: {
            code: 131048,
            message: 'Spam rate limit hit for message template',
          },
        },
      },
    });

    await processOutboxMessage(String(msg._id), 1);

    // Governor paused
    expect(await sendGovernor.isPaused('META_WHATSAPP')).toBe(true);

    // Message rescheduled with attempts = 1
    const reloaded = await OutboxMessage.findById(msg._id);
    expect(reloaded?.status).toBe('PENDING');
    expect(reloaded?.attempts).toBe(1);
    expect(reloaded?.lastError?.code).toBe(131048);

    // OpsAlert document created
    const alerts = await OpsAlert.find({ type: 'WA_SPAM_RATE_LIMIT' });
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].severity).toBe('CRITICAL');
  });

  it('Meta 131026 Permanent Error (phone not on WhatsApp): fails immediately without retrying (B2-BUG-04)', async () => {
    const shipment = await createTestShipment({ status: 'NDR_ACTIVE', ndrAttempt: 1 });
    const msg = await OutboxMessage.create({
      merchantId,
      shipmentId: shipment._id,
      dedupeKey: `meta-permanent-${Date.now()}`,
      channel: 'META_WHATSAPP',
      messageType: 'NDR_UTILITY_TEMPLATE',
      status: 'PROCESSING',
      leaseVersion: 1,
      attempts: 0,
      leaseUntil: new Date(Date.now() + 60_000),
      scheduledFor: new Date(),
      payload: { ndrAttempt: 1 },
    });

    jest.spyOn(metaClient, 'send').mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          error: {
            code: 131026,
            message: 'Message undeliverable: recipient not on WhatsApp',
          },
        },
      },
    });

    await processOutboxMessage(String(msg._id), 1);

    const reloaded = await OutboxMessage.findById(msg._id);
    expect(reloaded?.status).toBe('FAILED'); // Permanent fail, not rescheduled!
    expect(reloaded?.attempts).toBe(1);
    expect(reloaded?.lastError?.code).toBe(131026);
  });

  it('Dynamic MerchantWaTemplate: resolves custom template parameters and falls back gracefully (B2-BUG-02)', async () => {
    await MerchantWaTemplate.create({
      merchantId,
      messageType: 'NDR_UTILITY_TEMPLATE',
      templateName: 'custom_ndr_urgent_v2',
      languageCode: 'ur',
      parameterBindings: ['trackingNumber', 'customerName', 'orderValueCOD'],
      status: 'ACTIVE',
    });

    const shipment = await createTestShipment({ status: 'NDR_ACTIVE', ndrAttempt: 1 });
    const msg = await OutboxMessage.create({
      merchantId,
      shipmentId: shipment._id,
      dedupeKey: `custom-tpl-${Date.now()}`,
      channel: 'META_WHATSAPP',
      messageType: 'NDR_UTILITY_TEMPLATE',
      status: 'PROCESSING',
      leaseVersion: 1,
      leaseUntil: new Date(Date.now() + 60_000),
      scheduledFor: new Date(),
      payload: { ndrAttempt: 1 },
    });

    const fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid_custom_tpl_999' }] }),
    });

    await processOutboxMessage(String(msg._id), 1);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, fetchOpts] = fetchSpy.mock.calls[0] as [any, any];
    const parsedBody = JSON.parse(fetchOpts.body);

    expect(parsedBody.template.name).toBe('custom_ndr_urgent_v2');
    expect(parsedBody.template.language.code).toBe('ur');
    // CustomerName should fallback to 'Valued Customer' safely without throwing or sending undefined (B2-BUG-02)
    const bodyParams = parsedBody.template.components[0].parameters;
    expect(bodyParams[1].text).toBe('Valued Customer');
  });
});
