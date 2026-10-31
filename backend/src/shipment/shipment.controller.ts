// src/shipment/shipment.controller.ts
// Thin Express controller for parcel ingestion, query pagination, metadata patching, and cancellation.
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  bulkCreateShipmentsService,
  listShipmentsService,
  getShipmentService,
  updateShipmentService,
  cancelShipmentService,
  type ListShipmentsFilter,
} from './shipment.service.js';

// Bulk create shipments controller
export const bulkCreateShipmentsController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const { shipments } = req.body;
    const result = await bulkCreateShipmentsService(merchantId, shipments);
    return res.status(result.status).json(result);
  },
);

// List shipments controller
export const listShipmentsController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const filter = (res.locals.query || req.query) as ListShipmentsFilter;
    const result = await listShipmentsService(merchantId, filter);
    return res.status(result.status).json(result);
  },
);

// Get single shipment details controller
export const getShipmentController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const id = String(req.params.id);
    const result = await getShipmentService(merchantId, id);
    return res.status(result.status).json(result);
  },
);

// Optimistically update shipment metadata controller
export const updateShipmentController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const id = String(req.params.id);
    const { expectedVersion, ...patch } = req.body;
    const result = await updateShipmentService(merchantId, id, expectedVersion, patch);
    return res.status(result.status).json(result);
  },
);

// Cancel shipment controller
export const cancelShipmentController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const id = String(req.params.id);
    const result = await cancelShipmentService(merchantId, id);
    return res.status(result.status).json(result);
  },
);

// Aliases matching auth and carrierHealth style
export const bulkCreateShipments = bulkCreateShipmentsController;
export const listShipments = listShipmentsController;
export const getShipment = getShipmentController;
export const updateShipment = updateShipmentController;
export const cancelShipment = cancelShipmentController;
