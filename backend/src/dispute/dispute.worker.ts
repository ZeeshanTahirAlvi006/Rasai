// src/dispute/dispute.worker.ts
// BullMQ worker executing daily settlement cutoff sweeps and warning notifications

import { Worker, type Job } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { sweepExpiringDisputesService } from './dispute.service';

export const DISPUTE_SWEEPER_QUEUE_NAME = 'dispute-sweeper';

let disputeWorkerInstance: Worker | null = null;
let disputeWorkerConnection: any = null;

const isTestEnv = () => process.env.NODE_ENV === 'test' && !process.env.FORCE_REAL_REDIS;

export function startDisputeWorker(): Worker | null {
  if (isTestEnv()) return null;

  if (!disputeWorkerInstance) {
    disputeWorkerConnection = createRedisConnection('dispute-worker');
    disputeWorkerInstance = new Worker(
      DISPUTE_SWEEPER_QUEUE_NAME,
      async (job: Job) => {
        try {
          const result = await sweepExpiringDisputesService();
          return result.data;
        } catch (err: any) {
          console.error('[DisputeWorker] Error during cutoff sweep:', err?.message);
          throw err;
        }
      },
      {
        connection: disputeWorkerConnection,
        concurrency: 1,
      },
    );

    disputeWorkerInstance.on('completed', (job) => {
      console.log(`[DisputeWorker] Completed job ${job.id}`);
    });

    disputeWorkerInstance.on('failed', (job, err) => {
      console.error(`[DisputeWorker] Job ${job?.id} failed:`, err?.message);
    });
  }

  return disputeWorkerInstance;
}

export async function closeDisputeWorker(): Promise<void> {
  if (disputeWorkerInstance) {
    try {
      await disputeWorkerInstance.close();
    } catch {}
    disputeWorkerInstance = null;
  }
  if (disputeWorkerConnection) {
    try {
      await disputeWorkerConnection.quit();
    } catch {}
    disputeWorkerConnection = null;
  }
}
