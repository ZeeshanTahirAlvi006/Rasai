// src/healthCarrier/carrierPoller.worker.ts
// BullMQ worker and execution engine for adaptive carrier status polling with jittered cadences and batch pacing.
import { Worker, type Job } from 'bullmq';
import { Types } from 'mongoose';
import { CARRIERS, type Carrier, type Status } from '../types/index.js';
import { getCarrierAdapter, executeWithBreaker, ingestCarrierUpdatesForMerchant, checkAvailabilityService } from './carrierHealth.service.js';
import { getCarrierConfig } from './carrierCredentials.service.js';
import { selectDueForPoll } from '../shipment/shipment.service.js';
import { Shipment } from '../models/index.js';
import { createRedisConnection } from '../config/redis.js';

export const CADENCE_TIERS = {
  OFD: {
    name: 'OFD',
    statuses: ['OUT_FOR_DELIVERY'] as Status[],
    baseIntervalMs: 20 * 60_000, // 20 minutes
    jitterPercent: 0.1, // ±10%
  },
  ACTIVE_NDR: {
    name: 'ACTIVE_NDR',
    statuses: ['NDR_ACTIVE', 'RESOLVED_RESCHEDULED', 'RTO_INITIATED'] as Status[],
    baseIntervalMs: 60 * 60_000, // 1 hour
    jitterPercent: 0.1,
  },
  TRANSIT: {
    name: 'TRANSIT',
    statuses: ['IN_TRANSIT', 'BOOKED'] as Status[],
    baseIntervalMs: 6 * 60 * 60_000, // 6 hours
    jitterPercent: 0.1,
  },
};

const MAX_PARCELS_PER_TIER = 100; // Cap sweep memory spikes (B4-ML-04)

export function calculateCutoff(baseIntervalMs: number, jitterPercent = 0.1): Date {
  const minFactor = 1 - jitterPercent;
  const maxFactor = 1 + jitterPercent;
  const randomFactor = minFactor + Math.random() * (maxFactor - minFactor);
  const interval = Math.round(baseIntervalMs * randomFactor);
  return new Date(Date.now() - interval);
}

export interface AdaptiveSweepOptions {
  carrier?: Carrier;
  merchantId?: string;
  force?: boolean;
}

export interface SweepTelemetry {
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  carriersAttempted: Carrier[];
  parcelsPolledCount: number;
  updatesIngestedCount: number;
  skippedCircuitOpen: Carrier[];
  errors: Array<{ carrier: Carrier; message: string }>;
}

let lastSweepTelemetry: SweepTelemetry | null = null;
export function getLastSweepTelemetry(): SweepTelemetry | null {
  return lastSweepTelemetry;
}

/**
 * Executes a full adaptive polling sweep across active couriers and cadence tiers.
 */
export async function runAdaptivePollingSweep(
  options: AdaptiveSweepOptions = {}
): Promise<SweepTelemetry> {
  const startedAt = new Date();
  const targetCarriers = options.carrier ? [options.carrier] : [...CARRIERS];
  const telemetry: SweepTelemetry = {
    startedAt,
    finishedAt: new Date(),
    durationMs: 0,
    carriersAttempted: [],
    parcelsPolledCount: 0,
    updatesIngestedCount: 0,
    skippedCircuitOpen: [],
    errors: [],
  };

  for (const carrier of targetCarriers) {
    // 1. Check circuit breaker state first (skip if OPEN unless cooldown expired for canary)
    const availability = await checkAvailabilityService(carrier).catch(() => null);
    if (availability && !availability.data.isAvailable && !options.force) {
      telemetry.skippedCircuitOpen.push(carrier);
      continue;
    }

    const adapter = getCarrierAdapter(carrier);
    if (!adapter) continue;

    telemetry.carriersAttempted.push(carrier);

    for (const tierKey of Object.keys(CADENCE_TIERS) as Array<keyof typeof CADENCE_TIERS>) {
      const tier = CADENCE_TIERS[tierKey];
      const cutoff = options.force ? new Date() : calculateCutoff(tier.baseIntervalMs, tier.jitterPercent);

      try {
        // Pure ESR query using selectDueForPoll (B4-BN-02, B4-ML-04)
        const dueShipments = await selectDueForPoll(
          carrier,
          tier.statuses,
          cutoff,
          MAX_PARCELS_PER_TIER
        );

        if (!dueShipments || dueShipments.length === 0) continue;

        // Stamp lastPolledAt optimistically immediately to prevent double-polling race conditions (B4-RC-02)
        const dueIds = dueShipments.map((s) => s._id);
        const pollStamp = new Date();
        await Shipment.updateMany(
          { _id: { $in: dueIds } },
          { $set: { lastPolledAt: pollStamp } }
        ).exec();

        telemetry.parcelsPolledCount += dueShipments.length;

        // Group by merchantId
        const byMerchant = new Map<string, string[]>();
        for (const s of dueShipments) {
          const mId = s.merchantId ? s.merchantId.toString() : '';
          const list = byMerchant.get(mId) || [];
          list.push(s.trackingNumber);
          byMerchant.set(mId, list);
        }

        // Poll each merchant group respecting adapter batch limits and interval pacing (B4-BN-05)
        for (const [mId, trackingNumbers] of byMerchant.entries()) {
          const creds = await getCarrierConfig(carrier, mId);
          const maxBatch = adapter.limits?.maxBatch || 10;
          const minIntervalMs = adapter.limits?.minIntervalMs || 1000;

          for (let i = 0; i < trackingNumbers.length; i += maxBatch) {
            const chunk = trackingNumbers.slice(i, i + maxBatch);

            if (i > 0 && minIntervalMs > 0) {
              await new Promise((resolve) => setTimeout(resolve, minIntervalMs));
            }

            try {
              const updates = await executeWithBreaker(carrier, async () => {
                return await adapter.fetchUpdates(creds, chunk);
              });

              if (updates && updates.length > 0 && mId && Types.ObjectId.isValid(mId)) {
                const ingestResult = await ingestCarrierUpdatesForMerchant(
                  mId,
                  carrier,
                  updates,
                  'CARRIER_POLL'
                );
                telemetry.updatesIngestedCount += ingestResult.applied;
              }
            } catch (chunkErr: any) {
              telemetry.errors.push({
                carrier,
                message: chunkErr?.message || 'Error executing carrier batch poll',
              });
              // Stop polling further chunks for this carrier if circuit tripped
              if (chunkErr?.name === 'CircuitBreakerOpenError') {
                break;
              }
            }
          }
        }
      } catch (tierErr: any) {
        telemetry.errors.push({
          carrier,
          message: tierErr?.message || `Error sweeping tier ${tier.name}`,
        });
      }
    }
  }

  telemetry.finishedAt = new Date();
  telemetry.durationMs = telemetry.finishedAt.getTime() - startedAt.getTime();
  lastSweepTelemetry = telemetry;
  return telemetry;
}

// ── Poller Status Query Service ──
export async function getPollerStatusService() {
  const now = new Date();
  const tierStats: Record<string, { totalDue: number; statuses: Status[]; baseIntervalMinutes: number }> = {};

  for (const tierKey of Object.keys(CADENCE_TIERS) as Array<keyof typeof CADENCE_TIERS>) {
    const tier = CADENCE_TIERS[tierKey];
    const cutoff = new Date(now.getTime() - tier.baseIntervalMs);

    const count = await Shipment.countDocuments({
      status: { $in: tier.statuses },
      lastPolledAt: { $lt: cutoff },
    }).exec();

    tierStats[tierKey] = {
      totalDue: count,
      statuses: tier.statuses,
      baseIntervalMinutes: Math.round(tier.baseIntervalMs / 60_000),
    };
  }

  const degradedCount = await Shipment.countDocuments({
    status: { $nin: ['DELIVERED', 'CANCELLED', 'RTO_DELIVERED'] },
    trackingHealth: 'DEGRADED',
  }).exec();

  return {
    success: true,
    status: 200,
    message: 'Adaptive poller status retrieved',
    data: {
      tierStats,
      degradedShipmentsCount: degradedCount,
      lastSweep: lastSweepTelemetry,
    },
    error: null,
  };
}

// ── BullMQ Worker Setup ──
let pollerWorker: Worker | null = null;
let pollerWorkerConnection: any = null;

export function startCarrierPollerWorker(): Worker | null {
  if (pollerWorker) return pollerWorker;
  if (process.env.NODE_ENV === 'test' && !process.env.FORCE_REAL_REDIS) {
    return null;
  }

  pollerWorkerConnection = createRedisConnection('carrier-poller-worker');
  pollerWorker = new Worker(
    'carrier-poller',
    async (job: Job) => {
      const options: AdaptiveSweepOptions = job.data || {};
      return await runAdaptivePollingSweep(options);
    },
    {
      connection: pollerWorkerConnection,
      concurrency: 1, // Strict single-instance sweep per poller node
    }
  );

  pollerWorker.on('error', (err) => {
    console.error('[CarrierPollerWorker] Worker error:', err.message);
  });

  return pollerWorker;
}

export async function closeCarrierPollerWorker(): Promise<void> {
  if (pollerWorker) {
    await pollerWorker.close();
    pollerWorker = null;
  }
  if (pollerWorkerConnection) {
    try {
      await pollerWorkerConnection.quit();
    } catch {
      pollerWorkerConnection.disconnect();
    }
    pollerWorkerConnection = null;
  }
}

