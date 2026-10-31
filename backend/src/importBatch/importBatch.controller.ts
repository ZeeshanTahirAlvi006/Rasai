// src/importBatch/importBatch.controller.ts
// Thin Express controller for CSV import batch presigning, commit triggers, status, and history.
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  createPresignedUploadUrlService,
  commitImportBatchService,
  getImportBatchStatusService,
  listImportBatchesService,
} from './importBatch.service.js';

export const createPresignedUploadUrlController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const result = await createPresignedUploadUrlService(merchantId, req.body);
    return res.status(result.status).json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error,
    });
  },
);

export const commitImportBatchController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const batchId = String(req.params.batchId);
    const result = await commitImportBatchService(merchantId, batchId);
    return res.status(result.status).json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error,
    });
  },
);

export const getImportBatchStatusController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const batchId = String(req.params.batchId);
    const result = await getImportBatchStatusService(merchantId, batchId);
    return res.status(result.status).json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error,
    });
  },
);

export const listImportBatchesController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const query = res.locals.query || req.query;
    const result = await listImportBatchesService(merchantId, {
      limit: query.limit ? Number(query.limit) : undefined,
      cursor: query.cursor as string | undefined,
      status: query.status as any,
    });
    return res.status(result.status).json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error,
    });
  },
);
