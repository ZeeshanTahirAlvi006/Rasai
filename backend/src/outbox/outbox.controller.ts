// src/outbox/outbox.controller.ts
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  listOutboxMessagesService,
  getOutboxMessageDetailService,
  triggerRelayTickService,
  dispatchOutboxMessageService,
  getGovernorStatusService,
  pauseGovernorService,
  resumeGovernorService,
  listMerchantTemplatesService,
  upsertMerchantTemplateService,
  listOpsAlertsService,
  resolveOpsAlertService,
} from './outbox.service';

export const listOutboxMessagesController = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.user!.merchantId;
  const result = await listOutboxMessagesService(merchantId, req.query as any);
  return res.status(result.status).json({
    success: result.success,
    message: result.message,
    data: result.data,
  });
});

export const getOutboxMessageDetailController = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.user!.merchantId;
  const id = String(req.params.id);
  const result = await getOutboxMessageDetailService(merchantId, id);
  return res.status(result.status).json({
    success: result.success,
    message: result.message,
    data: result.data,
  });
});

export const triggerRelayTickController = asyncHandler(async (req: Request, res: Response) => {
  const batch = Number(req.body.batch) || 50;
  const result = await triggerRelayTickService(batch);
  return res.status(result.status).json({
    success: result.success,
    message: result.message,
    data: result.data,
  });
});

export const dispatchOutboxMessageController = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.user!.merchantId;
  const id = String(req.params.id);
  const result = await dispatchOutboxMessageService(merchantId, id);
  return res.status(result.status).json({
    success: result.success,
    message: result.message,
    data: result.data,
  });
});

export const getGovernorStatusController = asyncHandler(async (_req: Request, res: Response) => {
  const result = await getGovernorStatusService();
  return res.status(result.status).json({
    success: result.success,
    message: result.message,
    data: result.data,
  });
});

export const pauseGovernorController = asyncHandler(async (req: Request, res: Response) => {
  const { channel = 'META_WHATSAPP', durationMs = 600_000 } = req.body;
  const result = await pauseGovernorService(channel, durationMs);
  return res.status(result.status).json({
    success: result.success,
    message: result.message,
    data: result.data,
  });
});

export const resumeGovernorController = asyncHandler(async (req: Request, res: Response) => {
  const { channel = 'META_WHATSAPP' } = req.body;
  const result = await resumeGovernorService(channel);
  return res.status(result.status).json({
    success: result.success,
    message: result.message,
    data: result.data,
  });
});

export const listMerchantTemplatesController = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.user!.merchantId;
  const result = await listMerchantTemplatesService(merchantId);
  return res.status(result.status).json({
    success: result.success,
    message: result.message,
    data: result.data,
  });
});

export const upsertMerchantTemplateController = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.user!.merchantId;
  const result = await upsertMerchantTemplateService(merchantId, req.body);
  return res.status(result.status).json({
    success: result.success,
    message: result.message,
    data: result.data,
  });
});

export const listOpsAlertsController = asyncHandler(async (_req: Request, res: Response) => {
  const result = await listOpsAlertsService();
  return res.status(result.status).json({
    success: result.success,
    message: result.message,
    data: result.data,
  });
});

export const resolveOpsAlertController = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const result = await resolveOpsAlertService(id);
  return res.status(result.status).json({
    success: result.success,
    message: result.message,
    data: result.data,
  });
});
