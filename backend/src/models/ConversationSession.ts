// src/models/ConversationSession.ts
import mongoose, { Schema, Document, Types } from 'mongoose';
import type { ConversationState, Coordinates } from '../types';
import { ACTIVE_CONVERSATION_STATES } from '../types';

export type ConversationPendingAction = 'RESCHEDULE' | 'CANCEL';

export interface IConversationTurn {
  direction: 'INBOUND' | 'OUTBOUND';
  text: string;
  messageType: string;
  wamid?: string;
  simulated?: boolean;
  timestamp: Date;
}

export interface IConversationSession extends Document {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  shipmentId: Types.ObjectId;
  customerPhoneHash: string;
  state: ConversationState;
  stateVersion: number;
  draft: {
    date?: Date;
    coordinates?: Coordinates;
    pendingAction?: ConversationPendingAction;
    correctionRecorded?: boolean;
  };
  ndrAttempt: number;
  templateWamid?: string;
  messages: IConversationTurn[];
  lastInboundAt?: Date;
  // 24h WhatsApp customer-service window; free-form replies only allowed before this
  windowExpiresAt: Date;
  // 30d retention horizon for the TTL index — keeps DONE sessions as CPR evidence (B3-BUG-04)
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Bounded transcript: older turns are trimmed with $slice so the doc never bloats (B3-ML-01)
export const MAX_CONVERSATION_TURNS = 30;
export const CONVERSATION_WINDOW_MS = 24 * 60 * 60 * 1000;
export const CONVERSATION_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const conversationTurnSchema = new Schema<IConversationTurn>(
  {
    direction: { type: String, enum: ['INBOUND', 'OUTBOUND'], required: true },
    text: { type: String, required: true, maxlength: 2000 },
    messageType: { type: String, required: true },
    wamid: { type: String },
    simulated: { type: Boolean, default: undefined },
    timestamp: { type: Date, required: true },
  },
  { _id: false },
);

const conversationSessionSchema = new Schema<IConversationSession>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
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
    stateVersion: {
      type: Number,
      required: true,
      default: 0,
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
        pendingAction: { type: String, enum: ['RESCHEDULE', 'CANCEL'] },
        correctionRecorded: { type: Boolean },
      },
      default: {},
      _id: false,
    },
    ndrAttempt: {
      type: Number,
      required: true,
    },
    templateWamid: {
      type: String,
      default: undefined,
    },
    messages: {
      type: [conversationTurnSchema],
      default: [],
    },
    lastInboundAt: {
      type: Date,
      default: undefined,
    },
    windowExpiresAt: {
      type: Date,
      required: true,
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
  { customerPhoneHash: 1, state: 1, windowExpiresAt: -1 },
  { name: 'idx_session_phone_state_window' },
);

// 2. Prevent concurrent active sessions for the same parcel (RC-05)
conversationSessionSchema.index(
  { shipmentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      state: { $in: ACTIVE_CONVERSATION_STATES },
    },
    name: 'uniq_active_session_shipment',
  },
);

// 3. Merchant console listing (newest first, optionally by state)
conversationSessionSchema.index(
  { merchantId: 1, state: 1, updatedAt: -1 },
  { name: 'idx_session_merchant_state_updated' },
);

// 4. Retention TTL: 30 days so DONE sessions survive for dispute evidence (B3-BUG-04)
conversationSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: 'idx_session_ttl' },
);

export const ConversationSession = mongoose.model<IConversationSession>(
  'ConversationSession',
  conversationSessionSchema,
);
