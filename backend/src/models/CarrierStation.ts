// src/models/CarrierStation.ts
// Courier station contact directory used to route Tier 2 run-sheets (email)
// and Tier 3 one-click WhatsApp escalations (wa.me deep links).
import mongoose, { Schema, Document, Types } from 'mongoose';
import type { Carrier } from '../types';

export interface ICarrierStation extends Document {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  carrier: Carrier;
  stationCode: string;
  stationName: string;
  city?: string;
  managerEmail?: string;
  managerWhatsAppPhone?: string; // E.164 (+92XXXXXXXXXX)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const carrierStationSchema = new Schema<ICarrierStation>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    carrier: {
      type: String,
      required: true,
      enum: ['POSTEX', 'TRAX', 'LEOPARDS', 'TCS'],
    },
    stationCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    stationName: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
      default: undefined,
    },
    managerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: undefined,
    },
    managerWhatsAppPhone: {
      type: String,
      trim: true,
      default: undefined,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'carrier_stations',
  },
);

// One contact record per tenant + carrier + station
carrierStationSchema.index(
  { merchantId: 1, carrier: 1, stationCode: 1 },
  { unique: true, name: 'uniq_merchant_carrier_station' },
);

export const CarrierStation = mongoose.model<ICarrierStation>('CarrierStation', carrierStationSchema);
