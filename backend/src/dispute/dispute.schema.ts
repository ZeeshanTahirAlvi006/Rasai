// src/dispute/dispute.schema.ts
// Zod request validation schemas for CPR Margin Defense endpoints

import { z } from 'zod';

const CARRIERS = ['POSTEX', 'TRAX', 'LEOPARDS', 'TCS'] as const;
const CPR_BANDS = ['STRONG', 'MEDIUM', 'WEAK'] as const;
const DISPUTE_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'SUBMITTED',
  'SETTLED',
  'REJECTED',
  'RETRACTED',
  'EXPIRED',
] as const;

export const ListDisputesSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    status: z.enum(DISPUTE_STATUSES).optional(),
    carrier: z.enum(CARRIERS).optional(),
    cprBand: z.enum(CPR_BANDS).optional(),
    search: z.string().max(100).optional(),
  }),
});

export const DisputeIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Dispute ID is required'),
  }),
});

export const ShipmentIdParamSchema = z.object({
  params: z.object({
    shipmentId: z.string().min(1, 'Shipment ID is required'),
  }),
});

export const SubmitDisputeSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Dispute ID is required'),
  }),
  body: z.object({
    notes: z.string().max(1000).optional(),
  }),
});

export const SettleDisputeSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Dispute ID is required'),
  }),
  body: z.object({
    settlementAmount: z.number().min(0, 'Settlement amount must be non-negative'),
    notes: z.string().max(1000).optional(),
  }),
});

export const RetractDisputeSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Dispute ID is required'),
  }),
  body: z.object({
    reason: z.string().min(3, 'Retraction reason must be at least 3 characters'),
    notes: z.string().max(1000).optional(),
  }),
});

export const UploadCdrSchema = z.object({
  body: z.object({
    csvContent: z.string().min(10, 'CSV content is required'),
  }),
});
