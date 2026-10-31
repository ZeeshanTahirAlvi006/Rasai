// src/conversation/conversation.controller.ts
// Thin controller handlers for signed Meta WhatsApp webhooks and merchant conversation console.
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { config } from '../config/index';
import {
  verifyMetaSignature,
  parseInboundCustomerMessage,
} from './conversation.utils';
import {
  processInboundCustomerTurn,
  listConversationSessionsService,
  getConversationSessionDetailService,
  simulateInboundWhatsAppService,
  expireConversationSessionService,
} from './conversation.service';
import { AppError } from '../middleware/error';

/**
 * Meta Webhook Challenge Verification (GET /api/webhooks/whatsapp).
 */
export const verifyWhatsAppWebhookController = asyncHandler(
  async (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const expectedToken = config.meta.appSecret || process.env.META_WEBHOOK_VERIFY_TOKEN || 'ndr_webhook_token';

    if (mode === 'subscribe' && token === expectedToken) {
      return res.status(200).send(challenge);
    }

    throw new AppError(403, 'Webhook verification failed: invalid verify_token', 'forbidden');
  },
);

/**
 * Meta Signed Inbound Webhook Event Receiver (POST /api/webhooks/whatsapp).
 */
export const handleWhatsAppWebhookController = asyncHandler(
  async (req: Request, res: Response) => {
    const signature = req.header('X-Hub-Signature-256');
    const appSecret = config.meta.appSecret;

    // In production or when META_APP_SECRET is set, strictly verify raw byte HMAC signature (B3-RC-06)
    if (appSecret && config.nodeEnv !== 'test') {
      const isValid = verifyMetaSignature((req as any).rawBody, signature, appSecret);
      if (!isValid) {
        throw new AppError(401, 'Unauthorized: Invalid X-Hub-Signature-256', 'unauthorized_signature');
      }
    }

    // Fast-path: Ignore delivery status receipts in-memory (B3-BN-02)
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (value?.statuses && (!value?.messages || value.messages.length === 0)) {
      return res.status(200).json({ success: true, message: 'Status receipt ignored' });
    }

    const parsedTurn = parseInboundCustomerMessage(req.body);
    if (!parsedTurn) {
      return res.status(200).json({ success: true, message: 'No customer message to process' });
    }

    const result = await processInboundCustomerTurn(parsedTurn);
    return res.status(200).json({
      success: true,
      message: 'Inbound customer turn processed',
      data: result,
    });
  },
);

/**
 * List Merchant Conversation Sessions (GET /api/conversations).
 */
export const listConversationSessionsController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const result = await listConversationSessionsService(merchantId, req.query as any);
    return res.status(result.status).json(result);
  },
);

/**
 * Get Conversation Session Detail (GET /api/conversations/:id).
 */
export const getConversationSessionDetailController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const id = String(req.params.id);
    const result = await getConversationSessionDetailService(merchantId, id);
    return res.status(result.status).json(result);
  },
);

/**
 * Simulate Customer WhatsApp Message (POST /api/conversations/simulate).
 */
export const simulateInboundWhatsAppController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const result = await simulateInboundWhatsAppService(merchantId, req.body);
    return res.status(result.status).json(result);
  },
);

/**
 * Expire Conversation Session (POST /api/conversations/:id/expire).
 */
export const expireConversationSessionController = asyncHandler(
  async (req: Request, res: Response) => {
    const merchantId = req.user!.merchantId;
    const id = String(req.params.id);
    const result = await expireConversationSessionService(merchantId, id);
    return res.status(result.status).json(result);
  },
);
