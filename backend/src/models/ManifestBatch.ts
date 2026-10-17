// src/models/ManifestBatch.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IManifestBatch extends Document {
  dateKey: string; // YYYY-MM-DD in Asia/Karachi
  stationCode: string;
  status: 'STARTED' | 'SENT' | 'FAILED';
  driveUrl?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const manifestBatchSchema = new Schema<IManifestBatch>(
  {
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
    driveUrl: {
      type: String,
      default: undefined,
    },
    sentAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
    collection: 'manifest_batches',
  },
);

// Indexes
// One manifest per station per day. Retried jobs skip stations already sent.
manifestBatchSchema.index(
  { dateKey: 1, stationCode: 1 },
  { unique: true, name: 'uniq_date_station' },
);

export const ManifestBatch = mongoose.model<IManifestBatch>('ManifestBatch', manifestBatchSchema);
