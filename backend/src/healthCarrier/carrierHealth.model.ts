// src/healthCarrier/carrierHealth.model.ts
// Mongoose schema and atomic circuit breaker state methods (CLOSED, OPEN, HALF_OPEN) for carrier health.
import mongoose, { type HydratedDocument, type InferSchemaType, type Model, Schema } from 'mongoose';
import { BREAKER_STATES, CARRIERS, type Carrier } from '../types/index.js';
import { calculateBackOffWithJitter } from './carrierHealth.utils.js';

export type CarrierHealth = InferSchemaType<typeof carrierHealthSchema>;
export type CarrierHealthDoc = HydratedDocument<CarrierHealth>;

export interface RecordFailureModelOptions {
  forceImmediateTrip?: boolean;
  retryAfterMs?: number;
}

interface ICarrierHealthModel extends Model<CarrierHealth> {
  claimCanary(carrier: Carrier, canaryTimeOutMs?: number): Promise<CarrierHealthDoc | null>;
  recordFailure(
    carrier: Carrier,
    threshold: number,
    baseBackOffMs: number,
    errorCode?: string,
    options?: RecordFailureModelOptions
  ): Promise<CarrierHealthDoc | null>;
  recordSuccess(carrier: Carrier, isCanary?: boolean): Promise<CarrierHealthDoc | null>;
}

const carrierHealthSchema = new Schema(
  {
    carrier: {
      type: String,
      required: [true, 'Carrier is required'],
      enum: [...CARRIERS],
      immutable: true,
    },
    state: {
      type: String,
      required: [true, 'carrier state is required'],
      enum: [...BREAKER_STATES],
      default: 'CLOSED',
    },
    failureCount: {
      type: Number,
      required: [true, 'failure count is required'],
      default: 0,
    },
    tripCount: {
      type: Number,
      required: [true, 'trip count is required'],
      default: 0,
      min: [0, 'trip count can not be less than 0'],
    },
    lastFailureAt: {
      type: Date,
      default: undefined,
    },
    lastSuccessAt: {
      type: Date,
      default: undefined,
    },
    lastTrippedAt: {
      type: Date,
      default: undefined,
    },
    backOffUntil: {
      type: Date,
      default: undefined,
    },
    lastCanaryAt: {
      type: Date,
      default: undefined,
    },
    lastErrorCode: {
      type: String,
      default: undefined,
    },
  },
  {
    timestamps: true,
    collection: 'carrier_health',
    versionKey: false,
  }
);

carrierHealthSchema.statics.claimCanary = function (carrier: Carrier, canaryTimeOutMs = 30_000) {
  const now = new Date();
  return this.findOneAndUpdate(
    {
      carrier,
      $or: [
        { state: 'OPEN', backOffUntil: { $lte: now } },
        { state: 'HALF_OPEN', lastCanaryAt: { $lte: new Date(now.getTime() - canaryTimeOutMs) } },
      ],
    },
    { $set: { state: 'HALF_OPEN', failureCount: 0, lastCanaryAt: now } },
    { returnDocument: 'after' }
  );
};

carrierHealthSchema.statics.recordFailure = async function (
  carrier: Carrier,
  threshold: number,
  baseBackOffMs: number,
  errorCode?: string,
  options?: RecordFailureModelOptions
) {
  const now = new Date();
  const forceImmediate = Boolean(options?.forceImmediateTrip);

  // If immediate trip required (HTTP 429/403), perform atomic trip immediately (B4-RC-01)
  if (forceImmediate) {
    const existing = await this.findOne({ carrier }).select('tripCount state backOffUntil').lean().exec();
    const currentTripCount = existing?.tripCount ?? 0;
    const computedBackoff = calculateBackOffWithJitter(currentTripCount, baseBackOffMs);
    const finalBackoff = options?.retryAfterMs ? Math.max(options.retryAfterMs, computedBackoff) : computedBackoff;
    const backOffUntilDate = new Date(now.getTime() + finalBackoff);

    // If already OPEN, do not re-increment tripCount; extend backOffUntil if retryAfterMs extends it
    if (existing?.state === 'OPEN') {
      const existingBackOff = existing.backOffUntil ? new Date(existing.backOffUntil).getTime() : 0;
      if (backOffUntilDate.getTime() > existingBackOff) {
        return this.findOneAndUpdate(
          { carrier, state: 'OPEN' },
          {
            $set: {
              backOffUntil: backOffUntilDate,
              lastFailureAt: now,
              lastErrorCode: errorCode || 'IMMEDIATE_TRIP',
            },
          },
          { returnDocument: 'after' }
        );
      }
      return existing as any;
    }

    // Fence atomically on current state to prevent concurrent tripCount inflation (B4-RC-01)
    const filter = existing
      ? { carrier, state: existing.state }
      : { carrier };

    const tripped = await this.findOneAndUpdate(
      filter,
      {
        $set: {
          state: 'OPEN',
          failureCount: 0,
          lastFailureAt: now,
          lastTrippedAt: now,
          backOffUntil: backOffUntilDate,
          lastErrorCode: errorCode || 'IMMEDIATE_TRIP',
        },
        $inc: { tripCount: 1 },
      },
      { returnDocument: 'after', upsert: !existing }
    );

    return tripped || (await this.findOne({ carrier }));
  }

  // Standard threshold-based failure accumulation
  const doc = await this.findOneAndUpdate(
    { carrier },
    { $inc: { failureCount: 1 }, $set: { lastFailureAt: now, lastErrorCode: errorCode } },
    { returnDocument: 'after', upsert: true }
  );
  if (!doc) return null;

  const shouldTrip =
    doc.state === 'HALF_OPEN' ||
    (doc.state === 'CLOSED' && doc.failureCount >= threshold);

  if (shouldTrip) {
    const computedBackoff = calculateBackOffWithJitter(doc.tripCount, baseBackOffMs);
    const finalBackoff = options?.retryAfterMs ? Math.max(options.retryAfterMs, computedBackoff) : computedBackoff;

    // Fence atomically on current state to prevent double-increment (B4-RC-01)
    const tripped = await this.findOneAndUpdate(
      { carrier, state: doc.state },
      {
        $set: {
          state: 'OPEN',
          failureCount: 0,
          lastTrippedAt: now,
          backOffUntil: new Date(now.getTime() + finalBackoff),
        },
        $inc: { tripCount: 1 },
      },
      { returnDocument: 'after' }
    );
    // If another concurrent request tripped first, fetch latest doc so state is OPEN (B4-RC-01)
    return tripped || (await this.findOne({ carrier }));
  }
  return doc;
};

carrierHealthSchema.statics.recordSuccess = async function (carrier: Carrier, isCanary = false) {
  const filter: Record<string, unknown> = { carrier, state: { $ne: 'OPEN' } };
  if (!isCanary) {
    // Non-canary calls cannot transition a HALF_OPEN breaker to CLOSED (RC-06)
    filter.state = 'CLOSED';
  }

  const update: Record<string, unknown> = {
    $set: {
      state: 'CLOSED',
      failureCount: 0,
      lastSuccessAt: new Date(),
    },
    $unset: { backOffUntil: '', lastCanaryAt: '' },
  };

  if (isCanary) {
    // Reset tripCount on canary recovery so future backoffs do not stay pinned (B4-BUG-03)
    (update.$set as Record<string, unknown>).tripCount = 0;
  }

  return this.findOneAndUpdate(filter, update, { returnDocument: 'after', upsert: !isCanary });
};

carrierHealthSchema.index({ carrier: 1 }, { unique: true, name: 'uniq_carrier' });

export const carrierHealthModel =
  (mongoose.models.CarrierHealth as ICarrierHealthModel) ||
  mongoose.model<CarrierHealth, ICarrierHealthModel>('CarrierHealth', carrierHealthSchema);