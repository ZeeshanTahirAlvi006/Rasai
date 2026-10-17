// src/shipment/shipment.schema.ts
import { z } from 'zod';
import { CARRIERS } from '../types/index.js';

const STATUSES = [
  'BOOKED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'NDR_ACTIVE',
  'RESOLVED_RESCHEDULED',
  'RTO_INITIATED',
  'RTO_DELIVERED',
  'DELIVERED',
  'CANCELLED',
] as const;

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const BulkCreateShipmentsSchema = z.object({
  body: z.object({
    shipments: z
      .array(
        z.object({
          carrier: z.enum(CARRIERS as unknown as [string, ...string[]]),
          trackingNumber: z.string().trim().min(1, 'trackingNumber is required'),
          customerPhone: z.string().trim().min(1, 'customerPhone is required'),
          orderValueCOD: z.number().min(0, 'orderValueCOD must be >= 0').optional(),
          destinationStationCode: z.string().trim().optional(),
        }),
      )
      .min(1, 'At least 1 shipment is required')
      .max(500, 'Batch size cannot exceed 500 shipments'),
  }),
});

export const ListShipmentsSchema = z.object({
  query: z
    .object({
      cursor: z.string().regex(objectIdRegex, 'Invalid cursor ObjectId').optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
      status: z
        .union([
          z.enum(STATUSES),
          z.array(z.enum(STATUSES)),
          z.string().transform((val) => val.split(',') as (typeof STATUSES)[number][]),
        ])
        .optional(),
      carrier: z.enum(CARRIERS as unknown as [string, ...string[]]).optional(),
      trackingHealth: z.enum(['HEALTHY', 'DEGRADED']).optional(),
      needsManifest: z.coerce.boolean().optional(),
      trackingNumber: z.string().trim().optional(),
    })
    .optional(),
});

export const GetShipmentSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid shipment ID'),
  }),
});

export const UpdateShipmentSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid shipment ID'),
  }),
  body: z.object({
    expectedVersion: z.number().int().min(0, 'expectedVersion must be >= 0'),
    customerPhone: z.string().trim().min(1).optional(),
    orderValueCOD: z.number().min(0).optional(),
    destinationStationCode: z.string().trim().optional(),
  }),
});

export const CancelShipmentSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid shipment ID'),
  }),
});
