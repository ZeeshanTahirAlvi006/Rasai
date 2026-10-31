// src/manifestBatch/manifest.worker.ts
// Compiles station run-sheet manifests, generates PDF/CSV artifacts, and dispatches via Drive and Gmail.
import { Types } from 'mongoose';
import { Shipment, type IShipment } from '../shipment/shipment.model';
import { ManifestBatch, type IManifestBatch } from './ManifestBatch';
import { CarrierStation } from '../models/CarrierStation';
import {
  generateRunSheetPdfBuffer,
  generateRunSheetCsvBuffer,
  type ManifestParcelRow,
} from './manifest.generator';
import {
  storeManifestArtifacts,
  dispatchStationManifestEmail,
} from './manifest.delivery';
import { decryptPhone, maskPhone } from '../utils/phone';
import type { Carrier } from '../types';

export interface CompileManifestsOptions {
  merchantId?: Types.ObjectId;
  carrier?: Carrier;
  stationCode?: string;
  forceRecompile?: boolean;
}

export interface CompileManifestsSummary {
  dateKey: string;
  stationsProcessed: number;
  totalParcelsManifested: number;
  batches: Array<{
    batchId: string;
    stationCode: string;
    carrier: string;
    parcelCount: number;
    status: string;
    driveUrl?: string;
  }>;
}

const MAX_PARCELS_PER_STATION_BATCH = 500;

export async function compileAndSendManifests(
  options: CompileManifestsOptions = {},
): Promise<CompileManifestsSummary> {
  const now = new Date();
  const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(now); // YYYY-MM-DD
  const endOfTodayPKT = new Date(`${dateKey}T23:59:59.999+05:00`);
  const startOfTodayPKT = new Date(`${dateKey}T00:00:00.000+05:00`);

  // Query candidate shipments due for manifestation
  const candidateFilter: Record<string, any> = {
    needsManifest: true,
    $or: [
      { status: 'RESOLVED_RESCHEDULED', rescheduledDate: { $lte: endOfTodayPKT } },
      { status: 'RTO_INITIATED' },
    ],
  };

  // If not forceRecompile, skip parcels already manifested today (B3-RC-05)
  if (!options.forceRecompile) {
    candidateFilter.$and = [
      {
        $or: [
          { lastManifestedAt: { $exists: false } },
          { lastManifestedAt: null },
          { lastManifestedAt: { $lt: startOfTodayPKT } },
        ],
      },
    ];
  }

  if (options.merchantId) {
    candidateFilter.merchantId = options.merchantId;
  }
  if (options.carrier) {
    candidateFilter.carrier = options.carrier;
  }
  if (options.stationCode) {
    candidateFilter.destinationStationCode = options.stationCode.trim().toUpperCase();
  }

  // Stream using index-ordered cursor (B3-BN-01)
  const cursor = Shipment.find(candidateFilter)
    .sort({ merchantId: 1, carrier: 1, destinationStationCode: 1 })
    .select(
      '_id merchantId carrier destinationStationCode trackingNumber status orderValueCOD customerPhone rescheduledDate customerCoordinates',
    )
    .lean()
    .cursor();

  // Materialize station buckets, closing cursor before external I/O (B3-BN-04)
  const stationBuckets = new Map<
    string,
    {
      merchantId: Types.ObjectId;
      carrier: Carrier;
      stationCode: string;
      parcels: any[];
    }
  >();

  try {
    for await (const s of cursor) {
      const stationCode = (s.destinationStationCode || 'UNASSIGNED').trim().toUpperCase();
      const bucketKey = `${s.merchantId}:${s.carrier}:${stationCode}`;

      let bucket = stationBuckets.get(bucketKey);
      if (!bucket) {
        bucket = {
          merchantId: s.merchantId as Types.ObjectId,
          carrier: s.carrier as Carrier,
          stationCode,
          parcels: [],
        };
        stationBuckets.set(bucketKey, bucket);
      }

      if (bucket.parcels.length < MAX_PARCELS_PER_STATION_BATCH) {
        bucket.parcels.push(s);
      }
    }
  } finally {
    await cursor.close(); // Guarantee prompt cursor close (B3-BN-04)
  }

  const summary: CompileManifestsSummary = {
    dateKey,
    stationsProcessed: 0,
    totalParcelsManifested: 0,
    batches: [],
  };

  // Process station buckets sequentially or with bounded concurrency (concurrency: 4)
  for (const bucket of stationBuckets.values()) {
    if (bucket.parcels.length === 0) continue;

    const result = await processSingleStationManifest(
      bucket.merchantId,
      bucket.carrier,
      bucket.stationCode,
      dateKey,
      bucket.parcels,
      Boolean(options.forceRecompile),
    );

    if (result) {
      summary.stationsProcessed++;
      summary.totalParcelsManifested += result.parcelCount;
      summary.batches.push(result);
    }
  }

  return summary;
}

/**
 * Compiles and delivers a single station's manifest batch with lease fencing (B3-RC-04).
 */
async function processSingleStationManifest(
  merchantId: Types.ObjectId,
  carrier: Carrier,
  stationCode: string,
  dateKey: string,
  parcels: any[],
  forceRecompile: boolean,
): Promise<{
  batchId: string;
  stationCode: string;
  carrier: string;
  parcelCount: number;
  status: string;
  driveUrl?: string;
} | null> {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + 10 * 60_000); // 10m lease
  const claimToken = new Types.ObjectId();

  let batch: IManifestBatch | null = null;

  try {
    const claimFilter: Record<string, any> = {
      merchantId,
      carrier,
      dateKey,
      stationCode,
      $or: [
        { leaseUntil: { $exists: false } },
        { leaseUntil: null },
        { leaseUntil: { $lt: now } },
      ],
    };

    if (!forceRecompile) {
      claimFilter.status = { $ne: 'SENT' };
    }

    batch = await ManifestBatch.findOneAndUpdate(
      claimFilter,
      {
        $set: {
          status: 'STARTED',
          leaseUntil,
          claimToken,
          updatedAt: now,
        },
        $setOnInsert: {
          runCount: 0,
          parcelCount: parcels.length,
          totalCOD: parcels.reduce((sum, p) => sum + (p.orderValueCOD || 0), 0),
          shipmentIds: parcels.map((p) => p._id),
        },
      },
      { upsert: true, returnDocument: 'after' },
    );
  } catch (err: any) {
    if (err?.code === 11000) {
      // Already SENT or active lease held; skip cleanly without crashing worker (B3-RC-04)
      return null;
    }
    throw err;
  }

  if (!batch) return null;

  try {
    // 1. Resolve Courier Station manager contact
    const stationContact = await CarrierStation.findOne({
      merchantId,
      carrier,
      stationCode,
      isActive: true,
    })
      .select('managerEmail managerWhatsAppPhone')
      .lean()
      .exec();

    const recipientEmail = stationContact?.managerEmail || process.env.STATION_MANAGER_DEFAULT_EMAIL || 'station.manager@courier.local';

    // 2. Prepare parcel rows with decrypted phones and coordinates
    const parcelRows: ManifestParcelRow[] = [];
    let totalCOD = 0;

    for (const p of parcels) {
      totalCOD += p.orderValueCOD || 0;
      let phonePlain = 'N/A';
      let phoneMasked = '****';

      if (p.customerPhone) {
        try {
          phonePlain = decryptPhone(p.customerPhone);
          phoneMasked = maskPhone(phonePlain);
        } catch {
          phonePlain = 'Decryption failed';
        }
      }

      parcelRows.push({
        trackingNumber: p.trackingNumber,
        carrier: p.carrier,
        stationCode,
        status: p.status,
        rescheduledDate: p.rescheduledDate,
        orderValueCOD: p.orderValueCOD || 0,
        customerPhonePlain: phonePlain,
        customerPhoneMasked: phoneMasked,
        coordinates: p.customerCoordinates,
      });
    }

    const metadata = {
      stationCode,
      carrier,
      dateKey,
      totalParcels: parcels.length,
      totalCOD,
    };

    // 3. Generate binary PDF 1.4 and formula-sanitized CSV (B3-BUG-03)
    const pdfBuffer = generateRunSheetPdfBuffer(metadata, parcelRows);
    const csvBuffer = generateRunSheetCsvBuffer(metadata, parcelRows);

    // 4. Store artifacts & upload to Google Drive if configured
    const { pdfStorageKey, csvStorageKey, driveUrl } = await storeManifestArtifacts(
      String(batch._id),
      stationCode,
      carrier,
      dateKey,
      pdfBuffer,
      csvBuffer,
    );

    // 5. Dispatch station email with PDF and CSV attachments
    const emailDelivered = await dispatchStationManifestEmail(
      recipientEmail,
      stationCode,
      carrier,
      dateKey,
      parcels.length,
      driveUrl,
      pdfBuffer,
      csvBuffer,
    );

    // 6. Complete ManifestBatch record with claimToken fencing (B3-RC-04)
    await ManifestBatch.updateOne(
      { _id: batch._id, claimToken },
      {
        $set: {
          status: 'SENT',
          sentAt: new Date(),
          parcelCount: parcels.length,
          shipmentIds: parcels.map((p) => p._id),
          totalCOD,
          recipientEmail,
          driveUrl,
          pdfStorageKey,
          csvStorageKey,
          emailDelivered,
          updatedAt: new Date(),
        },
        $inc: { runCount: 1 },
        $unset: { leaseUntil: 1, claimToken: 1 },
      },
    );

    // 7. Stamp manifested parcels and clear needsManifest flag
    await Shipment.updateMany(
      { _id: { $in: parcels.map((p) => p._id) } },
      { $set: { needsManifest: false, lastManifestedAt: new Date(), destinationStationCode: stationCode } },
    );

    return {
      batchId: String(batch._id),
      stationCode,
      carrier,
      parcelCount: parcels.length,
      status: 'SENT',
      driveUrl,
    };
  } catch (err: any) {
    // Record failure on batch record
    await ManifestBatch.updateOne(
      { _id: batch._id, claimToken },
      {
        $set: {
          status: 'FAILED',
          error: err?.message || 'Manifest compilation failed',
          updatedAt: new Date(),
        },
        $unset: { leaseUntil: 1, claimToken: 1 },
      },
    ).catch(() => {});

    console.error(`[ManifestWorker] Error compiling station ${stationCode}:`, err);
    return {
      batchId: String(batch._id),
      stationCode,
      carrier,
      parcelCount: parcels.length,
      status: 'FAILED',
    };
  }
}
