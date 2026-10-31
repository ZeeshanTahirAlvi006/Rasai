// src/outbox/outbox.worker.ts
import { OutboxMessage, type IOutboxMessage } from '../models/OutboxMessage';
import { Shipment, type IShipment } from '../shipment/shipment.model';
import { ConversationSession } from '../models/ConversationSession';
import { ACTIVE_CONVERSATION_STATES } from '../types';
import { sendGovernor } from './sendGovernor';
import { metaClient, classifyMetaError, type MetaSendResult } from './metaClient';
import { alertOps } from '../utils/opsAlert';
import { decryptPhone } from '../utils/phone';
import { config } from '../config/index';

const isTerminalStatus = (status: string): boolean =>
  ['DELIVERED', 'CANCELLED', 'RTO_DELIVERED'].includes(status);

/**
 * Evaluates whether an enqueued outbox message is stale relative to current shipment state (B2-RC-04, B2-BUG-06).
 */
export function isOutboxMessageStale(
  msg: Partial<IOutboxMessage>,
  shipment: Partial<IShipment>,
): boolean {
  const currentStatus = shipment.status || '';
  const payload = msg.payload || {};
  const msgAttempt = payload.ndrAttempt != null ? Number(payload.ndrAttempt) : null;

  switch (msg.messageType) {
    case 'NDR_UTILITY_TEMPLATE':
      if (currentStatus !== 'NDR_ACTIVE') return true;
      if (msgAttempt != null && shipment.ndrAttempt != null && shipment.ndrAttempt !== msgAttempt) {
        return true; // Belongs to an older or newer NDR cycle
      }
      return false;

    case 'RTO_NOTICE':
      if (currentStatus !== 'RTO_INITIATED') return true;
      if (msgAttempt != null && shipment.ndrAttempt != null && shipment.ndrAttempt !== msgAttempt) {
        return true;
      }
      return false;

    case 'DELIVERY_CORRECTION':
      return currentStatus !== 'DELIVERED';

    case 'RESCHEDULE_CONFIRMATION':
      return currentStatus !== 'RESOLVED_RESCHEDULED' && currentStatus !== 'RTO_INITIATED';

    case 'REATTEMPT_DISPATCH':
      return isTerminalStatus(currentStatus);

    default:
      return isTerminalStatus(currentStatus);
  }
}

/**
 * Fences finalize point-updates by leaseVersion so an expired worker cannot overwrite a newer claim (B2-RC-01).
 */
export async function finalizeOutbox(
  msg: { _id: any; leaseVersion: number },
  patch: Partial<IOutboxMessage>,
): Promise<void> {
  await OutboxMessage.updateOne(
    { _id: msg._id, status: 'PROCESSING', leaseVersion: msg.leaseVersion },
    {
      $set: { ...patch, updatedAt: new Date() },
      $unset: { leaseUntil: 1, relayClaimToken: 1 },
    },
  );
}

/**
 * Fences reschedule point-updates by leaseVersion (B2-RC-01).
 */
export async function rescheduleOutbox(
  msg: { _id: any; leaseVersion: number },
  when: Date,
  options: { attempts?: number; lastError?: { code?: number; message: string } } = {},
): Promise<void> {
  const setFields: Record<string, any> = {
    status: 'PENDING',
    scheduledFor: when,
    updatedAt: new Date(),
  };

  if (options.attempts != null) {
    setFields.attempts = options.attempts;
  }
  if (options.lastError) {
    setFields.lastError = options.lastError;
  }

  await OutboxMessage.updateOne(
    { _id: msg._id, status: 'PROCESSING', leaseVersion: msg.leaseVersion },
    {
      $set: setFields,
      $unset: { leaseUntil: 1, relayClaimToken: 1 },
    },
  );
}

/**
 * Handles errors returned during Meta WhatsApp API dispatch.
 */
export async function handleSendError(
  msg: IOutboxMessage,
  shipment: Partial<IShipment>,
  err: any,
): Promise<void> {
  const classified = classifyMetaError(err);
  const nextAttempts = (msg.attempts || 0) + 1;
  const maxAttempts = config.outbox.maxAttempts || 5;
  const lastError = { code: classified.code, message: classified.message };

  if (classified.classification === 'SPAM_RATE_LIMIT') {
    // 131048: Spam rate limit. Pause governor for spamPauseMs and alert ops
    const pauseMs = config.sendGovernor.spamPauseMs || 14_400_000;
    await sendGovernor.pause('META_WHATSAPP', pauseMs);
    await alertOps(
      'WA_SPAM_RATE_LIMIT',
      {
        messageType: msg.messageType,
        error: classified.message,
        attempts: nextAttempts,
      },
      { severity: 'CRITICAL', dedupeScope: msg.messageType },
    );
    const resumeAt = await sendGovernor.resumeAt('META_WHATSAPP');
    await rescheduleOutbox(msg, resumeAt, { attempts: nextAttempts, lastError });
    return;
  }

  if (classified.classification === 'PAIR_LIMIT') {
    // 131056: Too many messages to this recipient
    const delayMs = config.sendGovernor.pairLimitDelayMs || 3_600_000;
    const phoneHash = shipment.customerPhoneHash || '';
    const resumeAt = await sendGovernor.recordRecipientThrottle('META_WHATSAPP', phoneHash, delayMs);
    await rescheduleOutbox(msg, resumeAt, { attempts: nextAttempts, lastError });
    return;
  }

  if (classified.classification === 'PERMANENT_FATAL' || nextAttempts >= maxAttempts) {
    // Permanent 4xx or attempts exhausted: fail permanently without burning more attempts (B2-BUG-04)
    await finalizeOutbox(msg, { status: 'FAILED', attempts: nextAttempts, lastError });
    return;
  }

  // Transient / Throughput 429: exponential backoff + jitter
  const backoffMs = Math.min(
    60_000,
    2000 * Math.pow(2, nextAttempts - 1) + Math.floor(Math.random() * 1000),
  );
  await rescheduleOutbox(msg, new Date(Date.now() + backoffMs), {
    attempts: nextAttempts,
    lastError,
  });
}

/**
 * Processes a single outbox message job.
 */
export async function processOutboxMessage(
  messageId: string,
  expectedLeaseVersion?: number,
): Promise<void> {
  const query: Record<string, any> = { _id: messageId, status: 'PROCESSING' };
  if (expectedLeaseVersion != null) {
    query.leaseVersion = expectedLeaseVersion;
  }

  const msg = (await OutboxMessage.findOne(query).lean().exec()) as IOutboxMessage | null;
  if (!msg) {
    return;
  }

  // Idempotency: already sent on a previous attempt (crash between send and finalize)
  if (msg.providerMessageId) {
    await finalizeOutbox(msg, { status: 'DISPATCHED' });
    return;
  }

  // Projected pre-flight lookup (B2-BN-03)
  const shipment = (await Shipment.findById(msg.shipmentId)
    .select(
      'merchantId carrier trackingNumber status ndrAttempt orderValueCOD customerPhone customerPhoneHash rescheduledDate destinationStationCode',
    )
    .lean()
    .exec()) as Partial<IShipment> | null;

  if (!shipment) {
    await finalizeOutbox(msg, {
      status: 'FAILED',
      lastError: { message: 'shipment missing' },
    });
    return;
  }

  // Pre-flight stale check (B2-RC-04)
  if (isOutboxMessageStale(msg, shipment)) {
    await finalizeOutbox(msg, { status: 'DISCARDED_STALE' });
    return;
  }

  if (msg.channel === 'META_WHATSAPP') {
    // Atomic permit evaluation via Redis Lua (B2-RC-05)
    const permit = await sendGovernor.acquirePermit(msg.channel, shipment.customerPhoneHash);
    if (!permit.allowed) {
      // Re-schedule for after throttle without burning attempts! (B2-RC-01)
      await rescheduleOutbox(msg, new Date(Date.now() + permit.retryAfterMs));
      return;
    }

    // Lease budget assertion: ensure at least 20s remain before initiating 15s HTTP call (B2-RC-06)
    const now = Date.now();
    const remainingLeaseMs = msg.leaseUntil ? new Date(msg.leaseUntil).getTime() - now : 0;
    if (remainingLeaseMs < 20_000) {
      const leaseExtensionMs = config.outbox.leaseMs || 60_000;
      const renewRes = await OutboxMessage.updateOne(
        { _id: msg._id, status: 'PROCESSING', leaseVersion: msg.leaseVersion },
        { $set: { leaseUntil: new Date(now + leaseExtensionMs) } },
      );
      if (renewRes.matchedCount === 0) {
        // Lost lease or claimed by another worker; abort before calling Meta
        return;
      }
    }

    // Phone decryption with permanent failure isolation (B2-BUG-05)
    let decryptedPhone: string;
    try {
      if (!shipment.customerPhone) {
        throw new Error('customerPhone is empty');
      }
      decryptedPhone = decryptPhone(shipment.customerPhone);
    } catch {
      await finalizeOutbox(msg, {
        status: 'FAILED',
        lastError: { message: 'invalid_customer_phone' },
      });
      return;
    }

    // Dispatch to Meta Cloud API in isolated try/catch (B2-RC-02)
    let sendResult: MetaSendResult;
    try {
      sendResult = await metaClient.send(msg, shipment, decryptedPhone);
    } catch (err: any) {
      await handleSendError(msg, shipment, err);
      return;
    }

    // Success path: once send succeeds, message IS delivered to Meta.
    // NEVER call handleSendError after this point (B2-RC-02)!
    const providerMessageId = sendResult.messages?.[0]?.id || `wamid_${Date.now()}`;
    await OutboxMessage.updateOne(
      { _id: msg._id, status: { $ne: 'DISPATCHED' } },
      {
        $set: {
          status: 'DISPATCHED',
          providerMessageId,
          updatedAt: new Date(),
        },
        $inc: { attempts: 1 },
        $unset: { leaseUntil: 1, relayClaimToken: 1 },
      },
    ).catch((dbErr) => {
      console.error('[OutboxWorker] DB error updating dispatched message:', dbErr);
    });

    // Pre-create/upgrade active ConversationSession in AWAITING_CHOICE for NDR utility messages (B3-BUG-01, Q1)
    if (
      msg.messageType === 'NDR_UTILITY_TEMPLATE' &&
      shipment._id &&
      shipment.merchantId &&
      shipment.customerPhoneHash
    ) {
      const windowExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await ConversationSession.findOneAndUpdate(
        { shipmentId: shipment._id, state: { $in: ACTIVE_CONVERSATION_STATES } },
        {
          $set: {
            merchantId: shipment.merchantId,
            shipmentId: shipment._id,
            customerPhoneHash: shipment.customerPhoneHash,
            state: 'AWAITING_CHOICE',
            ndrAttempt: shipment.ndrAttempt || 1,
            templateWamid: providerMessageId,
            windowExpiresAt,
            expiresAt,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            stateVersion: 0,
            draft: {},
            messages: [
              {
                direction: 'OUTBOUND',
                text: 'NDR Utility Template Dispatched',
                messageType: 'NDR_UTILITY_TEMPLATE',
                wamid: providerMessageId,
                timestamp: new Date(),
              },
            ],
          },
        },
        { upsert: true, returnDocument: 'after' },
      ).catch(() => {});
    }

    return;
  }

  // Non-WhatsApp channel handling fallback
  await finalizeOutbox(msg, { status: 'DISPATCHED' });
}
