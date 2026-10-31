// src/healthCarrier/carrierHealth.router.ts
// Express route definitions for carrier circuit breaker health, telemetry, poller controls, credentials, and manual overrides.
import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  checkAvailabilityController,
  acquireExecutionPermissionController,
  recordSuccessController,
  recordFailureController,
  executeWithBreakerController,
  trackShipmentController,
  getAllCarriersHealthController,
  resetCarrierBreakerController,
  forceTripBreakerController,
  getPollerStatusController,
  triggerPollerSweepController,
  listCarrierCredentialsController,
  upsertCarrierCredentialController,
  deleteCarrierCredentialController,
  simulateCarrierWebhookController,
  receiveCarrierWebhookController,
} from "./carrierHealth.controller.js";
import {
  CarrierParamSchema,
  RecordFailureSchema,
  ExecuteBreakerSchema,
  TrackShipmentSchema,
  TriggerPollerSchema,
  UpsertCredentialSchema,
  SimulateWebhookSchema,
} from "./carrierHealth.schema.js";

const carrierRouter = Router();

// ── Public Carrier Webhook Router (Mounted on /api/webhooks/carriers) ──
export const carrierWebhookRouter = Router();
carrierWebhookRouter.post("/:carrier", receiveCarrierWebhookController);

// ── Authenticated Control-Plane Routes (/api/carrier-health) ──
carrierRouter.use(requireAuth);

// Get overall summary of all carriers
carrierRouter.get("/summary", getAllCarriersHealthController);

// Poller status & manual trigger
carrierRouter.get("/poll/status", getPollerStatusController);
carrierRouter.post("/poll/trigger", validate(TriggerPollerSchema), triggerPollerSweepController);

// Merchant carrier credentials CRUD
carrierRouter.get("/credentials", listCarrierCredentialsController);
carrierRouter.post("/credentials", validate(UpsertCredentialSchema), upsertCarrierCredentialController);
carrierRouter.delete("/credentials/:carrier", validate(CarrierParamSchema), deleteCarrierCredentialController);

// Webhook simulation (Console QA)
carrierRouter.post("/webhooks/simulate", validate(SimulateWebhookSchema), simulateCarrierWebhookController);

// Single carrier availability
carrierRouter.get("/:carrier/availability", validate(CarrierParamSchema), checkAvailabilityController);

// Check permission under breaker
carrierRouter.post("/:carrier/permission", validate(CarrierParamSchema), acquireExecutionPermissionController);

// Record success
carrierRouter.post("/:carrier/success", validate(CarrierParamSchema), recordSuccessController);

// Record failure
carrierRouter.post("/:carrier/failure", validate(RecordFailureSchema), recordFailureController);

// Execute request under breaker pattern
carrierRouter.post("/:carrier/execute", validate(ExecuteBreakerSchema), executeWithBreakerController);

// Track shipment under breaker
carrierRouter.post("/track", validate(TrackShipmentSchema), trackShipmentController);

// Manually reset a carrier circuit breaker
carrierRouter.post("/:carrier/reset", validate(CarrierParamSchema), resetCarrierBreakerController);

// Manually force trip a carrier circuit breaker
carrierRouter.post("/:carrier/trip", validate(CarrierParamSchema), forceTripBreakerController);

export default carrierRouter;
