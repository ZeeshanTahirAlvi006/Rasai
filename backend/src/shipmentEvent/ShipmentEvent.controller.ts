import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  recordShipmentEventService,
  bulkRecordShipmentEventsService,
  listShipmentEventsService,
  getShipmentTimelineService,
  getLedgerMetricsService,
  type ListShipmentEventsFilter,
  type LedgerMetricsFilter,
} from './ShipmentEvent.service.js';

// Record single shipment event controller
export const recordShipmentEventController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const result = await recordShipmentEventService(merchantId, req.body);
    const response = {
      success: result?.success,
      message: result?.message,
      data: result?.data,
      error: result?.error,
    };
    return res.status(result?.status as number).json(response);
  },
);

// Bulk record shipment events controller
export const bulkRecordShipmentEventsController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const result = await bulkRecordShipmentEventsService(merchantId, req.body);
    const response = {
      success: result?.success,
      message: result?.message,
      data: result?.data,
      error: result?.error,
    };
    return res.status(result?.status as number).json(response);
  },
);

// List shipment events with cursor pagination controller
export const listShipmentEventsController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const filter = (res.locals.query || req.query) as ListShipmentEventsFilter;
    const result = await listShipmentEventsService(merchantId, filter);
    const response = {
      success: result?.success,
      message: result?.message,
      data: result?.data,
      error: result?.error,
    };
    return res.status(result?.status as number).json(response);
  },
);

// Get shipment timeline controller
export const getShipmentTimelineController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const { carrier, trackingNumber } = req.params;
    const result = await getShipmentTimelineService(merchantId, carrier as string, trackingNumber as string);
    const response = {
      success: result?.success,
      message: result?.message,
      data: result?.data,
      error: result?.error,
    };
    return res.status(result?.status as number).json(response);
  },
);

// Get aggregate ledger metrics controller
export const getLedgerMetricsController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const filter = (res.locals.query || req.query) as LedgerMetricsFilter;
    const result = await getLedgerMetricsService(merchantId, filter);
    const response = {
      success: result?.success,
      message: result?.message,
      data: result?.data,
      error: result?.error,
    };
    return res.status(result?.status as number).json(response);
  },
);

// Aliases matching auth and shipment controller style
export const recordShipmentEvent = recordShipmentEventController;
export const bulkRecordShipmentEvents = bulkRecordShipmentEventsController;
export const listShipmentEvents = listShipmentEventsController;
export const getShipmentTimeline = getShipmentTimelineController;
export const getLedgerMetrics = getLedgerMetricsController;
