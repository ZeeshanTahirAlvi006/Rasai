// src/conversation/conversation.service.ts
// Handles WhatsApp customer conversation lifecycle, interactive turns, and state machine integration.
import { Types } from 'mongoose';
import { ConversationSession, type IConversationSession } from '../models/ConversationSession';
import { InboundWaMessage } from '../models/InboundWaMessage';
import { Shipment, type IShipment } from '../shipment/shipment.model';
import { applyEventDetailed } from '../engine/applyEvent';
import { isTerminal } from '../shipment/shipment.stateMachine';
import { metaClient } from '../outbox/metaClient';
import { normalizePkPhone, hashPhone, decryptPhone } from '../utils/phone';
import { AppError } from '../middleware/error';
import {
  getNextAvailablePktDates,
  type ParsedInboundTurn,
} from './conversation.utils';
import { ACTIVE_CONVERSATION_STATES, type ConversationState } from '../types';

export interface ServiceResponse<T = any> {
  success: boolean;
  status: number;
  message: string;
  data: T;
  error: string | null;
}

// In-process serialization lanes per phone hash to eliminate race conditions on rapid taps (B3-RC-02)
const phoneConversationLanes = new Map<string, Promise<unknown>>();

export function serializeForPhone<T>(phoneHash: string, fn: () => Promise<T>): Promise<T> {
  const current = phoneConversationLanes.get(phoneHash) || Promise.resolve();
  const next = current
    .catch(() => {})
    .then(async () => {
      try {
        return await fn();
      } finally {
        if (phoneConversationLanes.get(phoneHash) === next) {
          phoneConversationLanes.delete(phoneHash);
        }
      }
    });

  phoneConversationLanes.set(phoneHash, next);
  return next;
}

/**
 * Atomically claims an inbound WhatsApp message ID (wamid) with a lease (B3-RC-01).
 * Returns claimToken if won, or null if duplicate/already processed.
 */
async function claimInboundWamid(wamid: string): Promise<Types.ObjectId | null> {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + 30_000); // 30s lease
  const claimToken = new Types.ObjectId();

  try {
    const claimed = await InboundWaMessage.findOneAndUpdate(
      {
        wamid,
        $or: [{ status: 'PROCESSING', leaseUntil: { $lt: now } }],
      },
      {
        $set: {
          status: 'PROCESSING',
          leaseUntil,
          claimToken,
          receivedAt: now,
        },
      },
      { upsert: true, returnDocument: 'after' },
    );
    return claimed.claimToken || claimToken;
  } catch (err: any) {
    if (err?.code === 11000) {
      // Already PROCESSED or active lease held by another worker
      return null;
    }
    throw err;
  }
}

async function markWamidProcessed(wamid: string, claimToken: Types.ObjectId): Promise<void> {
  await InboundWaMessage.updateOne(
    { wamid, claimToken },
    { $set: { status: 'PROCESSED' }, $unset: { leaseUntil: 1 } },
  ).catch(() => {});
}

async function releaseWamidLease(wamid: string, claimToken: Types.ObjectId): Promise<void> {
  await InboundWaMessage.deleteOne({ wamid, claimToken, status: 'PROCESSING' }).catch(() => {});
}

/**
 * Dispatches an outbound session reply, logging it into the session's chat transcript (B3-ML-01).
 */
async function sendAndRecordSessionTurn(
  session: IConversationSession,
  decryptedPhone: string,
  messagePayload: {
    type: 'text' | 'button' | 'list';
    bodyText: string;
    buttonText?: string;
    buttons?: Array<{ id: string; title: string }>;
    sections?: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>;
  },
): Promise<void> {
  const sendRes = await metaClient.sendInteractiveSessionMessage(decryptedPhone, messagePayload);

  await ConversationSession.updateOne(
    { _id: session._id },
    {
      $push: {
        messages: {
          $each: [
            {
              direction: 'OUTBOUND',
              text: messagePayload.bodyText,
              messageType: messagePayload.type.toUpperCase(),
              wamid: sendRes.wamid,
              simulated: sendRes.simulated,
              timestamp: new Date(),
            },
          ],
          $slice: -30, // Cap transcript at 30 turns (B3-ML-01)
        },
      },
      $set: { updatedAt: new Date() },
    },
  );
}

/**
 * Core engine method to process a normalized inbound customer WhatsApp message.
 */
export async function processInboundCustomerTurn(
  turn: ParsedInboundTurn,
): Promise<{ processed: boolean; reason?: string; sessionId?: string; nextState?: string }> {
  const claimToken = await claimInboundWamid(turn.wamid);
  if (!claimToken) {
    return { processed: false, reason: 'DUPLICATE_OR_ACTIVE_LEASE' };
  }

  try {
    let e164: string;
    try {
      e164 = normalizePkPhone(turn.from);
    } catch {
      await markWamidProcessed(turn.wamid, claimToken);
      return { processed: false, reason: 'INVALID_PHONE_NUMBER' };
    }

    const phoneHash = hashPhone(e164);

    return await serializeForPhone(phoneHash, async () => {
      const now = new Date();

      // Step 1: Hybrid Parcel and Session Resolution (Q1)
      let session: IConversationSession | null = null;
      let shipment: Partial<IShipment> | null = null;

      // 1A. If turn embeds a targetShipmentId (from button payload), load that parcel directly
      if (turn.targetShipmentId && Types.ObjectId.isValid(turn.targetShipmentId)) {
        shipment = await Shipment.findById(turn.targetShipmentId)
          .select(
            '_id merchantId carrier trackingNumber status ndrAttempt orderValueCOD customerPhone customerPhoneHash rescheduledDate destinationStationCode',
          )
          .lean()
          .exec();

        if (shipment) {
          session = await ConversationSession.findOne({
            shipmentId: shipment._id,
            state: { $in: ACTIVE_CONVERSATION_STATES },
            windowExpiresAt: { $gt: now },
          });
        }
      }

      // 1B. If no session yet, lookup open session by phoneHash
      if (!session) {
        session = await ConversationSession.findOne({
          customerPhoneHash: phoneHash,
          state: { $in: ACTIVE_CONVERSATION_STATES },
          windowExpiresAt: { $gt: now },
        }).sort({ updatedAt: -1 });

        if (session && !shipment) {
          shipment = await Shipment.findById(session.shipmentId)
            .select(
              '_id merchantId carrier trackingNumber status ndrAttempt orderValueCOD customerPhone customerPhoneHash rescheduledDate destinationStationCode',
            )
            .lean()
            .exec();
        }
      }

      // 1C. Fallback to latest active NDR / Rescheduled / RTO parcel if no active session
      if (!shipment) {
        shipment = await Shipment.findOne({
          customerPhoneHash: phoneHash,
          status: { $in: ['NDR_ACTIVE', 'RESOLVED_RESCHEDULED', 'RTO_INITIATED'] },
        })
          .sort({ updatedAt: -1 })
          .select(
            '_id merchantId carrier trackingNumber status ndrAttempt orderValueCOD customerPhone customerPhoneHash rescheduledDate destinationStationCode',
          )
          .lean()
          .exec();
      }

      // If still no parcel found, check latest terminal shipment to answer status (Spec §7.2)
      if (!shipment) {
        const terminalShipment = await Shipment.findOne({ customerPhoneHash: phoneHash })
          .sort({ updatedAt: -1 })
          .select('status trackingNumber carrier customerPhone')
          .lean()
          .exec();

        if (terminalShipment && terminalShipment.customerPhone) {
          const plainPhone = decryptPhone(terminalShipment.customerPhone);
          await metaClient.sendInteractiveSessionMessage(plainPhone, {
            type: 'text',
            bodyText: `Hello! Parcel ${terminalShipment.trackingNumber} (${terminalShipment.carrier}) is currently marked as ${terminalShipment.status}. No action is required.`,
          });
        }
        await markWamidProcessed(turn.wamid, claimToken);
        return { processed: true, reason: 'NO_ACTIVE_PARCEL_FOUND' };
      }

      // Load plain phone for messaging
      let decryptedPhone: string;
      try {
        decryptedPhone = decryptPhone(shipment.customerPhone!);
      } catch {
        await markWamidProcessed(turn.wamid, claimToken);
        return { processed: false, reason: 'PHONE_DECRYPTION_FAILED' };
      }

      // Terminal Parcel Guard (B3-RC-03): if parcel is already DELIVERED/CANCELLED, close session
      if (shipment.status && isTerminal(shipment.status)) {
        if (session) {
          session.state = 'DONE';
          session.updatedAt = now;
          await session.save();
        }
        await metaClient.sendInteractiveSessionMessage(decryptedPhone, {
          type: 'text',
          bodyText: `Your shipment ${shipment.trackingNumber} has already reached final status: ${shipment.status}. Thank you!`,
        });
        await markWamidProcessed(turn.wamid, claimToken);
        return { processed: true, reason: 'PARCEL_TERMINAL', nextState: 'DONE' };
      }

      // 1D. Create active session if absent (in AWAITING_CHOICE)
      if (!session) {
        const windowExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        session = await ConversationSession.findOneAndUpdate(
          { shipmentId: shipment._id, state: { $in: ACTIVE_CONVERSATION_STATES } },
          {
            $set: {
              merchantId: shipment.merchantId,
              shipmentId: shipment._id,
              customerPhoneHash: phoneHash,
              state: 'AWAITING_CHOICE',
              ndrAttempt: shipment.ndrAttempt || 1,
              windowExpiresAt,
              expiresAt,
              updatedAt: now,
            },
            $setOnInsert: {
              stateVersion: 0,
              draft: {},
              messages: [],
            },
          },
          { upsert: true, returnDocument: 'after' },
        );
      }

      if (!session) {
        await markWamidProcessed(turn.wamid, claimToken);
        return { processed: false, reason: 'SESSION_INITIALIZATION_FAILED' };
      }

      // Record inbound customer turn in session transcript (B3-ML-01)
      await ConversationSession.updateOne(
        { _id: session._id },
        {
          $push: {
            messages: {
              $each: [
                {
                  direction: 'INBOUND',
                  text: turn.text || turn.rawAction || 'Inbound response',
                  messageType: turn.type,
                  wamid: turn.wamid,
                  timestamp: turn.timestamp,
                },
              ],
              $slice: -30,
            },
          },
          $set: { lastInboundAt: now, updatedAt: now },
        },
      );

      // Step 2: State Machine Execution (Q2, Q3)
      const action = turn.rawAction || '';
      const textUpper = (turn.text || '').toUpperCase().trim();

      // Branch 1: "Wrong Details" action (Spec §7.2, Q2)
      if (action.includes('ACTION_CORRECTION') || textUpper === 'WRONG DETAILS' || textUpper === 'COURIER DID NOT CALL') {
        // Record CUSTOMER_CORRECTION event (sets disputeRetractionRequested: true via RETRACT_DISPUTE)
        await applyEventDetailed({
          merchantId: shipment.merchantId!,
          carrier: shipment.carrier!,
          trackingNumber: shipment.trackingNumber!,
          intent: { kind: 'CUSTOMER_CORRECTION' },
          event: {
            eventKey: `CORR_${shipment._id}_${Date.now()}`,
            merchantId: shipment.merchantId!,
            carrier: shipment.carrier!,
            trackingNumber: shipment.trackingNumber!,
            source: 'CUSTOMER',
            rawStatus: 'CUSTOMER_REPORTED_WRONG_DETAILS',
            rawRemarks: 'Customer reported courier did not call or details incorrect',
            occurredAt: now,
          },
        }).catch(() => {});

        // Continue to AWAITING_DATE so customer can still reschedule (Q2)
        session.state = 'AWAITING_DATE';
        session.draft.correctionRecorded = true;
        session.stateVersion = (session.stateVersion || 0) + 1;
        await session.save();

        const dates = getNextAvailablePktDates(now, 3);
        await sendAndRecordSessionTurn(session, decryptedPhone, {
          type: 'list',
          bodyText: `Thank you for letting us know! We have logged that the courier did not reach you correctly.\n\nPlease pick your preferred date for delivery of parcel ${shipment.trackingNumber}:`,
          buttonText: 'Select Date',
          sections: [
            {
              title: 'Available Dates',
              rows: dates.map((d) => ({
                id: `${d.id}:${shipment!._id}`,
                title: d.label,
                description: `Confirm delivery on ${d.dateKey}`,
              })),
            },
          ],
        });

        await markWamidProcessed(turn.wamid, claimToken);
        return { processed: true, sessionId: String(session._id), nextState: 'AWAITING_DATE' };
      }

      // Branch 2: "Cancel Order" action (Spec §7.2, Q2)
      if (action.includes('ACTION_CANCEL') || textUpper === 'CANCEL ORDER' || textUpper === 'CANCEL') {
        session.state = 'CONFIRMING';
        session.draft.pendingAction = 'CANCEL';
        session.stateVersion = (session.stateVersion || 0) + 1;
        await session.save();

        await sendAndRecordSessionTurn(session, decryptedPhone, {
          type: 'button',
          bodyText: `Are you sure you want to cancel the order for parcel ${shipment.trackingNumber} (COD: PKR ${shipment.orderValueCOD})?`,
          buttons: [
            { id: `CONFIRM_CANCEL:${shipment._id}`, title: 'Confirm Cancel' },
            { id: `ACTION_RESCHEDULE:${shipment._id}`, title: 'Keep & Reschedule' },
          ],
        });

        await markWamidProcessed(turn.wamid, claimToken);
        return { processed: true, sessionId: String(session._id), nextState: 'CONFIRMING' };
      }

      // Branch 3: "Reschedule" initial button tap
      if (
        action.includes('ACTION_RESCHEDULE') ||
        session.state === 'AWAITING_CHOICE' ||
        textUpper === 'RESCHEDULE'
      ) {
        session.state = 'AWAITING_DATE';
        session.draft.pendingAction = 'RESCHEDULE';
        session.stateVersion = (session.stateVersion || 0) + 1;
        await session.save();

        const dates = getNextAvailablePktDates(now, 3);
        await sendAndRecordSessionTurn(session, decryptedPhone, {
          type: 'list',
          bodyText: `Please choose a convenient delivery date for parcel ${shipment.trackingNumber}:`,
          buttonText: 'Select Date',
          sections: [
            {
              title: 'Delivery Dates',
              rows: dates.map((d) => ({
                id: `${d.id}:${shipment!._id}`,
                title: d.label,
                description: `Deliver on ${d.dateKey}`,
              })),
            },
          ],
        });

        await markWamidProcessed(turn.wamid, claimToken);
        return { processed: true, sessionId: String(session._id), nextState: 'AWAITING_DATE' };
      }

      // Branch 4: In AWAITING_DATE state -> customer selects a date
      if (session.state === 'AWAITING_DATE') {
        let pickedDate: Date | null = null;

        if (action.startsWith('DATE_')) {
          const dateStr = action.replace(/^DATE_/, '').split(':')[0];
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            pickedDate = new Date(`${dateStr}T12:00:00.000+05:00`);
          }
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(textUpper)) {
          pickedDate = new Date(`${textUpper}T12:00:00.000+05:00`);
        } else {
          // Default to tomorrow if free-form reply
          const dates = getNextAvailablePktDates(now, 1);
          pickedDate = dates[0]?.date || new Date(now.getTime() + 86400000);
        }

        session.draft.date = pickedDate || undefined;
        session.state = 'AWAITING_LOCATION';
        session.stateVersion = (session.stateVersion || 0) + 1;
        await session.save();

        const dateFormatted = pickedDate
          ? new Intl.DateTimeFormat('en-CA', {
              timeZone: 'Asia/Karachi',
            }).format(pickedDate)
          : 'Tomorrow';

        await sendAndRecordSessionTurn(session, decryptedPhone, {
          type: 'button',
          bodyText: `Got it! Delivery set for ${dateFormatted}.\n\nTo help the rider find your doorstep accurately, please share your WhatsApp Location pin, or tap "Skip Location".`,
          buttons: [
            { id: `SKIP_LOCATION:${shipment._id}`, title: 'Skip Location' },
          ],
        });

        await markWamidProcessed(turn.wamid, claimToken);
        return { processed: true, sessionId: String(session._id), nextState: 'AWAITING_LOCATION' };
      }

      // Branch 5: In AWAITING_LOCATION state -> customer shares location or skips
      if (session.state === 'AWAITING_LOCATION') {
        if (turn.coordinates && Number.isFinite(turn.coordinates.lat)) {
          session.draft.coordinates = turn.coordinates;
        }

        session.state = 'CONFIRMING';
        session.stateVersion = (session.stateVersion || 0) + 1;
        await session.save();

        const dateStr = session.draft.date
          ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(
              new Date(session.draft.date),
            )
          : 'Next business day';

        const locationNotice = session.draft.coordinates
          ? `📍 GPS Pin Saved: https://www.google.com/maps?q=${session.draft.coordinates.lat.toFixed(6)},${session.draft.coordinates.lng.toFixed(6)}`
          : `📍 Standard Address`;

        await sendAndRecordSessionTurn(session, decryptedPhone, {
          type: 'button',
          bodyText: `Please confirm your rescheduled delivery:\n\n📦 Tracking: ${shipment.trackingNumber}\n📅 Date: ${dateStr}\n${locationNotice}\n💰 COD: PKR ${shipment.orderValueCOD}`,
          buttons: [
            { id: `CONFIRM_RESCHEDULE:${shipment._id}`, title: 'Confirm Delivery' },
            { id: `ACTION_RESCHEDULE:${shipment._id}`, title: 'Change Date' },
          ],
        });

        await markWamidProcessed(turn.wamid, claimToken);
        return { processed: true, sessionId: String(session._id), nextState: 'CONFIRMING' };
      }

      // Branch 6: In CONFIRMING state -> customer taps Confirm or Cancel
      if (session.state === 'CONFIRMING') {
        // Confirmation of Cancel Order
        if (
          action.includes('CONFIRM_CANCEL') ||
          (session.draft.pendingAction === 'CANCEL' && (textUpper === 'YES' || textUpper === 'CONFIRM'))
        ) {
          await applyEventDetailed({
            merchantId: shipment.merchantId!,
            carrier: shipment.carrier!,
            trackingNumber: shipment.trackingNumber!,
            intent: { kind: 'MERCHANT_CANCEL' },
            event: {
              eventKey: `CANCEL_${shipment._id}_${Date.now()}`,
              merchantId: shipment.merchantId!,
              carrier: shipment.carrier!,
              trackingNumber: shipment.trackingNumber!,
              source: 'CUSTOMER',
              rawStatus: 'CUSTOMER_REQUESTED_CANCEL',
              rawRemarks: 'Customer cancelled shipment via WhatsApp conversation',
              occurredAt: now,
            },
          });

          session.state = 'DONE';
          session.stateVersion = (session.stateVersion || 0) + 1;
          await session.save();

          await sendAndRecordSessionTurn(session, decryptedPhone, {
            type: 'text',
            bodyText: `Your cancellation request for parcel ${shipment.trackingNumber} has been processed. The merchant has been notified.`,
          });

          await markWamidProcessed(turn.wamid, claimToken);
          return { processed: true, sessionId: String(session._id), nextState: 'DONE' };
        }

        // Confirmation of Reschedule
        if (
          action.includes('CONFIRM_RESCHEDULE') ||
          textUpper === 'CONFIRM' ||
          textUpper === 'CONFIRM DELIVERY' ||
          textUpper === 'YES'
        ) {
          const rescheduleDate = session.draft.date || new Date(now.getTime() + 86400000);
          const applyRes = await applyEventDetailed({
            merchantId: shipment.merchantId!,
            carrier: shipment.carrier!,
            trackingNumber: shipment.trackingNumber!,
            intent: {
              kind: 'CUSTOMER_RESCHEDULE',
              date: rescheduleDate,
              coordinates: session.draft.coordinates,
            },
            event: {
              eventKey: `RESCHED_${shipment._id}_${Date.now()}`,
              merchantId: shipment.merchantId!,
              carrier: shipment.carrier!,
              trackingNumber: shipment.trackingNumber!,
              source: 'CUSTOMER',
              rawStatus: 'CUSTOMER_CONFIRMED_RESCHEDULE',
              rawRemarks: 'Customer confirmed reschedule through WhatsApp conversation',
              occurredAt: now,
            },
          });

          session.state = 'DONE';
          session.stateVersion = (session.stateVersion || 0) + 1;
          await session.save();

          const dateStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Karachi',
          }).format(rescheduleDate);

          if (shipment.status === 'RTO_INITIATED') {
            // Per Spec §7.2: tell customer request was forwarded as priority rescue without promising date
            await sendAndRecordSessionTurn(session, decryptedPhone, {
              type: 'text',
              bodyText: `We have forwarded your rescue request to the courier dispatch station for parcel ${shipment.trackingNumber}. Since return delivery had started, our team will update you as soon as the station accepts re-dispatch!`,
            });
          } else {
            // Clean confirmation message (in addition to official HSM confirmation)
            await sendAndRecordSessionTurn(session, decryptedPhone, {
              type: 'text',
              bodyText: `✅ Confirmed! Parcel ${shipment.trackingNumber} is scheduled for delivery on ${dateStr}. Our courier partner has been notified.`,
            });
          }

          await markWamidProcessed(turn.wamid, claimToken);
          return {
            processed: true,
            sessionId: String(session._id),
            nextState: 'DONE',
          };
        }
      }

      // Default fallback turn response
      await sendAndRecordSessionTurn(session, decryptedPhone, {
        type: 'button',
        bodyText: `Hello! How can we assist you with parcel ${shipment.trackingNumber}?`,
        buttons: [
          { id: `ACTION_RESCHEDULE:${shipment._id}`, title: 'Reschedule Delivery' },
          { id: `ACTION_CORRECTION:${shipment._id}`, title: 'Wrong Details' },
          { id: `ACTION_CANCEL:${shipment._id}`, title: 'Cancel Order' },
        ],
      });

      await markWamidProcessed(turn.wamid, claimToken);
      return { processed: true, sessionId: String(session._id), nextState: session.state };
    });
  } catch (err: any) {
    await releaseWamidLease(turn.wamid, claimToken);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// Operator & Console Services
// ─────────────────────────────────────────────────────────────

export interface ListConversationFilter {
  state?: ConversationState;
  shipmentId?: string;
  limit?: number;
  skip?: number;
}

export async function listConversationSessionsService(
  merchantId: Types.ObjectId,
  filter: ListConversationFilter = {},
): Promise<ServiceResponse<any>> {
  const query: Record<string, any> = { merchantId };

  if (filter.state) {
    query.state = filter.state;
  }
  if (filter.shipmentId && Types.ObjectId.isValid(filter.shipmentId)) {
    query.shipmentId = new Types.ObjectId(filter.shipmentId);
  }

  const limit = Math.min(Math.max(Number(filter.limit) || 25, 1), 100);
  const skip = Math.max(Number(filter.skip) || 0, 0);

  const [sessions, total, countsByState] = await Promise.all([
    ConversationSession.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('_id merchantId shipmentId customerPhoneHash state stateVersion draft ndrAttempt templateWamid lastInboundAt windowExpiresAt expiresAt createdAt updatedAt')
      .populate('shipmentId', 'trackingNumber carrier status orderValueCOD rescheduledDate destinationStationCode')
      .lean()
      .exec(),
    ConversationSession.countDocuments(query),
    ConversationSession.aggregate([
      { $match: { merchantId } },
      { $group: { _id: '$state', count: { $sum: 1 } } },
    ]),
  ]);

  const summary: Record<string, number> = {
    AWAITING_CHOICE: 0,
    AWAITING_DATE: 0,
    AWAITING_LOCATION: 0,
    CONFIRMING: 0,
    DONE: 0,
    EXPIRED: 0,
  };
  countsByState.forEach((item: any) => {
    if (item._id in summary) {
      summary[item._id] = item.count;
    }
  });

  return {
    success: true,
    status: 200,
    message: 'Conversation sessions retrieved',
    data: {
      sessions,
      total,
      summary,
      limit,
      skip,
    },
    error: null,
  };
}

export async function getConversationSessionDetailService(
  merchantId: Types.ObjectId,
  id: string,
): Promise<ServiceResponse<any>> {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid conversation session ID', 'invalid_id');
  }

  const session = await ConversationSession.findOne({
    _id: new Types.ObjectId(id),
    merchantId,
  })
    .select('_id merchantId shipmentId customerPhoneHash state stateVersion draft ndrAttempt templateWamid messages lastInboundAt windowExpiresAt expiresAt createdAt updatedAt')
    .populate('shipmentId', 'trackingNumber carrier status orderValueCOD rescheduledDate destinationStationCode')
    .lean()
    .exec();

  if (!session) {
    throw new AppError(404, 'Conversation session not found', 'not_found');
  }

  return {
    success: true,
    status: 200,
    message: 'Conversation session detail retrieved',
    data: session,
    error: null,
  };
}

export interface SimulateInboundInput {
  shipmentId: string;
  action: 'ACTION_RESCHEDULE' | 'ACTION_CORRECTION' | 'ACTION_CANCEL' | 'SELECT_DATE' | 'SHARE_LOCATION' | 'SKIP_LOCATION' | 'CONFIRM_RESCHEDULE' | 'CONFIRM_CANCEL' | 'CUSTOM_TEXT';
  selectedDate?: string; // YYYY-MM-DD
  coordinates?: { lat: number; lng: number };
  customText?: string;
}

/**
 * End-to-end simulator enabling merchant testing directly from the frontend UI without live Meta tunnels.
 */
export async function simulateInboundWhatsAppService(
  merchantId: Types.ObjectId,
  input: SimulateInboundInput,
): Promise<ServiceResponse<any>> {
  if (!Types.ObjectId.isValid(input.shipmentId)) {
    throw new AppError(400, 'Invalid shipment ID', 'invalid_id');
  }

  const shipment = await Shipment.findOne({
    _id: new Types.ObjectId(input.shipmentId),
    merchantId,
  })
    .select('customerPhone customerPhoneHash trackingNumber')
    .lean()
    .exec();

  if (!shipment || !shipment.customerPhone) {
    throw new AppError(404, 'Shipment not found or customer phone missing', 'shipment_not_found');
  }

  const plainPhone = decryptPhone(shipment.customerPhone);
  const wamid = `wamid_sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  let parsedTurn: ParsedInboundTurn;

  switch (input.action) {
    case 'ACTION_RESCHEDULE':
      parsedTurn = {
        wamid,
        from: plainPhone,
        timestamp: new Date(),
        type: 'BUTTON',
        rawAction: 'ACTION_RESCHEDULE',
        targetShipmentId: String(shipment._id),
        text: 'Reschedule',
      };
      break;
    case 'ACTION_CORRECTION':
      parsedTurn = {
        wamid,
        from: plainPhone,
        timestamp: new Date(),
        type: 'BUTTON',
        rawAction: 'ACTION_CORRECTION',
        targetShipmentId: String(shipment._id),
        text: 'Wrong details',
      };
      break;
    case 'ACTION_CANCEL':
      parsedTurn = {
        wamid,
        from: plainPhone,
        timestamp: new Date(),
        type: 'BUTTON',
        rawAction: 'ACTION_CANCEL',
        targetShipmentId: String(shipment._id),
        text: 'Cancel order',
      };
      break;
    case 'SELECT_DATE':
      parsedTurn = {
        wamid,
        from: plainPhone,
        timestamp: new Date(),
        type: 'LIST',
        rawAction: `DATE_${input.selectedDate || '2026-10-23'}`,
        targetShipmentId: String(shipment._id),
        text: input.selectedDate || '2026-10-23',
      };
      break;
    case 'SHARE_LOCATION':
      parsedTurn = {
        wamid,
        from: plainPhone,
        timestamp: new Date(),
        type: 'LOCATION',
        coordinates: input.coordinates || { lat: 31.5204, lng: 74.3587 },
        text: 'Shared WhatsApp GPS Pin',
        targetShipmentId: String(shipment._id),
      };
      break;
    case 'SKIP_LOCATION':
      parsedTurn = {
        wamid,
        from: plainPhone,
        timestamp: new Date(),
        type: 'BUTTON',
        rawAction: 'SKIP_LOCATION',
        targetShipmentId: String(shipment._id),
        text: 'Skip Location',
      };
      break;
    case 'CONFIRM_RESCHEDULE':
      parsedTurn = {
        wamid,
        from: plainPhone,
        timestamp: new Date(),
        type: 'BUTTON',
        rawAction: 'CONFIRM_RESCHEDULE',
        targetShipmentId: String(shipment._id),
        text: 'Confirm Delivery',
      };
      break;
    case 'CONFIRM_CANCEL':
      parsedTurn = {
        wamid,
        from: plainPhone,
        timestamp: new Date(),
        type: 'BUTTON',
        rawAction: 'CONFIRM_CANCEL',
        targetShipmentId: String(shipment._id),
        text: 'Confirm Cancel',
      };
      break;
    case 'CUSTOM_TEXT':
    default:
      parsedTurn = {
        wamid,
        from: plainPhone,
        timestamp: new Date(),
        type: 'TEXT',
        text: input.customText || 'Hello',
        targetShipmentId: String(shipment._id),
      };
      break;
  }

  const result = await processInboundCustomerTurn(parsedTurn);

  const updatedSession = await ConversationSession.findOne({
    shipmentId: shipment._id,
  })
    .sort({ updatedAt: -1 })
    .lean()
    .exec();

  const updatedShipment = await Shipment.findById(shipment._id)
    .select('status rescheduledDate needsManifest ndrAttempt')
    .lean()
    .exec();

  return {
    success: true,
    status: 200,
    message: `Simulator processed action ${input.action}`,
    data: {
      result,
      session: updatedSession,
      shipment: updatedShipment,
    },
    error: null,
  };
}

export async function expireConversationSessionService(
  merchantId: Types.ObjectId,
  id: string,
): Promise<ServiceResponse<any>> {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid conversation session ID', 'invalid_id');
  }

  const session = await ConversationSession.findOneAndUpdate(
    { _id: new Types.ObjectId(id), merchantId },
    { $set: { state: 'EXPIRED', updatedAt: new Date() } },
    { returnDocument: 'after' },
  );

  if (!session) {
    throw new AppError(404, 'Conversation session not found', 'not_found');
  }

  return {
    success: true,
    status: 200,
    message: 'Conversation session marked as EXPIRED',
    data: session,
    error: null,
  };
}
