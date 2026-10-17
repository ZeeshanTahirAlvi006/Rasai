// src/models/Shipment.ts
import mongoose, { Schema, Document, Types } from 'mongoose';
import type { Carrier, Status, DisputeStatus, TrackingHealth, Coordinates } from '../types';

export interface IShipment extends Document {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  carrier: Carrier;
  trackingNumber: string;
  status: Status;
  stateVersion: number;
  ndrAttempt: number;
  lastCarrierEventAt?: Date;
  orderValueCOD: number;
  customerPhone: string;
  customerPhoneHash: string;
  customerCoordinates?: Coordinates;
  rescheduledDate?: Date;
  destinationStationCode?: string;
  needsManifest: boolean;
  lastManifestedAt?: Date;
  ndrTemplateDispatched: boolean;
  disputeStatus: DisputeStatus;
  disputeRetractionRequested: boolean;
  settlementCutoff?: Date;
  callLogAttempts: number;
  trackingHealth: TrackingHealth;
  lastPolledAt?: Date;
  updatedAt: Date;
}

const shipmentSchema = new Schema<IShipment>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    carrier: {
      type: String,
      required: true,
      enum: ['POSTEX', 'TRAX', 'LEOPARDS', 'TCS'],
    },
    trackingNumber: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: [
        'BOOKED',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'NDR_ACTIVE',
        'RESOLVED_RESCHEDULED',
        'RTO_INITIATED',
        'RTO_DELIVERED',
        'DELIVERED',
        'CANCELLED',
      ],
      default: 'BOOKED',
    },
    stateVersion: {
      type: Number,
      required: true,
      default: 0,
    },
    ndrAttempt: {
      type: Number,
      required: true,
      default: 0,
    },
    lastCarrierEventAt: {
      type: Date,
      default: undefined,
    },
    orderValueCOD: {
      type: Number,
      required: true,
      default: 0,
    },
    customerPhone: {
      type: String,
      required: true,
    },
    customerPhoneHash: {
      type: String,
      required: true,
    },
    customerCoordinates: {
      type: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
      default: undefined,
      _id: false,
    },
    rescheduledDate: {
      type: Date,
      default: undefined,
    },
    destinationStationCode: {
      type: String,
      default: undefined,
    },
    needsManifest: {
      type: Boolean,
      required: true,
      default: false,
    },
    ndrTemplateDispatched: {
      type: Boolean,
      required: true,
      default: false,
    },
    lastManifestedAt: {
      type: Date,
      default: undefined,
    },
    disputeStatus: {
      type: String,
      enum: ['NONE', 'PENDING', 'SUBMITTED', 'RETRACTED', 'SETTLED'],
      default: 'NONE',
    },
    disputeRetractionRequested: {
      type: Boolean,
      default: false,
    },
    settlementCutoff: {
      type: Date,
      default: undefined,
    },
    callLogAttempts: {
      type: Number,
      default: 0,
    },
    trackingHealth: {
      type: String,
      enum: ['HEALTHY', 'DEGRADED'],
      default: 'HEALTHY',
    },
    lastPolledAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
    collection: 'shipments',
  },
);

// Indexes
// 1. Primary lookup & uniqueness: Every query resolves through this compound key.
shipmentSchema.index(
  { merchantId: 1, carrier: 1, trackingNumber: 1 },
  { unique: true, name: 'uniq_merchant_carrier_tracking' },
);

// 2. Poller selection: find shipments due for a poll by status and recency.
shipmentSchema.index(
  { status: 1, lastPolledAt: 1 },
  { name: 'idx_poller_selection' },
);

// 3. Manifest job: find parcels that need a run-sheet, grouped by carrier & station.
shipmentSchema.index(
  { needsManifest: 1, carrier: 1, destinationStationCode: 1 },
  { name: 'idx_manifest_selection' },
);

// 4. Conversation lookup by phone hash (WhatsApp inbound).
shipmentSchema.index(
  { customerPhoneHash: 1, status: 1 },
  { name: 'idx_phone_hash_status' },
);

// 5. Merchant dashboard: cursor pagination by _id within a merchant.
shipmentSchema.index(
  { merchantId: 1, _id: -1 },
  { name: 'idx_merchant_cursor' },
);

export const Shipment = mongoose.model<IShipment>('Shipment', shipmentSchema);
export { Shipment as ShipmentModel };
