import { parse } from 'csv-parse';
import { Types } from 'mongoose';
import { ImportBatch } from './ImportBatch.model.js';
import { ImportChunk, type IImportChunk } from './ImportChunk.model.js';
import { getObjectStream, putGzippedNdjsonChunk, verifyUploadedObject, deleteObject } from '../config/s3.js';
import { getBulkImportQueue } from './importBatch.queue.js';
import { AppError } from '../middleware/error.js';

export const CHUNK_SIZE = 500;
export const MAX_CONCURRENT_CHUNKS_PER_MERCHANT = 2;

export interface NormalizedCsvRow {
  rowNumber: number;
  trackingNumber: string;
  rawStatus: string;
  rawRemarks: string;
  occurredAt?: string;
  carrierEventId?: string;
  payload: Record<string, unknown>;
}

// Map CSV column names to canonical fields
function resolveRowField(row: Record<string, string>, aliases: string[]): string {
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== null && String(row[alias]).trim() !== '') {
      return String(row[alias]).trim();
    }
  }
  return '';
}

/**
 * Enqueue a chunk job into BullMQ
 */
export async function enqueueChunkJob(chunk: IImportChunk): Promise<void> {
  const queue = getBulkImportQueue();
  const jobId = `import_${chunk.batchId.toString()}_chunk_${chunk.chunkIndex}`;
  await queue.add(
    'process-chunk',
    {
      batchId: chunk.batchId.toString(),
      chunkId: chunk._id.toString(),
      chunkIndex: chunk.chunkIndex,
      merchantId: chunk.merchantId.toString(),
    },
    {
      jobId,
      removeOnComplete: true,
      removeOnFail: false,
    },
  );
}

/**
 * Core stream normalizer processor
 */
export async function processNormalizeCsvStream(batchIdInput: string | Types.ObjectId): Promise<void> {
  const batchId =
    batchIdInput instanceof Types.ObjectId ? batchIdInput : new Types.ObjectId(batchIdInput);

  const batch = await ImportBatch.findById(batchId);
  if (!batch) {
    throw new AppError(404, `Import batch not found: ${batchId}`, 'batch_not_found');
  }

  if (batch.status !== 'NORMALIZING') {
    // Already normalized or not ready
    return;
  }

  if (!batch.s3SourceKey) {
    await ImportBatch.updateOne(
      { _id: batch._id },
      { $set: { status: 'FAILED', fatalError: 'Missing S3 source key for batch' } },
    );
    throw new AppError(400, 'Missing S3 source key for batch', 'missing_s3_key');
  }

  try {
    // 1. Verify S3 file existence and size
    const { sizeBytes } = await verifyUploadedObject(batch.s3SourceKey, 50 * 1024 * 1024);
    await ImportBatch.updateOne({ _id: batch._id }, { $set: { fileSizeBytes: sizeBytes } });

    // 2. Stream and parse CSV with BOM stripping
    const s3Stream = await getObjectStream(batch.s3SourceKey);
    const parser = s3Stream.pipe(
      parse({
        bom: true,
        columns: (headers: string[]) => headers.map((h) => h.trim().toLowerCase()),
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }),
    );

    let totalRowsRead = 0;
    let chunkIndex = 0;
    let currentSlice: string[] = [];
    let sliceStartRow = 1;

    // Helper to flush a 500-row slice to S3 as NDJSON.gz and record ImportChunk
    const flushSlice = async () => {
      if (currentSlice.length === 0) return;

      const s3ChunkKey = `imports/${batch._id.toString()}/chunk_${chunkIndex}.ndjson.gz`;
      await putGzippedNdjsonChunk(s3ChunkKey, currentSlice);

      await ImportChunk.updateOne(
        { batchId: batch._id, chunkIndex },
        {
          $set: {
            merchantId: batch.merchantId,
            carrier: batch.carrier,
            s3ChunkKey,
            startRow: sliceStartRow,
            rowCount: currentSlice.length,
            status: 'PENDING',
          },
        },
        { upsert: true },
      );

      chunkIndex++;
      currentSlice = [];
      sliceStartRow = totalRowsRead + 1;
    };

    for await (const rawRow of parser) {
      totalRowsRead++;
      const rowNumber = totalRowsRead;

      // Extract canonical fields from row aliases
      const trackingNumber = resolveRowField(rawRow, [
        'tracking_number',
        'trackingnumber',
        'tracking_no',
        'cn',
        'awb',
        'consignment_no',
        'tracking',
      ]);
      const rawStatus = resolveRowField(rawRow, ['status', 'raw_status', 'rawstatus', 'current_status']);
      const rawRemarks = resolveRowField(rawRow, ['remarks', 'raw_remarks', 'reason', 'comments', 'notes']);
      const occurredAt = resolveRowField(rawRow, [
        'occurred_at',
        'occurredat',
        'date',
        'timestamp',
        'event_date',
        'time',
      ]);
      const carrierEventId = resolveRowField(rawRow, [
        'carrier_event_id',
        'event_id',
        'carrier_id',
        'reference_id',
      ]);

      const normalizedRow: NormalizedCsvRow = {
        rowNumber,
        trackingNumber,
        rawStatus: rawStatus || 'UNKNOWN',
        rawRemarks,
        occurredAt: occurredAt || undefined,
        carrierEventId: carrierEventId || undefined,
        payload: rawRow,
      };

      currentSlice.push(JSON.stringify(normalizedRow));

      if (currentSlice.length >= CHUNK_SIZE) {
        await flushSlice();
      }
    }

    // Flush any remaining rows
    await flushSlice();

    // Source CSV is now safely sliced into chunk objects; free up S3 storage (ML-02)
    if (batch.s3SourceKey) {
      await deleteObject(batch.s3SourceKey).catch((err) => {
        console.warn(`[ImportNormalizer] Failed to delete source S3 file ${batch.s3SourceKey}:`, err);
      });
    }

    const totalChunks = chunkIndex;

    if (totalChunks === 0) {
      await ImportBatch.updateOne(
        { _id: batch._id },
        {
          $set: {
            status: 'COMPLETED',
            totalChunks: 0,
            rowCount: 0,
            completedAt: new Date(),
          },
        },
      );
      return;
    }

    // Update batch with totalChunks and transition to PROCESSING
    await ImportBatch.updateOne(
      { _id: batch._id },
      {
        $set: {
          status: 'PROCESSING',
          totalChunks,
          rowCount: totalRowsRead,
        },
      },
    );

    // Seed the pump: claim up to MAX_CONCURRENT_CHUNKS_PER_MERCHANT chunks
    const chunksToSeed = await ImportChunk.find({
      batchId: batch._id,
      status: 'PENDING',
    })
      .sort({ chunkIndex: 1 })
      .limit(MAX_CONCURRENT_CHUNKS_PER_MERCHANT)
      .exec();

    for (const chunk of chunksToSeed) {
      await ImportChunk.updateOne({ _id: chunk._id }, { $set: { status: 'QUEUED' } });
      await enqueueChunkJob(chunk);
    }
  } catch (err: any) {
    console.error(`[ImportNormalizer] Normalization failed for batch ${batch._id}:`, err);
    await ImportBatch.updateOne(
      { _id: batch._id },
      {
        $set: {
          status: 'FAILED',
          fatalError: err?.message || 'CSV normalization failed',
        },
      },
    );
    throw err;
  }
}
