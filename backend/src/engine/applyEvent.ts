// src/engine/applyEvent.ts
// Formal finite state transition engine executing ledger insertion, stateVersion fencing, and outbox staging.
import mongoose, { ClientSession, Types } from 'mongoose';
import { areTransactionsSupported, setTransactionsSupported } from '../config/database.js';
import { Shipment, type IShipment } from '../shipment/shipment.model.js';
import { ShipmentEvent, toEventHashBuffer } from '../shipmentEvent/ShipmentEvent.model.js';
import { OutboxMessage, type IOutboxMessage } from '../models/OutboxMessage.js';
import { ConversationSession } from '../models/ConversationSession.js';
import { decide, isTerminal } from '../shipment/shipment.stateMachine.js';
import { ACTIVE_CONVERSATION_STATES, type Carrier, type Intent, type Disposition, type Effect, type EventSource, type Status } from '../types/index.js';

export function isTransactionUnsupportedError(err: any): boolean {
    if (!err) return false;
    const msg = String(err?.message || err?.errmsg || '');
    return (
        err?.code === 20 ||
        err?.codeName === 'IllegalOperation' ||
        msg.includes('Transaction numbers are only allowed') ||
        msg.includes('replica set member or mongos')
    );
}

export class ConcurrencyConflict extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConcurrencyConflict';
        Object.setPrototypeOf(this, ConcurrencyConflict.prototype);
    }
}

export const MAX_ATTEMPTS = 5;

export const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

export interface LedgerEventInput {
    eventKey: string;
    eventHash?: Buffer;
    merchantId: Types.ObjectId | string;
    carrier: Carrier;
    trackingNumber: string;
    source: EventSource;
    rawStatus: string;
    rawRemarks?: string;
    occurredAt: Date;
    batchId?: Types.ObjectId | string;
    payload?: Record<string, unknown>;
}

export interface ApplyEventCommand {
    merchantId: Types.ObjectId | string;
    carrier: Carrier;
    trackingNumber: string;
    intent: Intent;
    event: LedgerEventInput;
}

export interface ApplyEventResult {
    disposition: Disposition;
    nextStatus?: Status;
    appliedEffects?: Effect[];
    isDuplicate: boolean;
    shipmentId?: Types.ObjectId;
}

//Apply event with full result details (nextStatus, appliedEffects, isDuplicate, etc.).
//Guarantees atomic transaction, optimistic locking on stateVersion, and strictly bounded retry.
export async function applyEventDetailed(cmd: ApplyEventCommand): Promise<ApplyEventResult> {
    // 90-Day Retention Horizon Guard: reject events older than 90 days immediately
    const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
    if (cmd.event.occurredAt && (Date.now() - new Date(cmd.event.occurredAt).getTime()) > NINETY_DAYS_MS) {
        return {
            disposition: 'STALE_REJECTED',
            isDuplicate: false,
        };
    }

    // If running on a standalone MongoDB instance, bypass transactions and use optimistic concurrency
    if (!areTransactionsSupported()) {
        return await applyWithoutTransaction(cmd);
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const session = await mongoose.startSession();
        try {
            session.startTransaction({
                readConcern: { level: 'snapshot' },
                writeConcern: { w: 'majority' },
                readPreference: 'primary',
                maxCommitTimeMS: 5000,
            });

            const result = await applyInTransaction(cmd, session);

            await session.commitTransaction();

            if (result.nextStatus === 'RTO_INITIATED' && result.shipmentId) {
                import('../dispute/dispute.service.js')
                    .then((m) => m.evaluateCprDisputeService(String(cmd.merchantId), String(result.shipmentId)))
                    .catch(() => {});
            }

            return result;
        } catch (err: any) {
            if (session.inTransaction()) {
                try {
                    await session.abortTransaction();
                } catch {
                    // Ignore abort error if MongoDB server already aborted the transaction
                }
            }

            // Fallback for standalone MongoDB instances that throw code 20
            if (isTransactionUnsupportedError(err)) {
                setTransactionsSupported(false);
                console.warn(
                    '[NDR Engine] Standalone MongoDB detected during transaction attempt. Switching to optimistic concurrency fallback.',
                );
                return await applyWithoutTransaction(cmd);
            }

            // Lost the race on eventKey or eventHash insert — another concurrent worker already ledgered it
            const lostEventKeyRace =
                err?.code === 11000 &&
                (err?.keyPattern?.eventKey ||
                    err?.keyPattern?.eventHash ||
                    (typeof err?.message === 'string' &&
                        (err.message.includes('eventKey') || err.message.includes('eventHash'))));

            if (lostEventKeyRace) {
                return {
                    disposition: 'DUPLICATE',
                    isDuplicate: true,
                };
            }

            // Version conflict, outbox upsert race, or transient transaction error: retry with fresh state
            const isConflict =
                err instanceof ConcurrencyConflict ||
                err?.code === 11000 ||
                err?.hasErrorLabel?.('TransientTransactionError') ||
                err?.hasErrorLabel?.('UnknownTransactionCommitResult');

            if (isConflict && attempt < MAX_ATTEMPTS) {
                await sleep(20 * attempt + Math.random() * 30);
                continue;
            }
            throw err;
        } finally {
            try {
                await session.endSession();
            } catch {
                // Ignore endSession error
            }
        }
    }

    throw new ConcurrencyConflict(`Exhausted retries for tracking number: ${cmd.trackingNumber}`);
}

async function applyWithoutTransaction(cmd: ApplyEventCommand): Promise<ApplyEventResult> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const result = await applyInTransaction(cmd, undefined);
            if (result.nextStatus === 'RTO_INITIATED' && result.shipmentId) {
                import('../dispute/dispute.service.js')
                    .then((m) => m.evaluateCprDisputeService(String(cmd.merchantId), String(result.shipmentId)))
                    .catch(() => {});
            }
            return result;
        } catch (err: any) {
            const lostEventKeyRace =
                err?.code === 11000 &&
                (err?.keyPattern?.eventKey ||
                    err?.keyPattern?.eventHash ||
                    (typeof err?.message === 'string' &&
                        (err.message.includes('eventKey') || err.message.includes('eventHash'))));

            if (lostEventKeyRace) {
                return {
                    disposition: 'DUPLICATE',
                    isDuplicate: true,
                };
            }

            // If an unexpected error or concurrency conflict occurred, delete our inserted event for this eventKey
            // so the next retry attempt can re-insert with the fresh state
            await ShipmentEvent.deleteOne({
                merchantId: cmd.merchantId,
                carrier: cmd.carrier,
                trackingNumber: cmd.trackingNumber,
                eventKey: cmd.event.eventKey,
            }).catch(() => {});

            const isConflict =
                err instanceof ConcurrencyConflict ||
                err?.code === 11000;

            if (isConflict && attempt < MAX_ATTEMPTS) {
                await sleep(20 * attempt + Math.random() * 30);
                continue;
            }
            throw err;
        }
    }

    throw new ConcurrencyConflict(`Exhausted retries for tracking number: ${cmd.trackingNumber}`);
}

//High-integrity event applier returning canonical Disposition string.

export async function applyEvent(cmd: ApplyEventCommand): Promise<Disposition> {
    const result = await applyEventDetailed(cmd);
    return result.disposition;
}

//Core transactional step executed with or without a MongoDB session transaction.

async function applyInTransaction(
    cmd: ApplyEventCommand,
    session?: ClientSession,
): Promise<ApplyEventResult> {
    const merchantObjectId =
        cmd.merchantId instanceof Types.ObjectId
            ? cmd.merchantId
            : new Types.ObjectId(cmd.merchantId);

    const batchObjectId = cmd.event.batchId
        ? cmd.event.batchId instanceof Types.ObjectId
            ? cmd.event.batchId
            : new Types.ObjectId(cmd.event.batchId)
        : undefined;

    const { carrier, trackingNumber, intent, event } = cmd;

    const findQuery = Shipment.findOne({
        merchantId: merchantObjectId,
        carrier,
        trackingNumber,
    });
    const current = await (session ? findQuery.session(session) : findQuery);

    const eventHash =
        cmd.event.eventHash && cmd.event.eventHash.length > 0
            ? cmd.event.eventHash
            : cmd.event.eventKey
                ? toEventHashBuffer(cmd.event.eventKey)
                : undefined;

    if (!current) {
        await ShipmentEvent.create(
            [
                {
                    ...event,
                    eventHash,
                    merchantId: merchantObjectId,
                    batchId: batchObjectId,
                    disposition: 'UNKNOWN_SHIPMENT',
                },
            ],
            session ? { session } : undefined,
        );
        return {
            disposition: 'UNKNOWN_SHIPMENT',
            isDuplicate: false,
        };
    }

    // Late carrier events must not rewind projection state (Spec §4.4)
    const outOfOrder =
        intent.kind === 'CARRIER_STATUS' &&
        current.lastCarrierEventAt != null &&
        event.occurredAt < current.lastCarrierEventAt;

    // Fast in-memory check replaces inside-transaction OutboxMessage query
    const ndrTemplateSent = Boolean(current.ndrTemplateDispatched);

    const decision = outOfOrder
        ? {
            next: current.status,
            effects: [] as Effect[],
            disposition: 'STALE_OUT_OF_ORDER' as Disposition,
        }
        : decide(current.status, intent, { ndrTemplateSent });

    const eventDocId = new Types.ObjectId();

    // Ledger insert is first write. E11000 here indicates duplicate event key.
    await ShipmentEvent.create(
        [
            {
                _id: eventDocId,
                ...event,
                eventHash,
                shipmentId: current._id,
                merchantId: merchantObjectId,
                batchId: batchObjectId,
                disposition: decision.disposition,
            },
        ],
        session ? { session } : undefined,
    );

    if (decision.disposition !== 'APPLIED') {
        return {
            disposition: decision.disposition,
            nextStatus: current.status,
            appliedEffects: [],
            isDuplicate: decision.disposition === 'DUPLICATE',
            shipmentId: current._id,
        };
    }

    const now = new Date();
    const has = (e: Effect) => decision.effects.includes(e);
    const nextAttempt = current.ndrAttempt + (has('INCREMENT_NDR_ATTEMPT') ? 1 : 0);

    const set: Record<string, unknown> = {
        status: decision.next,
        ndrAttempt: nextAttempt,
        updatedAt: now,
    };

    if (intent.kind === 'CARRIER_STATUS') {
        set.lastCarrierEventAt = event.occurredAt;
    }

    if (intent.kind === 'CUSTOMER_RESCHEDULE') {
        set.rescheduledDate = intent.date;
        if (intent.coordinates) {
            set.customerCoordinates = intent.coordinates;
        }
    }

    if (has('MARK_NEEDS_MANIFEST')) {
        set.needsManifest = true;
    }
    if (has('CLEAR_NEEDS_MANIFEST')) {
        set.needsManifest = false;
    }
    if (has('RETRACT_DISPUTE')) {
        set.disputeRetractionRequested = true;
        import('../utils/opsAlert.js').then((m) => {
            m.alertOps('DISPUTE_RETRACTION_REQUESTED', {
                carrier: current.carrier,
                trackingNumber: current.trackingNumber,
            }, {
                severity: 'WARNING',
                dedupeScope: `${current.carrier}:${current.trackingNumber}`,
                source: 'state_engine',
            });
        }).catch(() => {});
    }
    if (decision.next === 'RTO_INITIATED' && !set.settlementCutoff && !current.settlementCutoff) {
        const days = current.carrier === 'LEOPARDS' ? 14 : current.carrier === 'TRAX' ? 10 : 7;
        set.settlementCutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    }
    if (has('ENQUEUE_NDR_TEMPLATE')) {
        set.ndrTemplateDispatched = true;
        current.ndrTemplateDispatched = true;
    }

    // Optimistic concurrency guard: only update if stateVersion hasn't drifted
    const updateRes = await Shipment.updateOne(
        { _id: current._id, stateVersion: current.stateVersion },
        { $set: set, $inc: { stateVersion: 1 } },
        session ? { session } : undefined,
    );

    if (updateRes.matchedCount === 0) {
        if (!session) {
            await ShipmentEvent.deleteOne({ _id: eventDocId, merchantId: merchantObjectId }).catch(() => {});
        }
        throw new ConcurrencyConflict(`Version conflict on shipment ${trackingNumber}`);
    }

    // Outbox side effects executed inside the exact same database transaction
    if (has('PURGE_PENDING_OUTBOX')) {
        await OutboxMessage.updateMany(
            {
                shipmentId: current._id,
                status: 'PENDING',
                messageType: { $in: ['NDR_UTILITY_TEMPLATE', 'RTO_NOTICE'] },
            },
            { $set: { status: 'DISCARDED_STALE', updatedAt: now } },
            session ? { session } : undefined,
        );
    }

    if (has('ENQUEUE_NDR_TEMPLATE')) {
        await enqueueOutbox(
            current,
            'NDR_UTILITY_TEMPLATE',
            `${current._id}:NDR_UTILITY_TEMPLATE:${nextAttempt}`,
            {
                trackingNumber: current.trackingNumber,
                cod: current.orderValueCOD,
                ndrAttempt: nextAttempt,
                carrier: current.carrier,
            },
            session,
        );
    }

    if (has('ENQUEUE_RTO_NOTICE')) {
        await enqueueOutbox(
            current,
            'RTO_NOTICE',
            `${current._id}:RTO_NOTICE:${nextAttempt}`,
            {
                trackingNumber: current.trackingNumber,
                cod: current.orderValueCOD,
                ndrAttempt: nextAttempt,
                carrier: current.carrier,
            },
            session,
        );
    }

    if (has('ENQUEUE_DELIVERY_CORRECTION')) {
        // Scoped to nextAttempt so multiple reschedules across NDR cycles don't collide
        await enqueueOutbox(
            current,
            'DELIVERY_CORRECTION',
            `${current._id}:DELIVERY_CORRECTION:${nextAttempt}`,
            {
                trackingNumber: current.trackingNumber,
                cod: current.orderValueCOD,
                ndrAttempt: nextAttempt,
                carrier: current.carrier,
            },
            session,
        );
    }

    if (has('ENQUEUE_RESCHEDULE_CONFIRMATION')) {
        const rescheduledDateKey = set.rescheduledDate
            ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date(set.rescheduledDate as Date))
            : 'TBD';
        await enqueueOutbox(
            current,
            'RESCHEDULE_CONFIRMATION',
            `${current._id}:RESCHEDULE_CONFIRMATION:${nextAttempt}:${rescheduledDateKey}`,
            {
                trackingNumber: current.trackingNumber,
                cod: current.orderValueCOD,
                ndrAttempt: nextAttempt,
                carrier: current.carrier,
                rescheduledDate: rescheduledDateKey,
            },
            session,
        );
    }

    // Terminate any active customer conversation sessions if shipment moved out or terminal (B3-RC-03)
    if (has('CLEAR_NEEDS_MANIFEST') || isTerminal(decision.next)) {
        await ConversationSession.updateMany(
            { shipmentId: current._id, state: { $in: ACTIVE_CONVERSATION_STATES } },
            { $set: { state: 'DONE', updatedAt: now } },
            session ? { session } : undefined,
        ).catch(() => {});
    }

    return {
        disposition: 'APPLIED',
        nextStatus: decision.next,
        appliedEffects: decision.effects,
        isDuplicate: false,
        shipmentId: current._id,
    };
}

async function enqueueOutbox(
    shipment: IShipment,
    messageType: IOutboxMessage['messageType'],
    dedupeKey: string,
    payload: Record<string, unknown>,
    session?: ClientSession,
): Promise<void> {
    const now = new Date();

    // Single atomic upsert: reactivates DISCARDED_STALE or inserts PENDING message
    // Guard against overwriting active PROCESSING or already DISPATCHED messages (B2-RC-03)
    await OutboxMessage.updateOne(
        { dedupeKey, status: { $nin: ['DISPATCHED', 'PROCESSING'] } },
        {
            $set: {
                status: 'PENDING',
                scheduledFor: now,
                updatedAt: now,
            },
            $setOnInsert: {
                merchantId: shipment.merchantId,
                shipmentId: shipment._id,
                dedupeKey,
                channel: 'META_WHATSAPP',
                messageType,
                payload,
                attempts: 0,
                leaseVersion: 0,
                priorityScore: shipment.orderValueCOD,
            },
        },
        session ? { upsert: true, session } : { upsert: true },
    ).catch((err: any) => {
        // If status is DISPATCHED or PROCESSING, filter won't match and upsert throws E11000 on dedupeKey — safely ignore
        if (err?.code !== 11000) throw err;
    });
}