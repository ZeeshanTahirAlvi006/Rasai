import mongoose, { Schema, Document, Types } from 'mongoose';
import type { Carrier } from '../types/index.js';

export type ImportBatchStatus =
  | 'PENDING_UPLOAD'   // Presigned URL issued, awaiting client upload & /commit
  | 'NORMALIZING'      // Streaming CSV from S3 into 500-row NDJSON.gz chunks
  | 'PROCESSING'       // Chunks actively being processed by vectorized workers
  | 'COMPLETED'        // completedChunks + failedChunks === totalChunks
  | 'FAILED';          // Unrecoverable file-level error (e.g. corrupt file / missing headers)

export interface IImportBatchError {
  row: number;
  trackingNumber?: string;
  reason: string;
}

export interface IImportBatch {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  carrier: Carrier;
  filename: string;
  s3SourceKey?: string;
  fileSizeBytes?: number;
  status: ImportBatchStatus;
  totalChunks: number;
  completedChunks: number;
  failedChunks: number;
  rowCount: number;
  applied: number;
  duplicates: number;
  rejected: number;
  noop: number;
  unknownShipments: number;
  errors: IImportBatchError[];
  fatalError?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const importBatchSchema = new Schema<IImportBatch>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    carrier: {
      type: String,
      required: true,
      enum: ['POSTEX', 'TRAX', 'LEOPARDS', 'TCS'],
    },
    filename: {
      type: String,
      required: true,
    },
    s3SourceKey: {
      type: String,
      default: undefined,
    },
    fileSizeBytes: {
      type: Number,
      default: undefined,
    },
    status: {
      type: String,
      required: true,
      enum: ['PENDING_UPLOAD', 'NORMALIZING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING_UPLOAD',
      index: true,
    },
    totalChunks: {
      type: Number,
      required: true,
      default: 0,
    },
    completedChunks: {
      type: Number,
      required: true,
      default: 0,
    },
    failedChunks: {
      type: Number,
      required: true,
      default: 0,
    },
    rowCount: {
      type: Number,
      required: true,
      default: 0,
    },
    applied: {
      type: Number,
      required: true,
      default: 0,
    },
    duplicates: {
      type: Number,
      required: true,
      default: 0,
    },
    rejected: {
      type: Number,
      required: true,
      default: 0,
    },
    noop: {
      type: Number,
      required: true,
      default: 0,
    },
    unknownShipments: {
      type: Number,
      required: true,
      default: 0,
    },
    errors: {
      type: [
        {
          row: { type: Number, required: true },
          trackingNumber: { type: String, default: undefined },
          reason: { type: String, required: true },
        },
      ],
      default: [],
    },
    fatalError: {
      type: String,
      default: undefined,
    },
    completedAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
    collection: 'import_batches',
  },
);

// Indexes
// 1. Merchant listing
importBatchSchema.index(
  { merchantId: 1, createdAt: -1 },
  { name: 'idx_import_merchant' },
);

// 2. Tenant status filtering
importBatchSchema.index(
  { merchantId: 1, status: 1, createdAt: -1 },
  { name: 'idx_import_tenant_status' },
);

export const ImportBatch = mongoose.model<IImportBatch>('ImportBatch', importBatchSchema);
