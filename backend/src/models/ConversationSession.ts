// src/models/ConversationSession.ts
import mongoose, { Schema, Document, Types } from 'mongoose';
import type { ConversationState, Coordinates } from '../types';

export interface IConversationSession extends Document {
  _id: Types.ObjectId;
  shipmentId: Types.ObjectId;
  customerPhoneHash: string;
  state: ConversationState;
  draft: {
    date?: Date;
    coordinates?: Coordinates;
  };
  ndrAttempt: number;
  lastInboundAt?: Date;
  expiresAt: Date;
}

const conversationSessionSchema = new Schema<IConversationSession>(
  {
    shipmentId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Shipment',
    },
    customerPhoneHash: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
      enum: [
        'AWAITING_CHOICE',
        'AWAITING_DATE',
        'AWAITING_LOCATION',
        'CONFIRMING',
        'DONE',
        'EXPIRED',
      ],
      default: 'AWAITING_CHOICE',
    },
    draft: {
      type: {
        date: { type: Date },
        coordinates: {
          type: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
          },
          _id: false,
        },
      },
      default: {},
      _id: false,
    },
    ndrAttempt: {
      type: Number,
      required: true,
    },
    lastInboundAt: {
      type: Date,
      default: undefined,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'conversation_sessions',
  },
);

// Indexes
// 1. Lookup active session by phone hash when an inbound WhatsApp message arrives.
conversationSessionSchema.index(
  { customerPhoneHash: 1, state: 1 },
  { name: 'idx_session_phone_state' },
);

// 2. Auto-expire stale sessions via MongoDB TTL index.
conversationSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: 'idx_session_ttl' },
);

export const ConversationSession = mongoose.model<IConversationSession>(
  'ConversationSession',
  conversationSessionSchema,
);
