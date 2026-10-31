// src/healthCarrier/carrierHealth.schema.ts
// Zod request validation schemas for carrier route parameters, breaker overrides, poller controls, and webhook simulations.
import { z } from 'zod';
import { CARRIERS } from '../types/index.js';

// Reusable carrier parameter schema
export const CarrierParamSchema = z.object({
  params: z.object({
    carrier: z.enum(CARRIERS as unknown as [string, ...string[]], {
      error: 'Invalid carrier',
    }),
  }),
});

// Record failure schema POST
export const RecordFailureSchema = z.object({
  params: z.object({
    carrier: z.enum(CARRIERS as unknown as [string, ...string[]], {
      error: 'Invalid carrier',
    }),
  }),
  body: z.object({
    threshold: z.number().int().positive().optional(),
    baseBackOffMs: z.number().int().positive().optional(),
    errorCode: z.string().optional(),
  }).optional(),
});

// Execute under breaker schema POST
export const ExecuteBreakerSchema = z.object({
  params: z.object({
    carrier: z.enum(CARRIERS as unknown as [string, ...string[]], {
      error: 'invalid carrier',
    }),
  }).strict(),
  body: z.object({
    simulateFailure: z.boolean().default(false).optional(),
    useFallback: z.boolean().default(false).optional(),
    simulate429: z.boolean().default(false).optional(),
    simulate403: z.boolean().default(false).optional(),
  }).optional(),
});

// Track shipment schema POST
export const TrackShipmentSchema = z.object({
  body: z.object({
    carrier: z.enum(CARRIERS as unknown as [string, ...string[]], {
      error: 'invalid carrier',
    }),
    trackingNumber: z.string().trim().min(1, 'tracking number is required'),
    merchantId: z.string().trim().optional(),
  }).strict(),
});

// Trigger poller sweep schema POST
export const TriggerPollerSchema = z.object({
  body: z.object({
    carrier: z.enum(CARRIERS as unknown as [string, ...string[]]).optional(),
    force: z.boolean().optional(),
  }).optional(),
});

// Upsert carrier credentials schema POST
export const UpsertCredentialSchema = z.object({
  body: z.object({
    carrier: z.enum(CARRIERS as unknown as [string, ...string[]], {
      error: 'Invalid carrier',
    }),
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    accountNumber: z.string().optional(),
    webhookEnabled: z.boolean().optional(),
    webhookSecret: z.string().optional(),
    simulationMode: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
});

// Simulate webhook schema POST
export const SimulateWebhookSchema = z.object({
  body: z.object({
    carrier: z.enum(CARRIERS as unknown as [string, ...string[]], {
      error: 'Invalid carrier',
    }),
    trackingNumber: z.string().trim().min(1, 'trackingNumber is required'),
    rawStatus: z.string().trim().min(1, 'rawStatus is required'),
    rawRemarks: z.string().optional(),
    merchantId: z.string().optional(),
    occurredAt: z.union([z.string(), z.date()]).optional(),
  }),
});
