// src/manifestBatch/manifest.controller.ts
// Thin Express controller for Station Run-Sheet manifests, PDF/CSV downloads, and Tier 3 wa.me escalations.
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  listManifestBatchesService,
  getManifestBatchDetailService,
  listPendingManifestParcelsService,
  triggerManifestCompilationService,
  getManifestDownloadBufferService,
  getEscalationLinkService,
  listCarrierStationsService,
  upsertCarrierStationService,
  deleteCarrierStationService,
} from './manifest.service';

export const listManifestBatchesController = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.user!.merchantId;
  const result = await listManifestBatchesService(merchantId, req.query as any);
  return res.status(result.status).json(result);
});

export const getManifestBatchDetailController = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.user!.merchantId;
  const id = String(req.params.id);
  const result = await getManifestBatchDetailService(merchantId, id);
  return res.status(result.status).json(result);
});

export const listPendingManifestParcelsController = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.user!.merchantId;
  const result = await listPendingManifestParcelsService(merchantId, req.query as any);
  return res.status(result.status).json(result);
});

export const triggerManifestCompilationController = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.user!.merchantId;
  const result = await triggerManifestCompilationService(merchantId, req.body);
  return res.status(result.status).json(result);
});

export const downloadManifestPdfController = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.user!.merchantId;
  const id = String(req.params.id);
  const artifact = await getManifestDownloadBufferService(merchantId, id, 'pdf');

  res.setHeader('Content-Type', artifact.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${artifact.filename}"`);
  return res.send(artifact.buffer);
});

export const downloadManifestCsvController = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.user!.merchantId;
  const id = String(req.params.id);
  const artifact = await getManifestDownloadBufferService(merchantId, id, 'csv');

  res.setHeader('Content-Type', artifact.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${artifact.filename}"`);
  return res.send(artifact.buffer);
});

export const getEscalationLinkController = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.user!.merchantId;
  const shipmentId = String(req.params.shipmentId);
  const result = await getEscalationLinkService(merchantId, shipmentId);
  return res.status(result.status).json(result);
});

export const listCarrierStationsController = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.user!.merchantId;
  const carrier = req.query.carrier as any;
  const result = await listCarrierStationsService(merchantId, carrier);
  return res.status(result.status).json(result);
});

export const upsertCarrierStationController = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.user!.merchantId;
  const result = await upsertCarrierStationService(merchantId, req.body);
  return res.status(result.status).json(result);
});

export const deleteCarrierStationController = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.user!.merchantId;
  const id = String(req.params.id);
  const result = await deleteCarrierStationService(merchantId, id);
  return res.status(result.status).json(result);
});
