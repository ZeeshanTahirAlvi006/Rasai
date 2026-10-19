import mongoose, { type HydratedDocument, type InferSchemaType, type Model, Schema } from "mongoose"
import { BREAKER_STATES, CARRIERS, type Carrier } from "../types/index.js"


export type CarrierHealth = InferSchemaType<typeof carrierHealthSchema>
export type CarrierHealthDoc = HydratedDocument<CarrierHealth>

interface ICarrierHealthModel extends Model<CarrierHealth> {
  claimCanary(carrier: Carrier, canaryTimeOutMs?: number): Promise<CarrierHealthDoc | null>;
  recordFailure(carrier: Carrier, threshold: number, baseBackOffMs: number, errorCode?: string): Promise<CarrierHealthDoc | null>;
  recordSuccess(carrier: Carrier, isCanary?: boolean): Promise<CarrierHealthDoc | null>;
}

const carrierHealthSchema = new Schema({
  carrier: {
    type: String,
    required: [true, "Carrier is required"],
    enum: [...CARRIERS],
    immutable: true
  },
  state: {
    type: String,
    required: [true, "carrier state is required"],
    enum: [...BREAKER_STATES],
    default: "CLOSED"
  },
  failureCount: {
    type: Number,
    required: [true, "failure count is required"],
    default: 0
  },
  tripCount: {
    type: Number,
    required: [true, "trip count is required"],
    default: 0,
    min: [0, "trip count can not be less than 0"]
  }, lastFailureAt: {
    type: Date,
    default: undefined
  }, lastSuccessAt: {
    type: Date,
    default: undefined
  },
  lastTrippedAt: {
    type: Date,
    default: undefined
  },
  backOffUntil: {
    type: Date,
    default: undefined
  },
  lastCanaryAt: {
    type: Date,
    default: undefined
  },
  lastErrorCode: {
    type: String,
    default: undefined
  }
}, {
  timestamps: true,
  collection: "carrier_health",
  versionKey: false
})

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
    { returnDocument: 'after' },
  );
};

carrierHealthSchema.statics.recordFailure = async function (
  carrier: Carrier, threshold: number, baseBackOffMs: number, errorCode?: string) {
  const now = new Date();
  const doc = await this.findOneAndUpdate(
    { carrier },
    { $inc: { failureCount: 1 }, $set: { lastFailureAt: now, lastErrorCode: errorCode } },
    { returnDocument: 'after', upsert: true }
  );
  if (!doc) return null;

  const shouldTrip =
    doc.state === "HALF_OPEN" ||
    (doc.state === "CLOSED" && doc.failureCount >= threshold);

  if (shouldTrip) {
    const backoff = Math.min(baseBackOffMs * 2 ** doc.tripCount, 30 * 60_000);
    return (await this.findOneAndUpdate(
      { carrier, state: doc.state },
      {
        $set: {
          state: "OPEN",
          failureCount: 0,
          lastTrippedAt: now,
          backOffUntil: new Date(now.getTime() + backoff),
        },
        $inc: { tripCount: 1 }
      },
      { returnDocument: "after" }
    )) || doc;
  }
  return doc;
};

carrierHealthSchema.statics.recordSuccess = async function (carrier: Carrier, isCanary = false) {
  const filter: Record<string, unknown> = { carrier, state: { $ne: 'OPEN' } };
  if (!isCanary) {
    // Non-canary calls cannot transition a HALF_OPEN breaker to CLOSED (RC-06)
    filter.state = 'CLOSED';
  }
  return this.findOneAndUpdate(
    filter,
    {
      $set: { state: 'CLOSED', failureCount: 0, lastSuccessAt: new Date() },
      $unset: { backOffUntil: '', lastCanaryAt: '' }
    },
    { returnDocument: 'after', upsert: !isCanary }
  );
};

carrierHealthSchema.index({ carrier: 1 }, { unique: true, name: 'uniq_carrier' })
export const carrierHealthModel = (
  mongoose.models.CarrierHealth as ICarrierHealthModel) || (mongoose.model<CarrierHealth, ICarrierHealthModel>("CarrierHealth", carrierHealthSchema)
  )