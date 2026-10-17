// src/models/InboundWaMessage.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IInboundWaMessage extends Document {
  wamid: string;
  receivedAt: Date;
}

const inboundWaMessageSchema = new Schema<IInboundWaMessage>(
  {
    wamid: {
      type: String,
      required: true,
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

export const InboundWaMessage = mongoose.model<IInboundWaMessage>(
  'InboundWaMessage',
  inboundWaMessageSchema,
);
