// src/outbox/outbox.relay.ts
import { Types } from 'mongoose';
import type { Queue } from 'bullmq';
import { OutboxMessage } from '../models/OutboxMessage';
import { config } from '../config/index';

let relayTimer: NodeJS.Timeout | null = null;
let inFlightRelayPromise: Promise<number> | null = null;
let isStopping = false;

/**
 * Claims due PENDING messages and enqueues them for worker dispatch.
 * Fully vectorized: executes in O(1) database queries regardless of batch size (B2-BN-01).
 */
export async function relayOutbox(queue: Queue, batch = 50): Promise<number> {
  const now = new Date();
  const maxAttempts = config.outbox.maxAttempts || 5;
  const leaseMs = config.outbox.leaseMs || 60_000;

  // Phase 1a: Poison-Pill Reaper (B2-RC-01)
  // Expired PROCESSING messages with attempts >= maxAttempts fail permanently
  await OutboxMessage.updateMany(
    {
      status: 'PROCESSING',
      leaseUntil: { $lt: now },
      attempts: { $gte: maxAttempts },
    },
    {
      $set: {
        status: 'FAILED',
        lastError: { message: 'max_attempts_exceeded_on_lease_expiry' },
        updatedAt: now,
      },
      $unset: { leaseUntil: 1, relayClaimToken: 1 },
    },
  );

  // Phase 1b: Recoverable Lease Reaper (B2-RC-01)
  // Expired PROCESSING messages with attempts < maxAttempts revert to PENDING
  await OutboxMessage.updateMany(
    {
      status: 'PROCESSING',
      leaseUntil: { $lt: now },
      attempts: { $lt: maxAttempts },
    },
    {
      $set: { status: 'PENDING', updatedAt: now },
      $unset: { leaseUntil: 1, relayClaimToken: 1 },
    },
  );

  // Phase 2a: Query candidate documents using ESR index { status: 1, priorityScore: -1, scheduledFor: 1 }
  const candidateDocs = await OutboxMessage.find({
    status: 'PENDING',
    scheduledFor: { $lte: now },
  })
    .sort({ priorityScore: -1, scheduledFor: 1 })
    .limit(batch)
    .select('_id')
    .lean()
    .exec();

  if (candidateDocs.length === 0) {
    return 0;
  }

  const candidateIds = candidateDocs.map((d) => d._id);
  const relayClaimToken = new Types.ObjectId();
  const leaseUntil = new Date(now.getTime() + leaseMs);

  // Phase 2b: Atomic vectorized claim (B2-BN-01)
  await OutboxMessage.updateMany(
    {
      _id: { $in: candidateIds },
      status: 'PENDING',
    },
    {
      $set: {
        status: 'PROCESSING',
        leaseUntil,
        relayClaimToken,
        updatedAt: now,
      },
      $inc: { leaseVersion: 1 }, // Atomically bump lease generation counter (B2-RC-01)
    },
  );

  // Phase 2c: Retrieve the exact messages claimed by this worker
  const claimedMessages = await OutboxMessage.find({
    _id: { $in: candidateIds },
    status: 'PROCESSING',
    relayClaimToken,
  })
    .select('_id leaseVersion priorityScore')
    .lean()
    .exec();

  if (claimedMessages.length === 0) {
    return 0;
  }

  // Phase 3: Bulk enqueue with rollback protection (B2-RC-01)
  try {
    await queue.addBulk(
      claimedMessages.map((msg) => ({
        name: 'send-outbox',
        data: {
          messageId: String(msg._id),
          leaseVersion: msg.leaseVersion,
        },
        opts: {
          jobId: `${msg._id}-${msg.leaseVersion}`,
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      })),
    );
  } catch (queueErr) {
    // If Redis fails, roll back won documents to PENDING so they don't sit locked until lease expiry
    const rollbackIds = claimedMessages.map((m) => m._id);
    await OutboxMessage.updateMany(
      {
        _id: { $in: rollbackIds },
        status: 'PROCESSING',
        relayClaimToken,
      },
      {
        $set: { status: 'PENDING', updatedAt: new Date() },
        $unset: { leaseUntil: 1, relayClaimToken: 1 },
      },
    ).catch(() => {});
    throw queueErr;
  }

  return claimedMessages.length;
}

/**
 * Starts the periodic outbox relay daemon.
 */
export function startOutboxRelayDaemon(queue: Queue): void {
  if (relayTimer) return;
  isStopping = false;

  const intervalMs = config.outbox.relayIntervalMs || 3000;

  const tick = async () => {
    if (isStopping) return;
    if (inFlightRelayPromise) return; // Concurrency guard: wait for active tick to finish

    inFlightRelayPromise = relayOutbox(queue)
      .catch((err) => {
        console.error('[OutboxRelay] Error during relay tick:', err);
        return 0;
      })
      .finally(() => {
        inFlightRelayPromise = null;
      });
  };

  relayTimer = setInterval(tick, intervalMs);
  relayTimer.unref?.(); // Ensure timer does not prevent process exit (B2-ML-02)

  // Initial immediate tick
  void tick();
}

/**
 * Gracefully stops the relay daemon and awaits any in-flight database operations (B2-ML-02).
 */
export async function stopOutboxRelayDaemon(): Promise<void> {
  isStopping = true;
  if (relayTimer) {
    clearInterval(relayTimer);
    relayTimer = null;
  }

  if (inFlightRelayPromise) {
    await inFlightRelayPromise.catch(() => 0);
    inFlightRelayPromise = null;
  }
}
