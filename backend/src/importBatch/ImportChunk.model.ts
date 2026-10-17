import mongoose, { Schema, Types } from 'mongoose';
import type { Carrier } from '../types/index.js';

export type ImportChunkStatus = 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface IImportChunk {
  _id: Types.ObjectId;
  batchId: Types.ObjectId;
  merchantId: Types.ObjectId;
  carrier: Carrier;
  chunkIndex: number;
  s3ChunkKey: string;
  startRow: number;
  rowCount: number;
  status: ImportChunkStatus;
  attempts: number;
  applied: number;
  duplicates: number;
  rejected: number;
  noop: number;
  unknownShipments: number;
  error?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const importChunkSchema = new Schema<IImportChunk>(
  {
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'ImportBatch',
      required: true,
      index: true,
    },
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
    chunkIndex: {
      type: Number,
      required: true,
    },
    s3ChunkKey: {
      type: String,
      required: true,
    },
    startRow: {
      type: Number,
      required: true,
      default: 1,
    },
    rowCount: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    attempts: {
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
    error: {
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
    collection: 'import_chunks',
  },
);

// Indexes
// 1. Unique per batch + chunkIndex: guarantees normalizer retries are 100% idempotent
importChunkSchema.index(
  { batchId: 1, chunkIndex: 1 },
  { unique: true, name: 'uniq_batch_chunk_idx' },
);

// 2. Pump claim index: find next PENDING chunk for a batch in O(1)
importChunkSchema.index(
  { batchId: 1, status: 1, chunkIndex: 1 },
  { name: 'idx_chunk_pump_claim' },
);

export const ImportChunk = mongoose.model<IImportChunk>('ImportChunk', importChunkSchema);
