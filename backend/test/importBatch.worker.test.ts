import { Types } from 'mongoose';
import { ImportBatch } from '../src/importBatch/ImportBatch.model.js';
import { ImportChunk } from '../src/importBatch/ImportChunk.model.js';
import { Shipment } from '../src/shipment/shipment.model.js';
import { ShipmentEvent } from '../src/shipmentEvent/ShipmentEvent.model.js';
import { OutboxMessage } from '../src/models/OutboxMessage.js';
import { processImportChunk } from '../src/importBatch/importBatch.worker.js';
import { putGzippedNdjsonChunk, _clearTestS3 } from '../src/config/s3.js';
import { computeEventKey } from '../src/shipmentEvent/ShipmentEvent.utils.js';

describe('importBatch.worker (Vectorized In-Memory Folding Engine)', () => {
  const merchantId = new Types.ObjectId();
  const carrier = 'POSTEX';

  beforeEach(() => {
    _clearTestS3();
  });

  it('folds multiple chronological events for the same parcel and reduces net Outbox effects', async () => {
    // 1. Create initial shipment in BOOKED status
    const shipment = await Shipment.create({
      merchantId,
      carrier,
      trackingNumber: 'TRK-FOLD-1',
      customerPhone: 'enc-phone',
      customerPhoneHash: 'hash-phone',
      status: 'BOOKED',
      stateVersion: 0,
      ndrAttempt: 0,
    });

    const batch = await ImportBatch.create({
      merchantId,
      carrier,
      filename: 'fold-test.csv',
      status: 'PROCESSING',
      totalChunks: 1,
    });

    // 2. Prepare 3 chronological events in 1 chunk:
    // OUT_FOR_DELIVERY -> NDR_ACTIVE (attempt 1) -> DELIVERED (cancels NDR template)
    const baseDate = new Date('2026-10-15T08:00:00Z');
    const rows = [
      JSON.stringify({
        rowNumber: 1,
        trackingNumber: 'TRK-FOLD-1',
        rawStatus: 'OUT_FOR_DELIVERY',
        rawRemarks: 'Out for delivery',
        occurredAt: new Date(baseDate.getTime() + 1000).toISOString(),
      }),
      JSON.stringify({
        rowNumber: 2,
        trackingNumber: 'TRK-FOLD-1',
        rawStatus: 'NDR_ACTIVE',
        rawRemarks: 'Customer refused',
        occurredAt: new Date(baseDate.getTime() + 2000).toISOString(),
      }),
      JSON.stringify({
        rowNumber: 3,
        trackingNumber: 'TRK-FOLD-1',
        rawStatus: 'DELIVERED',
        rawRemarks: 'Delivered successfully',
        occurredAt: new Date(baseDate.getTime() + 3000).toISOString(),
      }),
    ];

    const s3ChunkKey = `imports/${batch._id}/chunk_0.ndjson.gz`;
    await putGzippedNdjsonChunk(s3ChunkKey, rows);

    const chunk = await ImportChunk.create({
      batchId: batch._id,
      merchantId,
      carrier,
      chunkIndex: 0,
      s3ChunkKey,
      startRow: 1,
      rowCount: 3,
      status: 'QUEUED',
    });

    await processImportChunk(chunk._id);

    // 3. Verify final Shipment state
    const updatedShipment = await Shipment.findById(shipment._id);
    expect(updatedShipment?.status).toBe('DELIVERED');
    expect(updatedShipment?.ndrAttempt).toBe(1);
    expect(updatedShipment?.stateVersion).toBe(1); // 1 atomic version increment

    // 4. Verify net Outbox effects:
    // NDR_ACTIVE queued NDR_UTILITY_TEMPLATE, but DELIVERED immediately purged it!
    const ndrMsg = await OutboxMessage.findOne({
      shipmentId: shipment._id,
      messageType: 'NDR_UTILITY_TEMPLATE',
    });
    // Net effect folded in memory: no stale PENDING template was ever dispatched
    expect(ndrMsg).toBeNull();

    // 5. Verify ImportBatch progress counters
    const updatedBatch = await ImportBatch.findById(batch._id);
    expect(updatedBatch?.applied).toBe(3);
    expect(updatedBatch?.completedChunks).toBe(1);
    expect(updatedBatch?.status).toBe('COMPLETED');
  });

  it('detects existing ledger events upfront without incrementing ndrAttempt', async () => {
    const shipment = await Shipment.create({
      merchantId,
      carrier,
      trackingNumber: 'TRK-DEDUP-1',
      customerPhone: 'enc-phone',
      customerPhoneHash: 'hash-phone',
      status: 'BOOKED',
      stateVersion: 0,
      ndrAttempt: 0,
    });

    const occurredAt = new Date('2026-10-15T12:00:00Z');
    const existingKey = computeEventKey({
      merchantId: merchantId.toString(),
      carrier,
      trackingNumber: 'TRK-DEDUP-1',
      rawStatus: 'IN_TRANSIT',
      rawRemarks: 'Hub transit',
      occurredAt,
    });

    // Seed pre-existing ledger entry
    await ShipmentEvent.create({
      merchantId,
      carrier,
      trackingNumber: 'TRK-DEDUP-1',
      eventKey: existingKey,
      source: 'CARRIER_WEBHOOK',
      rawStatus: 'IN_TRANSIT',
      occurredAt,
      disposition: 'APPLIED',
    });

    const batch = await ImportBatch.create({
      merchantId,
      carrier,
      filename: 'dedup-test.csv',
      status: 'PROCESSING',
      totalChunks: 1,
    });

    const rows = [
      JSON.stringify({
        rowNumber: 1,
        trackingNumber: 'TRK-DEDUP-1',
        rawStatus: 'IN_TRANSIT',
        rawRemarks: 'Hub transit',
        occurredAt: occurredAt.toISOString(),
      }),
    ];

    const s3ChunkKey = `imports/${batch._id}/chunk_0.ndjson.gz`;
    await putGzippedNdjsonChunk(s3ChunkKey, rows);

    const chunk = await ImportChunk.create({
      batchId: batch._id,
      merchantId,
      carrier,
      chunkIndex: 0,
      s3ChunkKey,
      startRow: 1,
      rowCount: 1,
      status: 'QUEUED',
    });

    await processImportChunk(chunk._id);

    const updatedBatch = await ImportBatch.findById(batch._id);
    expect(updatedBatch?.duplicates).toBe(1);
    expect(updatedBatch?.applied).toBe(0);

    const freshShipment = await Shipment.findById(shipment._id);
    expect(freshShipment?.stateVersion).toBe(0); // Untouched
  });

  it('records UNKNOWN_SHIPMENT in ledger without creating orphan shipments', async () => {
    const batch = await ImportBatch.create({
      merchantId,
      carrier,
      filename: 'unknown-test.csv',
      status: 'PROCESSING',
      totalChunks: 1,
    });

    const rows = [
      JSON.stringify({
        rowNumber: 1,
        trackingNumber: 'UNKNOWN-PARCEL-999',
        rawStatus: 'BOOKED',
        rawRemarks: 'Unknown parcel',
        occurredAt: new Date().toISOString(),
      }),
    ];

    const s3ChunkKey = `imports/${batch._id}/chunk_0.ndjson.gz`;
    await putGzippedNdjsonChunk(s3ChunkKey, rows);

    const chunk = await ImportChunk.create({
      batchId: batch._id,
      merchantId,
      carrier,
      chunkIndex: 0,
      s3ChunkKey,
      startRow: 1,
      rowCount: 1,
      status: 'QUEUED',
    });

    await processImportChunk(chunk._id);

    // Ledger record created
    const event = await ShipmentEvent.findOne({ trackingNumber: 'UNKNOWN-PARCEL-999' });
    expect(event).not.toBeNull();
    expect(event?.disposition).toBe('UNKNOWN_SHIPMENT');

    // No shipment provisioned
    const sh = await Shipment.findOne({ trackingNumber: 'UNKNOWN-PARCEL-999' });
    expect(sh).toBeNull();
  });

  it('handles concurrent stateVersion conflict by cleanly falling back to applyEventDetailed', async () => {
    const s1 = await Shipment.create({
      merchantId,
      carrier,
      trackingNumber: 'TRK-RACE-1',
      customerPhone: 'enc-1',
      customerPhoneHash: 'hash-1',
      status: 'BOOKED',
      stateVersion: 0,
    });

    const s2 = await Shipment.create({
      merchantId,
      carrier,
      trackingNumber: 'TRK-RACE-2',
      customerPhone: 'enc-2',
      customerPhoneHash: 'hash-2',
      status: 'BOOKED',
      stateVersion: 0,
    });

    const batch = await ImportBatch.create({
      merchantId,
      carrier,
      filename: 'race-test.csv',
      status: 'PROCESSING',
      totalChunks: 1,
    });

    const rows = [
      JSON.stringify({
        rowNumber: 1,
        trackingNumber: 'TRK-RACE-1',
        rawStatus: 'IN_TRANSIT',
        occurredAt: new Date().toISOString(),
      }),
      JSON.stringify({
        rowNumber: 2,
        trackingNumber: 'TRK-RACE-2',
        rawStatus: 'IN_TRANSIT',
        occurredAt: new Date().toISOString(),
      }),
    ];

    const s3ChunkKey = `imports/${batch._id}/chunk_0.ndjson.gz`;
    await putGzippedNdjsonChunk(s3ChunkKey, rows);

    const chunk = await ImportChunk.create({
      batchId: batch._id,
      merchantId,
      carrier,
      chunkIndex: 0,
      s3ChunkKey,
      startRow: 1,
      rowCount: 2,
      status: 'QUEUED',
    });

    // Simulate concurrent webhook mutating s1 right before bulkWrite executes:
    await Shipment.updateOne({ _id: s1._id }, { $inc: { stateVersion: 1 } });

    await processImportChunk(chunk._id);

    // Both shipments must successfully reach IN_TRANSIT
    const freshS1 = await Shipment.findById(s1._id);
    const freshS2 = await Shipment.findById(s2._id);
    expect(freshS1?.status).toBe('IN_TRANSIT');
    expect(freshS2?.status).toBe('IN_TRANSIT');

    const updatedBatch = await ImportBatch.findById(batch._id);
    expect(updatedBatch?.applied).toBe(2);
    expect(updatedBatch?.status).toBe('COMPLETED');
  });

  it('is idempotent on chunk retry without double-incrementing batch counters', async () => {
    await Shipment.create({
      merchantId,
      carrier,
      trackingNumber: 'TRK-RETRY-1',
      customerPhone: 'enc-phone',
      customerPhoneHash: 'hash-phone',
      status: 'BOOKED',
      stateVersion: 0,
    });

    const batch = await ImportBatch.create({
      merchantId,
      carrier,
      filename: 'retry-test.csv',
      status: 'PROCESSING',
      totalChunks: 1,
    });

    const rows = [
      JSON.stringify({
        rowNumber: 1,
        trackingNumber: 'TRK-RETRY-1',
        rawStatus: 'IN_TRANSIT',
        occurredAt: new Date().toISOString(),
      }),
    ];

    const s3ChunkKey = `imports/${batch._id}/chunk_0.ndjson.gz`;
    await putGzippedNdjsonChunk(s3ChunkKey, rows);

    const chunk = await ImportChunk.create({
      batchId: batch._id,
      merchantId,
      carrier,
      chunkIndex: 0,
      s3ChunkKey,
      startRow: 1,
      rowCount: 1,
      status: 'QUEUED',
    });

    // Execution 1
    await processImportChunk(chunk._id);

    const batchAfterFirstRun = await ImportBatch.findById(batch._id);
    expect(batchAfterFirstRun?.applied).toBe(1);
    expect(batchAfterFirstRun?.completedChunks).toBe(1);

    // Execution 2 (Retry of COMPLETED chunk)
    await processImportChunk(chunk._id);

    const batchAfterSecondRun = await ImportBatch.findById(batch._id);
    expect(batchAfterSecondRun?.applied).toBe(1); // Not double-counted
    expect(batchAfterSecondRun?.completedChunks).toBe(1);
  });
});
