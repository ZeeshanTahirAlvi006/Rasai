import crypto from 'crypto';
import mongoose, { Schema, Document, Types } from 'mongoose';
import type { Carrier, EventSource, Disposition } from '../types/index.js';

export function toEventHashBuffer(eventKey: string): Buffer {
  if (typeof eventKey === 'string' && /^[0-9a-fA-F]{64}$/.test(eventKey.trim())) {
    return Buffer.from(eventKey.trim(), 'hex').subarray(0, 16);
  }
  return crypto.createHash('sha256').update(String(eventKey || '')).digest().subarray(0, 16);
}

export interface IShipmentEvent extends Document {
  _id: Types.ObjectId;
  shipmentId?: Types.ObjectId;
  eventKey: string;
  eventHash?: Buffer;
  merchantId: Types.ObjectId;
  carrier: Carrier;
  trackingNumber: string;
  source: EventSource;
  rawStatus: string;
  rawRemarks: string;
  occurredAt: Date;
  batchId?: Types.ObjectId;
  disposition: Disposition;
  payload: Record<string, unknown>;
  createdAt: Date;
}

const shipmentEventSchema = new Schema<IShipmentEvent>(
  {
    shipmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Shipment',
      default: undefined,
    },
    eventKey: {
      type: String,
      required: true,
    },
    eventHash: {
      type: Buffer,
      required: true,
      default: function (this: any) {
        if (this.eventKey) {
          return toEventHashBuffer(this.eventKey);
        }
        return undefined;
      },
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    carrier: {
      type: String,
      required: true,
      enum: ['POSTEX', 'TRAX', 'LEOPARDS', 'TCS'],
    },
    trackingNumber: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      required: true,
      enum: ['CARRIER_POLL', 'CARRIER_WEBHOOK', 'FILE_IMPORT', 'CUSTOMER', 'MERCHANT'],
    },
    rawStatus: {
      type: String,
      required: true,
    },
    rawRemarks: {
      type: String,
      default: '',
    },
    occurredAt: {
      type: Date,
      required: true,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      default: undefined,
    },
    disposition: {
      type: String,
      required: true,
      enum: ['APPLIED', 'NOOP', 'STALE_REJECTED', 'STALE_OUT_OF_ORDER', 'UNKNOWN_SHIPMENT', 'DUPLICATE'],
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // append-only: no updatedAt
    collection: 'shipment_events',
  },
);

shipmentEventSchema.pre('validate', function (this: any) {
  if ((!this.eventHash || this.eventHash.length === 0) && this.eventKey) {
    this.eventHash = toEventHashBuffer(this.eventKey);
  }
});

// Indexes
// 1. Storage-layer deduplication & ledger audit: Parcel-localized compound unique index
shipmentEventSchema.index(
  { merchantId: 1, carrier: 1, trackingNumber: 1, eventHash: 1 },
  { unique: true, name: 'uniq_parcel_localized_event_hash' },
);

// 3. Ledger telemetry metrics & date-range aggregations
shipmentEventSchema.index(
  { merchantId: 1, occurredAt: -1 },
  { name: 'idx_merchant_occurred' },
);

// 4. Carrier-filtered telemetry metrics & historical queries
shipmentEventSchema.index(
  { merchantId: 1, carrier: 1, occurredAt: -1 },
  { name: 'idx_merchant_carrier_occurred' },
);

export const ShipmentEvent = mongoose.model<IShipmentEvent>('ShipmentEvent', shipmentEventSchema);
