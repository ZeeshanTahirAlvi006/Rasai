import { Types } from 'mongoose';
import {
  createPresignedUploadUrlService,
  commitImportBatchService,
  getImportBatchStatusService,
  listImportBatchesService,
} from '../src/importBatch/importBatch.service.js';
import { processImportChunk } from '../src/importBatch/importBatch.worker.js';
import { ImportChunk } from '../src/importBatch/ImportChunk.model.js';
import { _setTestS3Object, _clearTestS3 } from '../src/config/s3.js';
import { Shipment } from '../src/shipment/shipment.model.js';

describe('importBatch.api (End-to-End API Service Flow)', () => {
  const merchantA = new Types.ObjectId();
  const merchantB = new Types.ObjectId();

  beforeEach(() => {
    _clearTestS3();
  });

  it('runs complete upload lifecycle: presigned-url -> commit -> chunk processing -> get status', async () => {
    // 1. Seed shipment for merchantA
    await Shipment.create({
      merchantId: merchantA,
      carrier: 'POSTEX',
      trackingNumber: 'TRK-API-1',
      customerPhone: 'enc-1',
      customerPhoneHash: 'hash-1',
      status: 'BOOKED',
    });

    // 2. Request presigned URL
    const presignRes = await createPresignedUploadUrlService(merchantA, {
      filename: 'parcels_october.csv',
      carrier: 'POSTEX',
    });

    expect(presignRes.success).toBe(true);
    expect(presignRes.data.batchId).toBeDefined();
    expect(presignRes.data.uploadUrl).toContain('mockSigned=true');
    const batchId = presignRes.data.batchId;

    // 3. Simulate client PUT upload to S3
    const csvData = 'tracking_number,status,remarks\nTRK-API-1,IN_TRANSIT,Picked up from merchant\n';
    _setTestS3Object(presignRes.data.s3Key, csvData);

    // 4. Commit upload
    const commitRes = await commitImportBatchService(merchantA, batchId);
    expect(commitRes.success).toBe(true);

    // 5. Process the seeded chunk
    const chunk = await ImportChunk.findOne({ batchId: new Types.ObjectId(batchId) });
    expect(chunk).not.toBeNull();
    if (chunk) {
      await processImportChunk(chunk._id);
    }

    // 6. Check final status
    const statusRes = await getImportBatchStatusService(merchantA, batchId);
    expect(statusRes.success).toBe(true);
    expect(statusRes.data.status).toBe('COMPLETED');
    expect(statusRes.data.progressPercent).toBe(100);
    expect(statusRes.data.applied).toBe(1);
    expect(statusRes.data.rowCount).toBe(1);

    // Verify shipment was updated
    const updatedShipment = await Shipment.findOne({ merchantId: merchantA, trackingNumber: 'TRK-API-1' });
    expect(updatedShipment?.status).toBe('IN_TRANSIT');
  });

  it('enforces merchant isolation on batch status queries', async () => {
    const presignRes = await createPresignedUploadUrlService(merchantA, {
      filename: 'isolated.csv',
      carrier: 'TRAX',
    });

    // Merchant B tries to view Merchant A's batch
    await expect(
      getImportBatchStatusService(merchantB, presignRes.data.batchId),
    ).rejects.toThrow('Import batch not found');
  });

  it('lists paginated import batches for authenticated merchant', async () => {
    await createPresignedUploadUrlService(merchantA, { filename: 'file1.csv', carrier: 'POSTEX' });
    await createPresignedUploadUrlService(merchantA, { filename: 'file2.csv', carrier: 'POSTEX' });
    await createPresignedUploadUrlService(merchantB, { filename: 'merchantB.csv', carrier: 'POSTEX' });

    const listRes = await listImportBatchesService(merchantA, { limit: 10 });
    expect(listRes.success).toBe(true);
    expect(listRes.data.batches.length).toBe(2);
    expect(listRes.data.batches.every((b) => b.filename.startsWith('file'))).toBe(true);
  });
});
