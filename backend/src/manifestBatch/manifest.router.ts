// src/manifestBatch/manifest.router.ts
// Express route definitions for Courier Station Run-Sheets, PDF/CSV downloads, and Tier 3 wa.me escalations.
import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import {
  listManifestBatchesController,
  getManifestBatchDetailController,
  listPendingManifestParcelsController,
  triggerManifestCompilationController,
  downloadManifestPdfController,
  downloadManifestCsvController,
  getEscalationLinkController,
  listCarrierStationsController,
  upsertCarrierStationController,
  deleteCarrierStationController,
} from './manifest.controller';

const manifestRouter = Router();

// Protect all manifest operations with authentication
manifestRouter.use(requireAuth);

// Static sub-paths first to avoid collision with :id
manifestRouter.get('/pending-parcels', listPendingManifestParcelsController);
manifestRouter.post('/trigger', triggerManifestCompilationController);

// Station Contact Directory
manifestRouter.get('/stations', listCarrierStationsController);
manifestRouter.post('/stations', upsertCarrierStationController);
manifestRouter.delete('/stations/:id', deleteCarrierStationController);

// Single Shipment Escalation Deep-Link
manifestRouter.get('/escalation/:shipmentId', getEscalationLinkController);

// Batch History & Downloads
manifestRouter.get('/', listManifestBatchesController);
manifestRouter.get('/:id', getManifestBatchDetailController);
manifestRouter.get('/:id/download/pdf', downloadManifestPdfController);
manifestRouter.get('/:id/download/csv', downloadManifestCsvController);

export default manifestRouter;
