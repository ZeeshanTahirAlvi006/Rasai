// src/models/MerchantCarrierCredential.ts
// Per-merchant encrypted carrier credentials, webhook configuration, and simulation flags.
import mongoose, { type Model, Schema, Types } from 'mongoose';
import { CARRIERS, type Carrier } from '../types/index.js';

export interface IMerchantCarrierCredential {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  carrier: Carrier;
  apiKeyEncrypted?: string;
  apiSecretEncrypted?: string;
  accountNumber?: string;
  webhookEnabled: boolean;
  webhookSecretEncrypted?: string;
  simulationMode: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const merchantCarrierCredentialSchema = new Schema<IMerchantCarrierCredential>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: [true, 'merchantId is required'],
      index: true,
    },
    carrier: {
      type: String,
      required: [true, 'carrier is required'],
      enum: [...CARRIERS],
    },
    apiKeyEncrypted: {
      type: String,
      default: undefined,
    },
    apiSecretEncrypted: {
      type: String,
      default: undefined,
    },
    accountNumber: {
      type: String,
      default: undefined,
    },
    webhookEnabled: {
      type: Boolean,
      default: false,
    },
    webhookSecretEncrypted: {
      type: String,
      default: undefined,
    },
    simulationMode: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'merchant_carrier_credentials',
  }
);

// Compound unique index per merchant + carrier
merchantCarrierCredentialSchema.index(
  { merchantId: 1, carrier: 1 },
  { unique: true, name: 'uniq_merchant_carrier_cred' }
);

export const MerchantCarrierCredential =
  (mongoose.models.MerchantCarrierCredential as Model<IMerchantCarrierCredential>) ||
  mongoose.model<IMerchantCarrierCredential>('MerchantCarrierCredential', merchantCarrierCredentialSchema);
