// src/dispute/dispute.controller.ts
// Thin Express 5 controller delegating dispute requests to dispute.service

import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import * as disputeService from './dispute.service';

function getMerchantId(req: Request): string {
  const user = (req as any).user;
  return String(user?.merchantId || user?._id || user?.id);
}

export const listDisputes = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = getMerchantId(req);
  const result = await disputeService.listDisputesService(merchantId, req.query as any);
  res.status(result.status).json(result);
});

export const getDisputeById = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = getMerchantId(req);
  const disputeId = String(req.params.id);
  const result = await disputeService.getDisputeByIdService(merchantId, disputeId);
  res.status(result.status).json(result);
});

export const evaluateShipmentDispute = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = getMerchantId(req);
  const shipmentId = String(req.params.shipmentId);
  const result = await disputeService.evaluateCprDisputeService(merchantId, shipmentId);
  res.status(result.status).json(result);
});

export const submitDispute = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = getMerchantId(req);
  const disputeId = String(req.params.id);
  const notes = req.body?.notes ? String(req.body.notes) : undefined;
  const result = await disputeService.submitDisputeService(merchantId, disputeId, notes);
  res.status(result.status).json(result);
});

export const settleDispute = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = getMerchantId(req);
  const disputeId = String(req.params.id);
  const amount = Number(req.body.settlementAmount);
  const notes = req.body?.notes ? String(req.body.notes) : undefined;
  const result = await disputeService.settleDisputeService(merchantId, disputeId, amount, notes);
  res.status(result.status).json(result);
});

export const retractDispute = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = getMerchantId(req);
  const disputeId = String(req.params.id);
  const reason = String(req.body.reason);
  const notes = req.body?.notes ? String(req.body.notes) : undefined;
  const result = await disputeService.retractDisputeService(merchantId, disputeId, reason, notes);
  res.status(result.status).json(result);
});

export const getDisputeKpiSummary = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = getMerchantId(req);
  const result = await disputeService.getDisputeKpiSummaryService(merchantId);
  res.status(result.status).json(result);
});

export const uploadCdrCallLogs = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = getMerchantId(req);
  const csvContent = String(req.body.csvContent);
  const result = await disputeService.ingestCdrCallLogsService(merchantId, csvContent);
  res.status(result.status).json(result);
});

export const triggerSweeper = asyncHandler(async (req: Request, res: Response) => {
  const result = await disputeService.sweepExpiringDisputesService();
  res.status(result.status).json(result);
});
