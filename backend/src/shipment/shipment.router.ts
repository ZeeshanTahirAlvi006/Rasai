// src/shipment/shipment.router.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import {
  bulkCreateShipmentsController,
  listShipmentsController,
  getShipmentController,
  updateShipmentController,
  cancelShipmentController,
} from './shipment.controller.js';
import {
  BulkCreateShipmentsSchema,
  ListShipmentsSchema,
  GetShipmentSchema,
  UpdateShipmentSchema,
  CancelShipmentSchema,
} from './shipment.schema.js';

const shipmentRouter = Router();

// Enforce authentication across all shipment management endpoints
shipmentRouter.use(requireAuth);

// Bulk ingestion
shipmentRouter.post(
  '/bulk',
  validate(BulkCreateShipmentsSchema),
  bulkCreateShipmentsController,
);

// Listing with cursor pagination & filtering
shipmentRouter.get(
  '/',
  validate(ListShipmentsSchema),
  listShipmentsController,
);

// Detail query with timeline
shipmentRouter.get(
  '/:id',
  validate(GetShipmentSchema),
  getShipmentController,
);

// Optimistic update of parcel metadata
shipmentRouter.patch(
  '/:id',
  validate(UpdateShipmentSchema),
  updateShipmentController,
);

// Formal cancellation via state engine
shipmentRouter.post(
  '/:id/cancel',
  validate(CancelShipmentSchema),
  cancelShipmentController,
);

export default shipmentRouter;
