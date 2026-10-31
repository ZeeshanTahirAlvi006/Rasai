// src/outbox/outbox.queue.ts
import { Queue, Worker, type Job } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { processOutboxMessage } from './outbox.worker';

export const OUTBOX_QUEUE_NAME = 'outbox-dispatch';

let outboxQueueInstance: Queue | null = null;
let outboxWorkerInstance: Worker | null = null;
let outboxQueueConnection: any = null;
let outboxWorkerConnection: any = null;

const isTestEnv = () => process.env.NODE_ENV === 'test' && !process.env.FORCE_REAL_REDIS;

export function getOutboxQueue(): Queue {
  if (isTestEnv()) {
    if (!outboxQueueInstance) {
      outboxQueueInstance = {
        add: async () => ({ id: 'mock-outbox-job' }),
        addBulk: async (jobs: any[]) => jobs.map((_, i) => ({ id: `mock-job-${i}` })),
        close: async () => {},
      } as any;
    }
    return outboxQueueInstance as Queue;
  }

  if (!outboxQueueInstance) {
    outboxQueueConnection = createRedisConnection('outbox-dispatch-queue');
    outboxQueueInstance = new Queue(OUTBOX_QUEUE_NAME, {
      connection: outboxQueueConnection,
      defaultJobOptions: {
        attempts: 1, // Worker manages attempts directly in MongoDB via lease fencing
        removeOnComplete: { age: 86400, count: 5000 },
        removeOnFail: { age: 86400 * 7, count: 5000 },
      },
    });
  }
  return outboxQueueInstance;
}

export function startOutboxWorker(concurrency = 10): Worker {
  if (isTestEnv()) {
    return {
      close: async () => {},
      on: () => {},
    } as any;
  }

  if (!outboxWorkerInstance) {
    outboxWorkerConnection = createRedisConnection('outbox-dispatch-worker');
    outboxWorkerInstance = new Worker(
      OUTBOX_QUEUE_NAME,
      async (job: Job) => {
        const { messageId, leaseVersion } = job.data;
        await processOutboxMessage(messageId, leaseVersion);
      },
      {
        connection: outboxWorkerConnection,
        concurrency,
      },
    );

    outboxWorkerInstance.on('error', (err) => {
      console.error('[OutboxWorker] Worker error:', err);
    });
  }
  return outboxWorkerInstance;
}

export async function closeOutboxQueue(): Promise<void> {
  if (outboxWorkerInstance) {
    await outboxWorkerInstance.close();
    outboxWorkerInstance = null;
  }
  if (outboxWorkerConnection) {
    try {
      await outboxWorkerConnection.quit();
    } catch {
      outboxWorkerConnection.disconnect();
    }
    outboxWorkerConnection = null;
  }
  if (outboxQueueInstance) {
    await outboxQueueInstance.close();
    outboxQueueInstance = null;
  }
  if (outboxQueueConnection) {
    try {
      await outboxQueueConnection.quit();
    } catch {
      outboxQueueConnection.disconnect();
    }
    outboxQueueConnection = null;
  }
}
