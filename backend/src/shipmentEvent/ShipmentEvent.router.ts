import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import {
  recordShipmentEventController,
  bulkRecordShipmentEventsController,
  listShipmentEventsController,
  getShipmentTimelineController,
  getLedgerMetricsController,
} from './ShipmentEvent.controller.js';
import {
  RecordShipmentEventSchema,
  BulkRecordEventsSchema,
  ListShipmentEventsSchema,
  GetShipmentTimelineSchema,
  GetLedgerMetricsSchema,
} from './ShipmentEvent.schema.js';

const shipmentEventRouter = Router();

// Enforce authentication across all shipment event management endpoints
shipmentEventRouter.use(requireAuth);

// Record single shipment event (e.g. from carrier webhook / single poller update)
shipmentEventRouter.post(
  '/',
  validate(RecordShipmentEventSchema),
  recordShipmentEventController,
);

// Bulk ingest shipment events (up to 500 items per batch)
shipmentEventRouter.post(
  '/bulk',
  validate(BulkRecordEventsSchema),
  bulkRecordShipmentEventsController,
);

// Paginated listing of audit ledger events with keyset cursor pagination & filtering
shipmentEventRouter.get(
  '/',
  validate(ListShipmentEventsSchema),
  listShipmentEventsController,
);

// Telemetry and audit aggregation metrics (counts by disposition and source)
shipmentEventRouter.get(
  '/metrics',
  validate(GetLedgerMetricsSchema),
  getLedgerMetricsController,
);

// Specific parcel chronological event timeline by carrier & tracking number
shipmentEventRouter.get(
  '/timeline/:carrier/:trackingNumber',
  validate(GetShipmentTimelineSchema),
  getShipmentTimelineController,
);

export default shipmentEventRouter;
