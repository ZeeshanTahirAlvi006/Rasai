// src/models/OutboxMessage.ts
import mongoose, { Schema, Document, Types } from 'mongoose';
import type { OutboxChannel, OutboxMessageType, OutboxStatus } from '../types';

export interface IOutboxMessage extends Document {
  _id: Types.ObjectId;
  shipmentId: Types.ObjectId;
  merchantId: Types.ObjectId;
  recipientPhone?: string;
  recipientPhoneHash?: string;
  dedupeKey: string;
  channel: OutboxChannel;
  messageType: OutboxMessageType;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  scheduledFor: Date;
  leaseUntil?: Date;
  attempts: number;
  providerMessageId?: string;
  lastError?: { code?: number; message: string };
  priorityScore: number;
  createdAt: Date;
  updatedAt: Date;
}

const outboxMessageSchema = new Schema<IOutboxMessage>(
  {
    shipmentId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Shipment',
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientPhone: {
      type: String,
      trim: true,
    },
    recipientPhoneHash: {
      type: String,
      trim: true,
    },
    dedupeKey: {
      type: String,
      required: true,
    },
    channel: {
      type: String,
      required: true,
      enum: ['META_WHATSAPP', 'CARRIER_API', 'EMAIL'],
    },
    messageType: {
      type: String,
      required: true,
      enum: [
        'NDR_UTILITY_TEMPLATE',
        'RTO_NOTICE',
        'DELIVERY_CORRECTION',
        'RESCHEDULE_CONFIRMATION',
        'REATTEMPT_DISPATCH',
      ],
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'PROCESSING', 'DISPATCHED', 'DISCARDED_STALE', 'FAILED'],
      default: 'PENDING',
    },
    scheduledFor: {
      type: Date,
      required: true,
    },
    leaseUntil: {
      type: Date,
      default: undefined,
    },
    attempts: {
      type: Number,
      required: true,
      default: 0,
    },
    providerMessageId: {
      type: String,
      default: undefined,
    },
    lastError: {
      type: {
        code: { type: Number },
        message: { type: String, required: true },
      },
      default: undefined,
      _id: false,
    },
    priorityScore: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'outbox_messages',
  },
);

// Indexes
// 1. Outbox deduplication: Prevents replayed transitions from creating a second message.
outboxMessageSchema.index({ dedupeKey: 1 }, { unique: true, name: 'uniq_dedupe_key' });

// 2. Expired lease reaper: find PROCESSING messages whose lease expired
outboxMessageSchema.index(
  { status: 1, leaseUntil: 1 },
  { name: 'idx_outbox_lease_reap' },
);

// 3. High-throughput ESR claim index with priority sorting
outboxMessageSchema.index(
  { status: 1, priorityScore: -1, scheduledFor: 1 },
  { name: 'idx_outbox_priority_claim' },
);

// 4. High-throughput ESR claim index with tenant isolation & priority sorting
outboxMessageSchema.index(
  { status: 1, channel: 1, merchantId: 1, priorityScore: -1, scheduledFor: 1 },
  { name: 'idx_outbox_tenant_priority_claim' },
);

// 4. Pre-flight lookup: check if an NDR template was already dispatched for this shipment.
outboxMessageSchema.index(
  { shipmentId: 1, messageType: 1, status: 1 },
  { name: 'idx_outbox_shipment_type_status' },
);

// 5. 14-day TTL index to automatically purge terminal messages
outboxMessageSchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 14 * 86400,
    partialFilterExpression: { status: { $in: ['DISPATCHED', 'DISCARDED_STALE'] } },
    name: 'ttl_outbox_terminal_cleanup',
  },
);

export const OutboxMessage = mongoose.model<IOutboxMessage>('OutboxMessage', outboxMessageSchema);
