import { z } from 'zod';
import { CARRIERS } from '../types/index.js';

const SOURCES = ['CARRIER_POLL', 'CARRIER_WEBHOOK', 'FILE_IMPORT', 'CUSTOMER', 'MERCHANT'] as const;
const DISPOSITIONS = ['APPLIED', 'NOOP', 'STALE_REJECTED', 'STALE_OUT_OF_ORDER', 'UNKNOWN_SHIPMENT', 'DUPLICATE'] as const;
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

// Schema for single event row validation
export const RecordShipmentEventRowSchema = z.object({
  carrier: z.enum(CARRIERS as unknown as [string, ...string[]]),
  trackingNumber: z.string().trim().min(1, 'trackingNumber is required'),
  source: z.enum(SOURCES),
  rawStatus: z.string().trim().optional(),
  rawRemarks: z.string().trim().optional(),
  occurredAt: z.union([z.string(), z.date()]).optional(),
  carrierEventId: z.string().trim().optional(),
  batchId: z.string().regex(objectIdRegex, 'Invalid batchId ObjectId').optional(),
  intent: z
    .object({
      kind: z.string(),
    })
    .passthrough()
    .optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  payLoad: z.record(z.string(), z.unknown()).optional(),
});

// Schema for POST /api/shipment-events (single event ingestion)
export const RecordShipmentEventSchema = z.object({
  body: RecordShipmentEventRowSchema,
});

// Schema for POST /api/shipment-events/bulk (batch ingestion up to 500)
export const BulkRecordEventsSchema = z.object({
  body: z.object({
    events: z
      .array(RecordShipmentEventRowSchema)
      .min(1, 'At least 1 event is required')
      .max(500, 'Batch size cannot exceed 500 events'),
    batchId: z.string().regex(objectIdRegex, 'Invalid batchId ObjectId').optional(),
  }),
});

// Schema for GET /api/shipment-events (paginated audit query)
export const ListShipmentEventsSchema = z.object({
  query: z
    .object({
      cursor: z.string().regex(objectIdRegex, 'Invalid cursor ObjectId').optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
      carrier: z.enum(CARRIERS as unknown as [string, ...string[]]).optional(),
      trackingNumber: z.string().trim().optional(),
      source: z.enum(SOURCES).optional(),
      disposition: z.enum(DISPOSITIONS).optional(),
      batchId: z.string().regex(objectIdRegex, 'Invalid batchId ObjectId').optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
    .optional(),
});

// Schema for GET /api/shipment-events/timeline/:carrier/:trackingNumber
export const GetShipmentTimelineSchema = z.object({
  params: z.object({
    carrier: z.enum(CARRIERS as unknown as [string, ...string[]]),
    trackingNumber: z.string().trim().min(1, 'trackingNumber is required'),
  }),
});

// Schema for GET /api/shipment-events/metrics
export const GetLedgerMetricsSchema = z.object({
  query: z
    .object({
      carrier: z.enum(CARRIERS as unknown as [string, ...string[]]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
    .optional(),
});
