// src/models/CdrRecord.ts
// Mongoose model for ingested Call Detail Records (CDR) used to verify courier call attempts

import { Schema, model, Document, Types } from 'mongoose';

export type CdrCallStatus = 'ANSWERED' | 'MISSED' | 'BUSY' | 'FAILED';

export interface ICdrRecord {
  merchantId: Types.ObjectId;
  fileHash: string;
  callerPhone: string;
  recipientPhoneHash: string;
  callTimestamp: Date;
  durationSeconds: number;
  callStatus: CdrCallStatus;
  createdAt: Date;
}

export interface CdrRecordDocument extends ICdrRecord, Document {}

const cdrRecordSchema = new Schema<CdrRecordDocument>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fileHash: { type: String, required: true, index: true },
    callerPhone: { type: String, required: true, trim: true },
    recipientPhoneHash: { type: String, required: true },
    callTimestamp: { type: Date, required: true },
    durationSeconds: { type: Number, required: true, default: 0 },
    callStatus: {
      type: String,
      enum: ['ANSWERED', 'MISSED', 'BUSY', 'FAILED'],
      required: true,
      default: 'ANSWERED',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    suppressReservedKeysWarning: true,
  },
);

// Compound index for matching courier attempt window by phone hash (B5-BN-01)
cdrRecordSchema.index({ merchantId: 1, recipientPhoneHash: 1, callTimestamp: 1 });

// Index for batch upload deduplication
cdrRecordSchema.index({ merchantId: 1, fileHash: 1 });

// 90-day TTL index on CDR records to prevent storage bloat (B5-ML-01)
cdrRecordSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export const CdrRecord = model<CdrRecordDocument>('CdrRecord', cdrRecordSchema);
