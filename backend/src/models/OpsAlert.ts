// src/models/OpsAlert.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export type OpsAlertType =
  | 'WA_SPAM_RATE_LIMIT'
  | 'CIRCUIT_BREAKER_TRIPPED'
  | 'OUTBOX_BACKLOG_WARNING'
  | 'CRITICAL_DISPATCH_FAILURE'
  | 'CARRIER_BREAKER_OPEN'
  | 'DISPUTE_SETTLEMENT_CUTOFF_APPROACHING'
  | 'DISPUTE_RETRACTION_REQUESTED';

export type OpsAlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface IOpsAlert extends Document {
  _id: Types.ObjectId;
  type: OpsAlertType;
  severity: OpsAlertSeverity;
  source: string;
  dedupeScope: string;
  details: Record<string, unknown>;
  resolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const opsAlertSchema = new Schema<IOpsAlert>(
  {
    type: {
      type: String,
      required: true,
      enum: [
        'WA_SPAM_RATE_LIMIT',
        'CIRCUIT_BREAKER_TRIPPED',
        'OUTBOX_BACKLOG_WARNING',
        'CRITICAL_DISPATCH_FAILURE',
        'CARRIER_BREAKER_OPEN',
        'DISPUTE_SETTLEMENT_CUTOFF_APPROACHING',
        'DISPUTE_RETRACTION_REQUESTED',
      ],
      index: true,
    },
    severity: {
      type: String,
      required: true,
      enum: ['CRITICAL', 'WARNING', 'INFO'],
      default: 'WARNING',
    },
    source: {
      type: String,
      required: true,
      trim: true,
      default: 'system',
    },
    dedupeScope: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    resolved: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'ops_alerts',
  },
);

// 30-day TTL index to automatically purge historical alerts
opsAlertSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 86400, name: 'ttl_ops_alerts_30d' },
);

export const OpsAlert = mongoose.model<IOpsAlert>('OpsAlert', opsAlertSchema);
