// src/manifestBatch/ManifestBatch.ts
import mongoose, { Schema, Document, Types } from 'mongoose';
import type { Carrier } from '../types';

export interface IManifestBatch extends Document {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  carrier: Carrier;
  dateKey: string; // YYYY-MM-DD in Asia/Karachi
  stationCode: string;
  status: 'STARTED' | 'SENT' | 'FAILED';
  leaseUntil?: Date;
  // Fences completion so a stalled worker cannot overwrite a reclaimed lease (B3-RC-04)
  claimToken?: Types.ObjectId;
  parcelCount: number;
  shipmentIds: Types.ObjectId[];
  totalCOD: number;
  recipientEmail?: string;
  driveUrl?: string;
  pdfStorageKey?: string;
  csvStorageKey?: string;
  emailDelivered?: boolean;
  sentAt?: Date;
  error?: string;
  runCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const manifestBatchSchema = new Schema<IManifestBatch>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    carrier: {
      type: String,
      required: true,
      enum: ['POSTEX', 'TRAX', 'LEOPARDS', 'TCS'],
    },
    dateKey: {
      type: String,
      required: true,
    },
    stationCode: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['STARTED', 'SENT', 'FAILED'],
      default: 'STARTED',
    },
    leaseUntil: {
      type: Date,
      default: undefined,
    },
    claimToken: {
      type: Schema.Types.ObjectId,
      default: undefined,
    },
    parcelCount: {
      type: Number,
      required: true,
      default: 0,
    },
    shipmentIds: {
      type: [Schema.Types.ObjectId],
      default: [],
    },
    totalCOD: {
      type: Number,
      required: true,
      default: 0,
    },
    recipientEmail: {
      type: String,
      default: undefined,
    },
    driveUrl: {
      type: String,
      default: undefined,
    },
    pdfStorageKey: {
      type: String,
      default: undefined,
    },
    csvStorageKey: {
      type: String,
      default: undefined,
    },
    emailDelivered: {
      type: Boolean,
      default: undefined,
    },
    sentAt: {
      type: Date,
      default: undefined,
    },
    error: {
      type: String,
      default: undefined,
    },
    runCount: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'manifest_batches',
  },
);

// Indexes
// 1. One manifest per tenant, carrier, station and PKT day (B3-RC-04)
manifestBatchSchema.index(
  { merchantId: 1, carrier: 1, dateKey: 1, stationCode: 1 },
  { unique: true, name: 'uniq_merchant_carrier_date_station' },
);

// 2. Merchant console history (newest first)
manifestBatchSchema.index(
  { merchantId: 1, createdAt: -1 },
  { name: 'idx_manifest_merchant_created' },
);

// 3. 90-day retention (B3-ML-04)
manifestBatchSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 86400, name: 'ttl_manifest_batches_90d' },
);

export const ManifestBatch = mongoose.model<IManifestBatch>('ManifestBatch', manifestBatchSchema);
