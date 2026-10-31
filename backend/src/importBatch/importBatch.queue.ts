// src/importBatch/importBatch.queue.ts
// BullMQ queue and worker definitions for parallel background processing of imported CSV chunks.
import { Queue, Worker, type Job } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import { processImportChunk } from './importBatch.worker.js';

export const BULK_IMPORT_QUEUE_NAME = 'bulk-import';

let bulkImportQueueInstance: Queue | null = null;
let bulkImportWorkerInstance: Worker | null = null;
let bulkImportQueueConnection: any = null;
let bulkImportWorkerConnection: any = null;

const isTestEnv = () => process.env.NODE_ENV === 'test' && !process.env.FORCE_REAL_REDIS;

export function getBulkImportQueue(): Queue {
  if (isTestEnv()) {
    if (!bulkImportQueueInstance) {
      bulkImportQueueInstance = {
        add: async () => ({ id: 'mock-job-id' }),
        close: async () => {},
      } as any;
    }
    return bulkImportQueueInstance as Queue;
  }

  if (!bulkImportQueueInstance) {
    bulkImportQueueConnection = createRedisConnection('bulk-import-queue');
    bulkImportQueueInstance = new Queue(BULK_IMPORT_QUEUE_NAME, {
      connection: bulkImportQueueConnection,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: { age: 86400, count: 5000 },
        removeOnFail: { age: 86400 * 7, count: 5000 },
      },
    });
  }
  return bulkImportQueueInstance;
}

export function startBulkImportWorker(): Worker {
  if (isTestEnv()) {
    return {
      close: async () => {},
      on: () => {},
    } as any;
  }

  if (!bulkImportWorkerInstance) {
    bulkImportWorkerConnection = createRedisConnection('bulk-import-worker');
    bulkImportWorkerInstance = new Worker(
      BULK_IMPORT_QUEUE_NAME,
      async (job: Job) => {
        if (job.name === 'process-chunk') {
          const { chunkId } = job.data;
          try {
            await processImportChunk(chunkId);
          } catch (err: any) {
            if (err?.code === 'bulk_tenant_throttled' || err?.statusCode === 429 || err?.status === 429) {
              // Delay job by 5 seconds without consuming an attempt (RC-03)
              const token = job.token || 'worker_delay_token';
              await job.moveToDelayed(Date.now() + 5000, token);
              return;
            }
            throw err;
          }
        }
      },
      {
        connection: bulkImportWorkerConnection,
        concurrency: 5,
      },
    );

    bulkImportWorkerInstance.on('error', (err) => {
      console.error('[BulkImportWorker] Worker error:', err);
    });
  }
  return bulkImportWorkerInstance;
}

export async function closeBulkImportQueue(): Promise<void> {
  if (bulkImportWorkerInstance) {
    await bulkImportWorkerInstance.close();
    bulkImportWorkerInstance = null;
  }
  if (bulkImportWorkerConnection) {
    try {
      await bulkImportWorkerConnection.quit();
    } catch {
      bulkImportWorkerConnection.disconnect();
    }
    bulkImportWorkerConnection = null;
  }
  if (bulkImportQueueInstance) {
    await bulkImportQueueInstance.close();
    bulkImportQueueInstance = null;
  }
  if (bulkImportQueueConnection) {
    try {
      await bulkImportQueueConnection.quit();
    } catch {
      bulkImportQueueConnection.disconnect();
    }
    bulkImportQueueConnection = null;
  }
}
