import { Types } from 'mongoose';
import { ImportBatch } from '../src/importBatch/ImportBatch.model.js';
import { ImportChunk } from '../src/importBatch/ImportChunk.model.js';
import { processNormalizeCsvStream } from '../src/importBatch/importBatch.normalizer.js';
import { _setTestS3Object, _clearTestS3 } from '../src/config/s3.js';

describe('importBatch.normalizer (Streaming CSV Chunker)', () => {
  const merchantId = new Types.ObjectId();

  beforeEach(() => {
    _clearTestS3();
  });

  it('strips UTF-8 BOM, normalizes headers, and slices 1,250 rows into 3 gzipped chunks', async () => {
    // Generate 1,250 CSV rows
    let csvContent = '\uFEFFCN,Status,Date,Remarks\n';
    for (let i = 1; i <= 1250; i++) {
      csvContent += `TRK-${i},IN_TRANSIT,2026-10-15T10:00:00Z,In transit to hub\n`;
    }

    const s3Key = `raw-uploads/${merchantId}/test-batch-1.csv`;
    _setTestS3Object(s3Key, csvContent);

    const batch = await ImportBatch.create({
      merchantId,
      carrier: 'POSTEX',
      filename: 'test-batch-1.csv',
      s3SourceKey: s3Key,
      status: 'NORMALIZING',
    });

    await processNormalizeCsvStream(batch._id);

    const updatedBatch = await ImportBatch.findById(batch._id);
    expect(updatedBatch?.status).toBe('PROCESSING');
    expect(updatedBatch?.totalChunks).toBe(3);
    expect(updatedBatch?.rowCount).toBe(1250);

    const chunks = await ImportChunk.find({ batchId: batch._id }).sort({ chunkIndex: 1 });
    expect(chunks.length).toBe(3);

    // Chunk sizes: 500, 500, 250
    expect(chunks[0].rowCount).toBe(500);
    expect(chunks[0].startRow).toBe(1);
    expect(chunks[0].status).toBe('QUEUED'); // Seeded

    expect(chunks[1].rowCount).toBe(500);
    expect(chunks[1].startRow).toBe(501);
    expect(chunks[1].status).toBe('QUEUED'); // Seeded (cap is 2)

    expect(chunks[2].rowCount).toBe(250);
    expect(chunks[2].startRow).toBe(1001);
    expect(chunks[2].status).toBe('PENDING'); // Waiting for pump
  });

  it('is 100% idempotent when normalizer is retried', async () => {
    const csvContent = 'tracking_number,status\nTRK-100,BOOKED\nTRK-101,DELIVERED\n';
    const s3Key = `raw-uploads/${merchantId}/idempotent.csv`;
    _setTestS3Object(s3Key, csvContent);

    const batch = await ImportBatch.create({
      merchantId,
      carrier: 'TRAX',
      filename: 'idempotent.csv',
      s3SourceKey: s3Key,
      status: 'NORMALIZING',
    });

    // Run 1
    await processNormalizeCsvStream(batch._id);

    // Reset status to NORMALIZING to simulate retry
    await ImportBatch.updateOne({ _id: batch._id }, { $set: { status: 'NORMALIZING' } });

    // Run 2
    await processNormalizeCsvStream(batch._id);

    const chunks = await ImportChunk.find({ batchId: batch._id });
    expect(chunks.length).toBe(1);
    expect(chunks[0].rowCount).toBe(2);
  });

  it('handles empty CSV (headers only) cleanly by completing batch immediately', async () => {
    const csvContent = 'tracking_number,status,occurred_at\n';
    const s3Key = `raw-uploads/${merchantId}/empty.csv`;
    _setTestS3Object(s3Key, csvContent);

    const batch = await ImportBatch.create({
      merchantId,
      carrier: 'LEOPARDS',
      filename: 'empty.csv',
      s3SourceKey: s3Key,
      status: 'NORMALIZING',
    });

    await processNormalizeCsvStream(batch._id);

    const updated = await ImportBatch.findById(batch._id);
    expect(updated?.status).toBe('COMPLETED');
    expect(updated?.totalChunks).toBe(0);
    expect(updated?.rowCount).toBe(0);
  });
});
