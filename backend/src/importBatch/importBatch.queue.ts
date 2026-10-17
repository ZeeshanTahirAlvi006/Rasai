import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';

export const BULK_IMPORT_QUEUE_NAME = 'bulk-import';

let bulkImportQueueInstance: Queue | null = null;

export function getBulkImportQueue(): Queue {
  if (!bulkImportQueueInstance) {
    const connection = createRedisConnection('bulk-import-queue');
    bulkImportQueueInstance = new Queue(BULK_IMPORT_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
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

export async function closeBulkImportQueue(): Promise<void> {
  if (bulkImportQueueInstance) {
    await bulkImportQueueInstance.close();
    bulkImportQueueInstance = null;
  }
}
