// src/manifestBatch/manifest.queue.ts
// BullMQ queue and repeatable scheduler for 07:30 PKT Courier Station Run-Sheet manifests.
import { Queue, Worker, type Job } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { compileAndSendManifests } from './manifest.worker';

export const MANIFEST_QUEUE_NAME = 'manifests';

let manifestQueueInstance: Queue | null = null;
let manifestWorkerInstance: Worker | null = null;
let manifestQueueConnection: any = null;
let manifestWorkerConnection: any = null;

const isTestEnv = () => process.env.NODE_ENV === 'test' && !process.env.FORCE_REAL_REDIS;

export function getManifestQueue(): Queue {
  if (isTestEnv()) {
    if (!manifestQueueInstance) {
      manifestQueueInstance = {
        add: async () => ({ id: 'mock-manifest-job' }),
        upsertJobScheduler: async () => {},
        close: async () => {},
      } as any;
    }
    return manifestQueueInstance as Queue;
  }

  if (!manifestQueueInstance) {
    manifestQueueConnection = createRedisConnection('manifest-queue');
    manifestQueueInstance = new Queue(MANIFEST_QUEUE_NAME, {
      connection: manifestQueueConnection,
      defaultJobOptions: {
        attempts: 1, // Worker manages atomic retry leases in MongoDB (B3-RC-04)
        removeOnComplete: { age: 86400 * 7, count: 1000 },
        removeOnFail: { age: 86400 * 14, count: 1000 },
      },
    });
  }
  return manifestQueueInstance;
}

/**
 * Registers BullMQ repeatable job scheduler for 07:30 PKT daily manifest compilation (Spec §8.1).
 */
export async function scheduleManifestJob(queue?: Queue): Promise<void> {
  if (isTestEnv()) return;

  const q = queue || getManifestQueue();
  try {
    await q.upsertJobScheduler(
      'run-sheet-0730',
      { pattern: '30 7 * * *', tz: 'Asia/Karachi' },
      { name: 'compile-manifests', data: {} },
    );
  } catch (err: any) {
    console.warn('[ManifestQueue] Failed to register 07:30 PKT scheduler:', err.message);
  }
}

export function startManifestWorker(concurrency = 1): Worker {
  if (isTestEnv()) {
    return {
      close: async () => {},
      on: () => {},
    } as any;
  }

  if (!manifestWorkerInstance) {
    manifestWorkerConnection = createRedisConnection('manifest-worker');
    manifestWorkerInstance = new Worker(
      MANIFEST_QUEUE_NAME,
      async (_job: Job) => {
        await compileAndSendManifests();
      },
      {
        connection: manifestWorkerConnection,
        concurrency,
      },
    );

    manifestWorkerInstance.on('error', (err) => {
      console.error('[ManifestWorker] Worker error:', err);
    });
  }
  return manifestWorkerInstance;
}

export async function closeManifestQueue(): Promise<void> {
  if (manifestWorkerInstance) {
    await manifestWorkerInstance.close();
    manifestWorkerInstance = null;
  }
  if (manifestWorkerConnection) {
    try {
      await manifestWorkerConnection.quit();
    } catch {
      manifestWorkerConnection.disconnect();
    }
    manifestWorkerConnection = null;
  }
  if (manifestQueueInstance) {
    await manifestQueueInstance.close();
    manifestQueueInstance = null;
  }
  if (manifestQueueConnection) {
    try {
      await manifestQueueConnection.quit();
    } catch {
      manifestQueueConnection.disconnect();
    }
    manifestQueueConnection = null;
  }
}
