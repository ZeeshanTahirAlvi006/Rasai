import { Queue, Worker, type Job } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import { processImportChunk } from './importBatch.worker.js';

export const BULK_IMPORT_QUEUE_NAME = 'bulk-import';

let bulkImportQueueInstance: Queue | null = null;
let bulkImportWorkerInstance: Worker | null = null;

export function getBulkImportQueue(): Queue {
  if (!bulkImportQueueInstance) {
    const connection = createRedisConnection('bulk-import-queue');
    bulkImportQueueInstance = new Queue(BULK_IMPORT_QUEUE_NAME, {
      connection,
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
  if (!bulkImportWorkerInstance) {
    const connection = createRedisConnection('bulk-import-worker');
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
        connection,
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
  if (bulkImportQueueInstance) {
    await bulkImportQueueInstance.close();
    bulkImportQueueInstance = null;
  }
}
