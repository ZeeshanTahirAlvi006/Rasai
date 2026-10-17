import { Types } from 'mongoose';
import { ImportBatch, type IImportBatch, type ImportBatchStatus } from './ImportBatch.model.js';
import { getPresignedUploadUrl } from '../config/s3.js';
import { getBulkImportQueue } from './importBatch.queue.js';
import { processNormalizeCsvStream } from './importBatch.normalizer.js';
import { AppError } from '../middleware/error.js';
import type { Carrier } from '../types/index.js';

export interface ServiceResponse<T = any> {
  success: boolean;
  status: number;
  message: string;
  data: T;
  error: string | null;
}

export interface PresignedUrlResult {
  batchId: string;
  uploadUrl: string;
  s3Key: string;
  maxBytes: number;
  expiresInSeconds: number;
}

export interface ImportBatchProgressResult {
  batchId: string;
  carrier: Carrier;
  filename: string;
  status: ImportBatchStatus;
  progressPercent: number;
  totalChunks: number;
  completedChunks: number;
  failedChunks: number;
  rowCount: number;
  applied: number;
  duplicates: number;
  rejected: number;
  noop: number;
  unknownShipments: number;
  errors: Array<{ row: number; trackingNumber?: string; reason: string }>;
  fatalError?: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Creates an ImportBatch record and issues a presigned S3 PUT URL
 */
export async function createPresignedUploadUrlService(
  merchantIdInput: string | Types.ObjectId,
  input: { filename: string; carrier: Carrier },
): Promise<ServiceResponse<PresignedUrlResult>> {
  if (!merchantIdInput || !Types.ObjectId.isValid(merchantIdInput)) {
    throw new AppError(400, 'Invalid merchant id', 'invalid_merchant_id');
  }
  const merchantId =
    merchantIdInput instanceof Types.ObjectId
      ? merchantIdInput
      : new Types.ObjectId(merchantIdInput);

  const batchId = new Types.ObjectId();
  const sanitizedFilename = input.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const s3Key = `raw-uploads/${merchantId.toString()}/${batchId.toString()}_${sanitizedFilename}`;

  const maxBytes = 50 * 1024 * 1024; // 50 MB
  const expiresInSeconds = 900; // 15 minutes

  const { uploadUrl } = await getPresignedUploadUrl(s3Key, 'text/csv', expiresInSeconds);

  await ImportBatch.create({
    _id: batchId,
    merchantId,
    carrier: input.carrier,
    filename: input.filename,
    s3SourceKey: s3Key,
    status: 'PENDING_UPLOAD',
    totalChunks: 0,
    completedChunks: 0,
    failedChunks: 0,
    rowCount: 0,
    applied: 0,
    duplicates: 0,
    rejected: 0,
    noop: 0,
    unknownShipments: 0,
    errors: [],
  });

  return {
    success: true,
    status: 201,
    message: 'Presigned upload URL created successfully',
    data: {
      batchId: batchId.toString(),
      uploadUrl,
      s3Key,
      maxBytes,
      expiresInSeconds,
    },
    error: null,
  };
}

/**
 * Commits the upload and queues the streaming normalizer job
 */
export async function commitImportBatchService(
  merchantIdInput: string | Types.ObjectId,
  batchIdInput: string | Types.ObjectId,
): Promise<ServiceResponse<{ batchId: string; status: ImportBatchStatus }>> {
  if (!merchantIdInput || !Types.ObjectId.isValid(merchantIdInput)) {
    throw new AppError(400, 'Invalid merchant id', 'invalid_merchant_id');
  }
  if (!batchIdInput || !Types.ObjectId.isValid(batchIdInput)) {
    throw new AppError(400, 'Invalid batch id', 'invalid_batch_id');
  }

  const merchantId =
    merchantIdInput instanceof Types.ObjectId
      ? merchantIdInput
      : new Types.ObjectId(merchantIdInput);
  const batchId =
    batchIdInput instanceof Types.ObjectId ? batchIdInput : new Types.ObjectId(batchIdInput);

  const updated = await ImportBatch.findOneAndUpdate(
    { _id: batchId, merchantId, status: 'PENDING_UPLOAD' },
    { $set: { status: 'NORMALIZING' } },
    { new: true },
  ).exec();

  if (!updated) {
    const existing = await ImportBatch.findOne({ _id: batchId, merchantId }).lean().exec();
    if (!existing) {
      throw new AppError(404, 'Import batch not found', 'batch_not_found');
    }
    throw new AppError(
      409,
      `Cannot commit batch in current status: ${existing.status}`,
      'invalid_batch_status',
    );
  }

  // Queue normalize-csv-stream job
  try {
    const queue = getBulkImportQueue();
    await queue.add(
      'normalize-csv-stream',
      { batchId: batchId.toString() },
      {
        jobId: `normalize_${batchId.toString()}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  } catch (err: any) {
    // If Redis is not connected or in test mode without workers, execute inline fallback
    if (process.env.NODE_ENV === 'test') {
      await processNormalizeCsvStream(batchId);
    } else {
      console.error(`[ImportService] Failed to enqueue normalizer job:`, err?.message);
    }
  }

  return {
    success: true,
    status: 202,
    message: 'Import queued for normalization',
    data: {
      batchId: batchId.toString(),
      status: 'NORMALIZING',
    },
    error: null,
  };
}

/**
 * Get import batch status and live progress
 */
export async function getImportBatchStatusService(
  merchantIdInput: string | Types.ObjectId,
  batchIdInput: string | Types.ObjectId,
): Promise<ServiceResponse<ImportBatchProgressResult>> {
  if (!merchantIdInput || !Types.ObjectId.isValid(merchantIdInput)) {
    throw new AppError(400, 'Invalid merchant id', 'invalid_merchant_id');
  }
  if (!batchIdInput || !Types.ObjectId.isValid(batchIdInput)) {
    throw new AppError(400, 'Invalid batch id', 'invalid_batch_id');
  }

  const merchantId =
    merchantIdInput instanceof Types.ObjectId
      ? merchantIdInput
      : new Types.ObjectId(merchantIdInput);
  const batchId =
    batchIdInput instanceof Types.ObjectId ? batchIdInput : new Types.ObjectId(batchIdInput);

  const batch = await ImportBatch.findOne({ _id: batchId, merchantId })
    .select(
      '_id carrier filename status totalChunks completedChunks failedChunks rowCount applied duplicates rejected noop unknownShipments errors fatalError createdAt completedAt',
    )
    .lean()
    .exec();

  if (!batch) {
    throw new AppError(404, 'Import batch not found', 'batch_not_found');
  }

  const processed = batch.completedChunks + batch.failedChunks;
  const progressPercent =
    batch.totalChunks > 0 ? Math.min(100, Math.round((processed / batch.totalChunks) * 100)) : 0;

  return {
    success: true,
    status: 200,
    message: 'Import batch status retrieved',
    data: {
      batchId: batch._id.toString(),
      carrier: batch.carrier,
      filename: batch.filename,
      status: batch.status,
      progressPercent,
      totalChunks: batch.totalChunks,
      completedChunks: batch.completedChunks,
      failedChunks: batch.failedChunks,
      rowCount: batch.rowCount,
      applied: batch.applied,
      duplicates: batch.duplicates,
      rejected: batch.rejected,
      noop: batch.noop,
      unknownShipments: batch.unknownShipments,
      errors: batch.errors || [],
      fatalError: batch.fatalError,
      createdAt: batch.createdAt,
      completedAt: batch.completedAt,
    },
    error: null,
  };
}

/**
 * List recent import batches for merchant
 */
export async function listImportBatchesService(
  merchantIdInput: string | Types.ObjectId,
  options: { limit?: number; cursor?: string; status?: ImportBatchStatus } = {},
): Promise<ServiceResponse<{ batches: ImportBatchProgressResult[]; nextCursor?: string }>> {
  if (!merchantIdInput || !Types.ObjectId.isValid(merchantIdInput)) {
    throw new AppError(400, 'Invalid merchant id', 'invalid_merchant_id');
  }
  const merchantId =
    merchantIdInput instanceof Types.ObjectId
      ? merchantIdInput
      : new Types.ObjectId(merchantIdInput);

  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const filter: any = { merchantId };

  if (options.status) {
    filter.status = options.status;
  }

  if (options.cursor && Types.ObjectId.isValid(options.cursor)) {
    filter._id = { $lt: new Types.ObjectId(options.cursor) };
  }

  const docs = await ImportBatch.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .select(
      '_id carrier filename status totalChunks completedChunks failedChunks rowCount applied duplicates rejected noop unknownShipments errors fatalError createdAt completedAt',
    )
    .lean()
    .exec();

  let nextCursor: string | undefined;
  if (docs.length > limit) {
    const nextItem = docs.pop();
    nextCursor = nextItem?._id?.toString();
  }

  const batches: ImportBatchProgressResult[] = docs.map((batch: any) => {
    const processed = batch.completedChunks + batch.failedChunks;
    const progressPercent =
      batch.totalChunks > 0 ? Math.min(100, Math.round((processed / batch.totalChunks) * 100)) : 0;

    return {
      batchId: batch._id.toString(),
      carrier: batch.carrier,
      filename: batch.filename,
      status: batch.status,
      progressPercent,
      totalChunks: batch.totalChunks,
      completedChunks: batch.completedChunks,
      failedChunks: batch.failedChunks,
      rowCount: batch.rowCount,
      applied: batch.applied,
      duplicates: batch.duplicates,
      rejected: batch.rejected,
      noop: batch.noop,
      unknownShipments: batch.unknownShipments,
      errors: batch.errors || [],
      fatalError: batch.fatalError,
      createdAt: batch.createdAt,
      completedAt: batch.completedAt,
    };
  });

  return {
    success: true,
    status: 200,
    message: 'Import batches retrieved successfully',
    data: {
      batches,
      nextCursor,
    },
    error: null,
  };
}
