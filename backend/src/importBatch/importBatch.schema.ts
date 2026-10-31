// src/importBatch/importBatch.schema.ts
// Zod request validation schemas for CSV import batch presigning, commit, and status endpoints.
import { z } from 'zod';
import { CARRIERS } from '../types/index.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const PresignedUrlSchema = z.object({
  body: z.object({
    filename: z
      .string({ message: 'filename is required' })
      .trim()
      .min(1, 'filename cannot be empty')
      .max(255, 'filename cannot exceed 255 characters')
      .refine((val) => val.toLowerCase().endsWith('.csv'), 'Only .csv files are supported'),
    carrier: z.enum(CARRIERS as unknown as [string, ...string[]], {
      message: `Invalid carrier. Supported: ${CARRIERS.join(', ')}`,
    }),
  }),
});

export const CommitImportSchema = z.object({
  params: z.object({
    batchId: z.string().regex(objectIdRegex, 'Invalid batchId ObjectId format'),
  }),
});

export const GetImportBatchSchema = z.object({
  params: z.object({
    batchId: z.string().regex(objectIdRegex, 'Invalid batchId ObjectId format'),
  }),
});

export const ListImportBatchesSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    cursor: z.string().regex(objectIdRegex, 'Invalid cursor ObjectId').optional(),
    status: z
      .enum(['PENDING_UPLOAD', 'NORMALIZING', 'PROCESSING', 'COMPLETED', 'FAILED'])
      .optional(),
  }),
});
