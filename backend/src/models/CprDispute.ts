// src/models/CprDispute.ts
// Mongoose model for CPR Margin Defense dispute packages, 5-signal scores, and audit evidence

import { Schema, model, Document, Types } from 'mongoose';
import type { Carrier } from '../types';

export type CprBand = 'STRONG' | 'MEDIUM' | 'WEAK';
export type CprDisputeStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'SUBMITTED'
  | 'SETTLED'
  | 'REJECTED'
  | 'RETRACTED'
  | 'EXPIRED';

export interface ICprSignalResult {
  points: number;
  maxPoints: number;
  passed: boolean;
  details: string;
}

export interface ICprSignalBreakdown {
  noCallEvidence: ICprSignalResult;
  customerConfirmed: ICprSignalResult;
  addressContradicts: ICprSignalResult;
  timingDiscrepancy: ICprSignalResult;
  insideCutoff: ICprSignalResult;
}

export interface ICprDispute {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  shipmentId: Types.ObjectId;
  carrier: Carrier;
  trackingNumber: string;
  claimAmount: number;
  cprScore: number;
  cprBand: CprBand;
  breakdown: ICprSignalBreakdown;
  status: CprDisputeStatus;
  stateVersion: number;
  settlementCutoff: Date;
  disputeRetractionRequested: boolean;
  retractionReason?: string;
  submittedAt?: Date;
  settledAt?: Date;
  settlementAmount?: number;
  notes?: string;
  evidenceSnapshot: {
    ledgerEvents: Array<{
      eventKey: string;
      rawStatus: string;
      disposition: string;
      occurredAt: Date;
    }>;
    conversationSummary?: {
      state: string;
      requestedRescheduleDate?: Date;
      location?: { lat: number; lng: number };
    };
    callLogMatches: Array<{
      callTimestamp: Date;
      durationSeconds: number;
      callStatus: string;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CprDisputeDocument extends ICprDispute, Document {}

const signalResultSchema = new Schema<ICprSignalResult>(
  {
    points: { type: Number, required: true, default: 0 },
    maxPoints: { type: Number, required: true },
    passed: { type: Boolean, required: true, default: false },
    details: { type: String, required: true, default: '' },
  },
  { _id: false },
);

const breakdownSchema = new Schema<ICprSignalBreakdown>(
  {
    noCallEvidence: { type: signalResultSchema, required: true },
    customerConfirmed: { type: signalResultSchema, required: true },
    addressContradicts: { type: signalResultSchema, required: true },
    timingDiscrepancy: { type: signalResultSchema, required: true },
    insideCutoff: { type: signalResultSchema, required: true },
  },
  { _id: false },
);

const evidenceSnapshotSchema = new Schema(
  {
    ledgerEvents: [
      {
        eventKey: { type: String, required: true },
        rawStatus: { type: String, required: true },
        disposition: { type: String, required: true },
        occurredAt: { type: Date, required: true },
      },
    ],
    conversationSummary: {
      state: { type: String },
      requestedRescheduleDate: { type: Date },
      location: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    callLogMatches: [
      {
        callTimestamp: { type: Date, required: true },
        durationSeconds: { type: Number, required: true },
        callStatus: { type: String, required: true },
      },
    ],
  },
  { _id: false },
);

const cprDisputeSchema = new Schema<CprDisputeDocument>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    shipmentId: { type: Schema.Types.ObjectId, ref: 'Shipment', required: true },
    carrier: {
      type: String,
      enum: ['POSTEX', 'TRAX', 'LEOPARDS', 'TCS'],
      required: true,
    },
    trackingNumber: { type: String, required: true, trim: true },
    claimAmount: { type: Number, required: true, default: 0 },
    cprScore: { type: Number, required: true, min: 0, max: 100, default: 0 },
    cprBand: {
      type: String,
      enum: ['STRONG', 'MEDIUM', 'WEAK'],
      required: true,
      default: 'WEAK',
    },
    breakdown: { type: breakdownSchema, required: true },
    status: {
      type: String,
      enum: [
        'DRAFT',
        'PENDING_REVIEW',
        'SUBMITTED',
        'SETTLED',
        'REJECTED',
        'RETRACTED',
        'EXPIRED',
      ],
      required: true,
      default: 'DRAFT',
    },
    stateVersion: { type: Number, required: true, default: 1 },
    settlementCutoff: { type: Date, required: true },
    disputeRetractionRequested: { type: Boolean, required: true, default: false },
    retractionReason: { type: String },
    submittedAt: { type: Date },
    settledAt: { type: Date },
    settlementAmount: { type: Number },
    notes: { type: String },
    evidenceSnapshot: { type: evidenceSnapshotSchema, required: true },
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true,
  },
);

// Unique compound index: one dispute per shipment per merchant (B5-RC-01)
cprDisputeSchema.index({ merchantId: 1, shipmentId: 1 }, { unique: true });

// Filter index for status and CPR band querying
cprDisputeSchema.index({ merchantId: 1, status: 1, cprBand: 1 });

// Index for cutoff tracking and daily sweeper (B5-BN-01)
cprDisputeSchema.index({ merchantId: 1, settlementCutoff: 1, status: 1 });

// Carrier tracking number lookup
cprDisputeSchema.index({ merchantId: 1, carrier: 1, trackingNumber: 1 });

// 180-day TTL index on terminal disputes (B5-ML-02)
cprDisputeSchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 15552000,
    partialFilterExpression: { status: { $in: ['SETTLED', 'EXPIRED', 'RETRACTED'] } },
  },
);

export const CprDispute = model<CprDisputeDocument>('CprDispute', cprDisputeSchema);
