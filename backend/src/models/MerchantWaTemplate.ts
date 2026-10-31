// src/models/MerchantWaTemplate.ts
import mongoose, { Schema, Document, Types } from 'mongoose';
import type { OutboxMessageType } from '../types';

export interface IMerchantWaTemplate extends Document {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  messageType: OutboxMessageType;
  templateName: string;
  languageCode: 'en_US' | 'ur' | string;
  headerType: 'NONE' | 'TEXT';
  headerText?: string;
  parameterBindings: string[];
  buttonPayloads?: {
    reschedule?: string;
    addressCorrection?: string;
    cancel?: string;
  };
  status: 'ACTIVE' | 'DISABLED';
  createdAt: Date;
  updatedAt: Date;
}

const merchantWaTemplateSchema = new Schema<IMerchantWaTemplate>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
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
    templateName: {
      type: String,
      required: true,
      trim: true,
    },
    languageCode: {
      type: String,
      required: true,
      default: 'en_US',
      trim: true,
    },
    headerType: {
      type: String,
      enum: ['NONE', 'TEXT'],
      default: 'NONE',
    },
    headerText: {
      type: String,
      trim: true,
      default: undefined,
    },
    parameterBindings: {
      type: [String],
      default: ['trackingNumber', 'orderValueCOD', 'carrier'],
    },
    buttonPayloads: {
      type: {
        reschedule: { type: String, default: 'ACTION_RESCHEDULE' },
        addressCorrection: { type: String, default: 'ACTION_CORRECTION' },
        cancel: { type: String, default: 'ACTION_CANCEL' },
      },
      _id: false,
      default: () => ({
        reschedule: 'ACTION_RESCHEDULE',
        addressCorrection: 'ACTION_CORRECTION',
        cancel: 'ACTION_CANCEL',
      }),
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'DISABLED'],
      default: 'ACTIVE',
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'merchant_wa_templates',
  },
);

merchantWaTemplateSchema.index(
  { merchantId: 1, messageType: 1 },
  { unique: true, name: 'uniq_merchant_wa_template' },
);

export const MerchantWaTemplate = mongoose.model<IMerchantWaTemplate>(
  'MerchantWaTemplate',
  merchantWaTemplateSchema,
);
