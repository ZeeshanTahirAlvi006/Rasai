// src/shipment/shipment.controller.ts
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
    const response = {
      success: result?.success,
      message: result?.message,
      data: result?.data,
      error: result?.error,
    };
    return res.status(result?.status as number).json(response);
  },
);

// List shipments controller
export const listShipmentsController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const filter = (res.locals.query || req.query) as ListShipmentsFilter;

    const result = await listShipmentsService(merchantId, filter);
    const response = {
      success: result?.success,
      message: result?.message,
      data: result?.data,
      error: result?.error,
    };
    return res.status(result?.status as number).json(response);
  },
);

// Get single shipment details controller
export const getShipmentController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const id = req.params.id as string;

    const result = await getShipmentService(merchantId, id);
    const response = {
      success: result?.success,
      message: result?.message,
      data: result?.data,
      error: result?.error,
    };
    return res.status(result?.status as number).json(response);
  },
);

// Optimistically update shipment metadata controller
export const updateShipmentController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const id = req.params.id as string;
    const { expectedVersion, ...patch } = req.body;

    const result = await updateShipmentService(merchantId, id, expectedVersion, patch);
    const response = {
      success: result?.success,
      message: result?.message,
      data: result?.data,
      error: result?.error,
    };
    return res.status(result?.status as number).json(response);
  },
);

// Cancel shipment controller
export const cancelShipmentController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const id = req.params.id as string;

    const result = await cancelShipmentService(merchantId, id);
    const response = {
      success: result?.success,
      message: result?.message,
      data: result?.data,
      error: result?.error,
    };
    return res.status(result?.status as number).json(response);
  },
);

// Aliases matching auth and carrierHealth style
export const bulkCreateShipments = bulkCreateShipmentsController;
export const listShipments = listShipmentsController;
export const getShipment = getShipmentController;
export const updateShipment = updateShipmentController;
export const cancelShipment = cancelShipmentController;
