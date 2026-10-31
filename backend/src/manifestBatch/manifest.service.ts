// src/manifestBatch/manifest.service.ts
// Service layer for Courier Run-Sheet Manifests, PDF/CSV downloads, and Tier 3 WhatsApp escalations.
import { Types } from 'mongoose';
import { ManifestBatch } from './ManifestBatch';
import { Shipment, type IShipment } from '../shipment/shipment.model';
import { CarrierStation, type ICarrierStation } from '../models/CarrierStation';
import { compileAndSendManifests, type CompileManifestsSummary } from './manifest.worker';
import { getManifestArtifact } from './manifest.delivery';
import { buildWhatsAppEscalationLink } from './manifest.generator';
import { decryptPhone, maskPhone } from '../utils/phone';
import { AppError } from '../middleware/error';
import type { Carrier } from '../types';

export interface ServiceResponse<T = any> {
  success: boolean;
  status: number;
  message: string;
  data: T;
  error: string | null;
}

export async function listManifestBatchesService(
  merchantId: Types.ObjectId,
  filter: { carrier?: Carrier; dateKey?: string; limit?: number; skip?: number } = {},
): Promise<ServiceResponse<any>> {
  const query: Record<string, any> = { merchantId };

  if (filter.carrier) query.carrier = filter.carrier;
  if (filter.dateKey) query.dateKey = filter.dateKey;

  const limit = Math.min(Math.max(Number(filter.limit) || 25, 1), 100);
  const skip = Math.max(Number(filter.skip) || 0, 0);

  const [batches, total, countsByStatus, pendingCount] = await Promise.all([
    ManifestBatch.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('_id merchantId carrier dateKey stationCode status runCount parcelCount totalCOD artifact driveUrl dispatchedAt createdAt updatedAt')
      .lean()
      .exec(),
    ManifestBatch.countDocuments(query),
    ManifestBatch.aggregate([
      { $match: { merchantId } },
      { $group: { _id: '$status', count: { $sum: 1 }, totalParcels: { $sum: '$parcelCount' } } },
    ]),
    Shipment.countDocuments({ merchantId, needsManifest: true }),
  ]);

  const summary = {
    SENT: 0,
    STARTED: 0,
    FAILED: 0,
    totalParcelsSent: 0,
    pendingParcelsCount: pendingCount,
  };

  countsByStatus.forEach((item: any) => {
    if (item._id in summary) {
      summary[item._id as keyof typeof summary] = item.count;
    }
    if (item._id === 'SENT') {
      summary.totalParcelsSent = item.totalParcels || 0;
    }
  });

  return {
    success: true,
    status: 200,
    message: 'Manifest batches retrieved',
    data: {
      batches,
      total,
      summary,
      limit,
      skip,
    },
    error: null,
  };
}

export async function getManifestBatchDetailService(
  merchantId: Types.ObjectId,
  id: string,
): Promise<ServiceResponse<any>> {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid manifest batch ID', 'invalid_id');
  }

  const batch = await ManifestBatch.findOne({
    _id: new Types.ObjectId(id),
    merchantId,
  })
    .select('_id merchantId carrier dateKey stationCode status runCount parcelCount totalCOD shipmentIds artifact driveUrl dispatchedAt leaseUntil claimToken createdAt updatedAt')
    .populate('shipmentIds', 'trackingNumber carrier destinationStationCode status orderValueCOD rescheduledDate customerCoordinates')
    .lean()
    .exec();

  if (!batch) {
    throw new AppError(404, 'Manifest batch not found', 'not_found');
  }

  return {
    success: true,
    status: 200,
    message: 'Manifest batch detail retrieved',
    data: batch,
    error: null,
  };
}

export async function listPendingManifestParcelsService(
  merchantId: Types.ObjectId,
  options: { limit?: number; skip?: number } = {},
): Promise<ServiceResponse<any>> {
  const limit = Math.min(Math.max(Number(options.limit) || 200, 1), 1000);
  const skip = Math.max(Number(options.skip) || 0, 0);

  const [shipments, total] = await Promise.all([
    Shipment.find({
      merchantId,
      needsManifest: true,
    })
      .sort({ carrier: 1, destinationStationCode: 1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select(
        '_id carrier destinationStationCode trackingNumber status orderValueCOD customerPhone customerPhoneHash rescheduledDate customerCoordinates lastManifestedAt',
      )
      .lean()
      .exec(),
    Shipment.countDocuments({ merchantId, needsManifest: true }),
  ]);

  // Load carrier station contacts for WhatsApp escalation linking
  const stations = await CarrierStation.find({ merchantId, isActive: true })
    .select('carrier stationCode managerWhatsAppPhone managerEmail')
    .lean()
    .exec();

  const stationMap = new Map<string, any>();
  stations.forEach((s) => stationMap.set(`${s.carrier}:${s.stationCode}`, s));

  const enriched = shipments.map((s) => {
    const code = (s.destinationStationCode || 'UNASSIGNED').toUpperCase();
    const contact = stationMap.get(`${s.carrier}:${code}`);
    let phonePlain: string | undefined = undefined;
    let phoneMasked = '****';

    if (s.customerPhone) {
      try {
        phonePlain = decryptPhone(s.customerPhone);
        phoneMasked = maskPhone(phonePlain);
      } catch {
        phoneMasked = '****';
      }
    }

    const escalationLink = buildWhatsAppEscalationLink(
      {
        trackingNumber: s.trackingNumber,
        carrier: s.carrier,
        destinationStationCode: code,
        orderValueCOD: s.orderValueCOD,
        rescheduledDate: s.rescheduledDate,
        customerPhonePlain: phonePlain,
        customerCoordinates: s.customerCoordinates,
      },
      contact?.managerWhatsAppPhone,
    );

    return {
      ...s,
      customerPhonePlain: phonePlain,
      customerPhoneMasked: phoneMasked,
      stationContact: contact || null,
      escalationLink,
    };
  });

  return {
    success: true,
    status: 200,
    message: 'Pending manifest parcels retrieved',
    data: {
      count: enriched.length,
      parcels: enriched,
    },
    error: null,
  };
}

export async function triggerManifestCompilationService(
  merchantId: Types.ObjectId,
  options: { carrier?: Carrier; stationCode?: string; forceRecompile?: boolean } = {},
): Promise<ServiceResponse<CompileManifestsSummary>> {
  const result = await compileAndSendManifests({
    merchantId,
    carrier: options.carrier,
    stationCode: options.stationCode,
    forceRecompile: options.forceRecompile,
  });

  return {
    success: true,
    status: 200,
    message: `Manifest run completed: processed ${result.stationsProcessed} stations, manifested ${result.totalParcelsManifested} parcels`,
    data: result,
    error: null,
  };
}

export async function getManifestDownloadBufferService(
  merchantId: Types.ObjectId,
  id: string,
  format: 'pdf' | 'csv',
): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid manifest batch ID', 'invalid_id');
  }

  const batch = await ManifestBatch.findOne({
    _id: new Types.ObjectId(id),
    merchantId,
  })
    .select('carrier stationCode dateKey pdfStorageKey csvStorageKey')
    .lean()
    .exec();

  if (!batch) {
    throw new AppError(404, 'Manifest batch not found', 'not_found');
  }

  const storageKey = format === 'pdf' ? batch.pdfStorageKey : batch.csvStorageKey;
  if (!storageKey) {
    throw new AppError(404, `No ${format.toUpperCase()} artifact key recorded for this manifest`, 'artifact_not_found');
  }

  const artifact = getManifestArtifact(storageKey);
  if (!artifact) {
    throw new AppError(404, `Manifest ${format.toUpperCase()} file not found in storage`, 'artifact_missing');
  }

  const filename = `run-sheet-${batch.carrier}-${batch.stationCode}-${batch.dateKey}.${format}`;
  return {
    buffer: artifact.buffer,
    contentType: artifact.contentType,
    filename,
  };
}

export async function getEscalationLinkService(
  merchantId: Types.ObjectId,
  shipmentId: string,
): Promise<ServiceResponse<any>> {
  if (!Types.ObjectId.isValid(shipmentId)) {
    throw new AppError(400, 'Invalid shipment ID', 'invalid_id');
  }

  const shipment = await Shipment.findOne({
    _id: new Types.ObjectId(shipmentId),
    merchantId,
  })
    .select(
      '_id carrier destinationStationCode trackingNumber status orderValueCOD customerPhone rescheduledDate customerCoordinates',
    )
    .lean()
    .exec();

  if (!shipment) {
    throw new AppError(404, 'Shipment not found', 'not_found');
  }

  const stationCode = (shipment.destinationStationCode || 'UNASSIGNED').toUpperCase();

  const stationContact = await CarrierStation.findOne({
    merchantId,
    carrier: shipment.carrier,
    stationCode,
    isActive: true,
  })
    .select('managerWhatsAppPhone managerEmail stationName')
    .lean()
    .exec();

  let plainPhone: string | undefined = undefined;
  if (shipment.customerPhone) {
    try {
      plainPhone = decryptPhone(shipment.customerPhone);
    } catch {
      plainPhone = undefined;
    }
  }

  const deepLink = buildWhatsAppEscalationLink(
    {
      trackingNumber: shipment.trackingNumber,
      carrier: shipment.carrier,
      destinationStationCode: stationCode,
      orderValueCOD: shipment.orderValueCOD,
      rescheduledDate: shipment.rescheduledDate,
      customerPhonePlain: plainPhone,
      customerCoordinates: shipment.customerCoordinates,
    },
    stationContact?.managerWhatsAppPhone,
  );

  return {
    success: true,
    status: 200,
    message: 'Escalation link generated',
    data: {
      shipmentId,
      carrier: shipment.carrier,
      stationCode,
      stationContact: stationContact || null,
      deepLink,
      coordinates: shipment.customerCoordinates || null,
    },
    error: null,
  };
}

// ─────────────────────────────────────────────────────────────
// Carrier Station Directory Management
// ─────────────────────────────────────────────────────────────

export async function listCarrierStationsService(
  merchantId: Types.ObjectId,
  carrier?: Carrier,
): Promise<ServiceResponse<ICarrierStation[]>> {
  const query: Record<string, any> = { merchantId };
  if (carrier) query.carrier = carrier;

  const stations = await CarrierStation.find(query)
    .sort({ carrier: 1, stationCode: 1 })
    .lean()
    .exec();

  return {
    success: true,
    status: 200,
    message: 'Carrier stations retrieved',
    data: stations as ICarrierStation[],
    error: null,
  };
}

export async function upsertCarrierStationService(
  merchantId: Types.ObjectId,
  input: {
    carrier: Carrier;
    stationCode: string;
    stationName: string;
    city?: string;
    managerEmail?: string;
    managerWhatsAppPhone?: string;
    isActive?: boolean;
  },
): Promise<ServiceResponse<ICarrierStation>> {
  const stationCode = input.stationCode.trim().toUpperCase();

  const updated = await CarrierStation.findOneAndUpdate(
    { merchantId, carrier: input.carrier, stationCode },
    {
      $set: {
        stationName: input.stationName.trim(),
        city: input.city?.trim(),
        managerEmail: input.managerEmail?.trim().toLowerCase(),
        managerWhatsAppPhone: input.managerWhatsAppPhone?.trim(),
        isActive: input.isActive != null ? input.isActive : true,
        updatedAt: new Date(),
      },
    },
    { upsert: true, returnDocument: 'after' },
  );

  return {
    success: true,
    status: 200,
    message: `Station ${stationCode} configured for ${input.carrier}`,
    data: updated as ICarrierStation,
    error: null,
  };
}

export async function deleteCarrierStationService(
  merchantId: Types.ObjectId,
  id: string,
): Promise<ServiceResponse<any>> {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid station ID', 'invalid_id');
  }

  const deleted = await CarrierStation.findOneAndDelete({
    _id: new Types.ObjectId(id),
    merchantId,
  });

  if (!deleted) {
    throw new AppError(404, 'Station not found', 'not_found');
  }

  return {
    success: true,
    status: 200,
    message: 'Carrier station deleted',
    data: deleted,
    error: null,
  };
}
