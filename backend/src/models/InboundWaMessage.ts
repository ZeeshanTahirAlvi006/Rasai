// src/models/InboundWaMessage.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IInboundWaMessage extends Document {
  wamid: string;
  status: 'PROCESSING' | 'PROCESSED';
  leaseUntil?: Date;
  // Fences completion/release so a reclaimed lease is never closed by the stale holder (B3-RC-01)
  claimToken?: Types.ObjectId;
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
    claimToken: {
      type: Schema.Types.ObjectId,
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
// Unique on wamid: E11000 on claim means the message is PROCESSED or actively leased.
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
