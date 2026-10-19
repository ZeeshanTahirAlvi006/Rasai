// src/models/InboundWaMessage.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IInboundWaMessage extends Document {
  wamid: string;
  status: 'PROCESSING' | 'PROCESSED';
  leaseUntil?: Date;
  receivedAt: Date;
}

const inboundWaMessageSchema = new Schema<IInboundWaMessage>(
  {
    wamid: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['PROCESSING', 'PROCESSED'],
      default: 'PROCESSING',
    },
    leaseUntil: {
      type: Date,
      default: undefined,
    },
    receivedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
  },
  {
    timestamps: false,
    collection: 'inbound_wa_messages',
  },
);

// Indexes
// Unique on wamid: a duplicate insert means Meta redelivered. Catch E11000 → return 200.
inboundWaMessageSchema.index({ wamid: 1 }, { unique: true, name: 'uniq_wamid' });

// Auto-purge messages after 14 days
inboundWaMessageSchema.index(
  { receivedAt: 1 },
  { expireAfterSeconds: 14 * 86400, name: 'ttl_inbound_wa_14d' },
);

export const InboundWaMessage = mongoose.model<IInboundWaMessage>(
  'InboundWaMessage',
  inboundWaMessageSchema,
);
