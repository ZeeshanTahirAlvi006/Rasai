// src/dispute/dispute.queue.ts
// BullMQ queue and repeatable scheduler for daily dispute settlement cutoff sweeps

import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { sweepExpiringDisputesService } from './dispute.service';
import { startDisputeWorker, closeDisputeWorker } from './dispute.worker';

export const DISPUTE_QUEUE_NAME = 'dispute-sweeper';

let disputeQueueInstance: Queue | null = null;
let disputeQueueConnection: any = null;

const isTestEnv = () => process.env.NODE_ENV === 'test' && !process.env.FORCE_REAL_REDIS;

export function getDisputeQueue(): Queue | null {
  if (isTestEnv()) {
    if (!disputeQueueInstance) {
      disputeQueueInstance = {
        add: async () => ({ id: 'mock-dispute-job' }),
        upsertJobScheduler: async () => {},
        close: async () => {},
      } as any;
    }
    return disputeQueueInstance as Queue;
  }

  if (!disputeQueueInstance) {
    disputeQueueConnection = createRedisConnection('dispute-queue');
    disputeQueueInstance = new Queue(DISPUTE_QUEUE_NAME, {
      connection: disputeQueueConnection,
      defaultJobOptions: {
        removeOnComplete: 30,
        removeOnFail: 50,
      },
    });
  }

  return disputeQueueInstance;
}

/**
 * Registers the daily repeatable dispute settlement sweeper at midnight (00:00 PKT).
 */
export async function scheduleDisputeSweeper(): Promise<void> {
  if (isTestEnv()) return;

  const queue = getDisputeQueue();
  if (!queue) return;

  try {
    await (queue as any).upsertJobScheduler(
      'dispute-cutoff-daily',
      { pattern: '0 0 * * *' },
      { name: 'dispute-cutoff-sweep', data: {} },
    );
  } catch (err: any) {
    console.warn('[DisputeQueue] Could not register job scheduler:', err?.message);
  }
}

/**
 * Triggers an immediate settlement cutoff sweep.
 */
export async function triggerDisputeSweepNow(): Promise<{ warnedCount: number; expiredCount: number }> {
  return (await sweepExpiringDisputesService()).data;
}

/**
 * Clean lifecycle shutdown for dispute queue and worker.
 */
export async function closeDisputeQueue(): Promise<void> {
  await closeDisputeWorker().catch(() => {});
  if (disputeQueueInstance) {
    try {
      await disputeQueueInstance.close();
    } catch {}
    disputeQueueInstance = null;
  }
  if (disputeQueueConnection) {
    try {
      await disputeQueueConnection.quit();
    } catch {}
    disputeQueueConnection = null;
  }
}
