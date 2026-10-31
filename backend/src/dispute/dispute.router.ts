// src/dispute/dispute.router.ts
// Express router for CPR Margin Defense and dispute management endpoints

import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { validate } from '../middleware/validate';
import {
  ListDisputesSchema,
  DisputeIdParamSchema,
  ShipmentIdParamSchema,
  SubmitDisputeSchema,
  SettleDisputeSchema,
  RetractDisputeSchema,
  UploadCdrSchema,
} from './dispute.schema';
import * as controller from './dispute.controller';

const disputeRouter = Router();

// All dispute endpoints enforce authentication
disputeRouter.use(requireAuth);

// Financial KPI metrics summary (B5-BN-05)
disputeRouter.get('/kpi/summary', controller.getDisputeKpiSummary);

// Manual trigger for settlement cutoff sweeper
disputeRouter.post('/sweeper/trigger', controller.triggerSweeper);

// Ingest CDR call-log records
disputeRouter.post('/call-logs/upload', validate(UploadCdrSchema), controller.uploadCdrCallLogs);

// Paginated dispute listing
disputeRouter.get('/', validate(ListDisputesSchema), controller.listDisputes);

// Evaluate/re-score dispute for a specific shipment
disputeRouter.post('/evaluate/:shipmentId', validate(ShipmentIdParamSchema), controller.evaluateShipmentDispute);

// Single dispute detail view
disputeRouter.get('/:id', validate(DisputeIdParamSchema), controller.getDisputeById);

// Submit dispute to courier
disputeRouter.post('/:id/submit', validate(SubmitDisputeSchema), controller.submitDispute);

// Record courier settlement
disputeRouter.post('/:id/settle', validate(SettleDisputeSchema), controller.settleDispute);

// Formally retract dispute
disputeRouter.post('/:id/retract', validate(RetractDisputeSchema), controller.retractDispute);

export default disputeRouter;
