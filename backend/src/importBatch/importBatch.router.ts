import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import {
  createPresignedUploadUrlController,
  commitImportBatchController,
  getImportBatchStatusController,
  listImportBatchesController,
} from './importBatch.controller.js';
import {
  PresignedUrlSchema,
  CommitImportSchema,
  GetImportBatchSchema,
  ListImportBatchesSchema,
} from './importBatch.schema.js';

const importBatchRouter = Router();

// Authentication required across all endpoints
importBatchRouter.use(requireAuth);

// 1. Create presigned upload URL
importBatchRouter.post(
  '/presigned-url',
  validate(PresignedUrlSchema),
  createPresignedUploadUrlController,
);

// 2. Commit uploaded file to trigger streaming normalization
importBatchRouter.post(
  '/:batchId/commit',
  validate(CommitImportSchema),
  commitImportBatchController,
);

// 3. Get batch status and live chunk progress
importBatchRouter.get(
  '/:batchId',
  validate(GetImportBatchSchema),
  getImportBatchStatusController,
);

// 4. List merchant import batches
importBatchRouter.get(
  '/',
  validate(ListImportBatchesSchema),
  listImportBatchesController,
);

export default importBatchRouter;
