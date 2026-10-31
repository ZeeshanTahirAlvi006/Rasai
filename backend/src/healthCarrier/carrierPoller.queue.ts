// src/healthCarrier/carrierPoller.queue.ts
// BullMQ queue and repeatable scheduler for 5-minute adaptive carrier polling sweeps.
import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import {
  startCarrierPollerWorker,
  closeCarrierPollerWorker,
  runAdaptivePollingSweep,
  type AdaptiveSweepOptions,
} from './carrierPoller.worker.js';

export const CARRIER_POLLER_QUEUE_NAME = 'carrier-poller';

let pollerQueueInstance: Queue | null = null;
let pollerQueueConnection: any = null;

const isTestEnv = () => process.env.NODE_ENV === 'test' && !process.env.FORCE_REAL_REDIS;

export function getCarrierPollerQueue(): Queue | null {
  if (isTestEnv()) {
    if (!pollerQueueInstance) {
      pollerQueueInstance = {
        add: async () => ({ id: 'mock-poller-job' }),
        upsertJobScheduler: async () => {},
        close: async () => {},
      } as any;
    }
    return pollerQueueInstance as Queue;
  }

  if (!pollerQueueInstance) {
    pollerQueueConnection = createRedisConnection('carrier-poller-queue');
    pollerQueueInstance = new Queue(CARRIER_POLLER_QUEUE_NAME, {
      connection: pollerQueueConnection,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });
  }

  return pollerQueueInstance;
}

/**
 * Registers the 5-minute repeatable poller sweep in BullMQ (Spec §5.3).
 */
export async function scheduleCarrierPoller(): Promise<void> {
  if (isTestEnv()) return;

  const queue = getCarrierPollerQueue();
  if (!queue) return;

  try {
    await (queue as any).upsertJobScheduler(
      'adaptive-poller-5m',
      { pattern: '*/5 * * * *' },
      { name: 'adaptive-sweep', data: {} }
    );
  } catch (err: any) {
    console.warn('[CarrierPollerQueue] Failed to register 5m scheduler:', err.message);
  }
}

/**
 * Manually enqueues or directly executes an adaptive polling sweep (e.g., from Console).
 */
export async function triggerCarrierPollerSweep(
  options: AdaptiveSweepOptions = {}
) {
  if (isTestEnv()) {
    const result = await runAdaptivePollingSweep(options);
    return {
      enqueued: false,
      result,
    };
  }

  const queue = getCarrierPollerQueue();
  if (queue) {
    const job = await queue.add('manual-adaptive-sweep', options, { priority: 1 });
    return {
      enqueued: true,
      jobId: job.id,
      options,
    };
  }

  const result = await runAdaptivePollingSweep(options);
  return {
    enqueued: false,
    result,
  };
}

export async function closeCarrierPollerQueue(): Promise<void> {
  if (pollerQueueInstance) {
    await pollerQueueInstance.close();
    pollerQueueInstance = null;
  }
  if (pollerQueueConnection) {
    try {
      await pollerQueueConnection.quit();
    } catch {
      pollerQueueConnection.disconnect();
    }
    pollerQueueConnection = null;
  }
}

/**
 * Graceful lifecycle shutdown for both poller worker and queue (B4-ML-02).
 */
export async function closeCarrierPoller(): Promise<void> {
  await closeCarrierPollerWorker().catch(() => {});
  await closeCarrierPollerQueue().catch(() => {});
}
