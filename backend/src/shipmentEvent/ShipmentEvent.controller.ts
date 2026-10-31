// src/shipmentEvent/ShipmentEvent.controller.ts
// Thin Express controller for audit ledger recording, bulk ingest, query pagination, and timeline synthesis.
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
    return res.status(result.status).json(result);
  },
);

// Bulk record shipment events controller
export const bulkRecordShipmentEventsController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const result = await bulkRecordShipmentEventsService(merchantId, req.body);
    return res.status(result.status).json(result);
  },
);

// List shipment events with cursor pagination controller
export const listShipmentEventsController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const filter = (res.locals.query || req.query) as ListShipmentEventsFilter;
    const result = await listShipmentEventsService(merchantId, filter);
    return res.status(result.status).json(result);
  },
);

// Get shipment timeline controller
export const getShipmentTimelineController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const carrier = String(req.params.carrier);
    const trackingNumber = String(req.params.trackingNumber);
    const result = await getShipmentTimelineService(merchantId, carrier, trackingNumber);
    return res.status(result.status).json(result);
  },
);

// Get aggregate ledger metrics controller
export const getLedgerMetricsController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const filter = (res.locals.query || req.query) as LedgerMetricsFilter;
    const result = await getLedgerMetricsService(merchantId, filter);
    return res.status(result.status).json(result);
  },
);

// Aliases matching auth and shipment controller style
export const recordShipmentEvent = recordShipmentEventController;
export const bulkRecordShipmentEvents = bulkRecordShipmentEventsController;
export const listShipmentEvents = listShipmentEventsController;
export const getShipmentTimeline = getShipmentTimelineController;
export const getLedgerMetrics = getLedgerMetricsController;
