// src/conversation/conversation.router.ts
// Express route definitions for WhatsApp webhook listeners and merchant conversation console.
import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import {
  verifyWhatsAppWebhookController,
  handleWhatsAppWebhookController,
  listConversationSessionsController,
  getConversationSessionDetailController,
  simulateInboundWhatsAppController,
  expireConversationSessionController,
} from './conversation.controller';
import { receiveCarrierWebhookController } from '../healthCarrier/carrierHealth.controller.js';

// 1. Webhook Router (public, unauthenticated for Meta Cloud API and carrier callbacks)
export const webhookRouter = Router();
webhookRouter.get('/whatsapp', verifyWhatsAppWebhookController);
webhookRouter.post('/whatsapp', handleWhatsAppWebhookController);
webhookRouter.post('/carriers/:carrier', receiveCarrierWebhookController);

// 2. Merchant Conversation Router (protected by requireAuth)
const conversationRouter = Router();
conversationRouter.use(requireAuth);

conversationRouter.get('/', listConversationSessionsController);
conversationRouter.get('/:id', getConversationSessionDetailController);
conversationRouter.post('/simulate', simulateInboundWhatsAppController);
conversationRouter.post('/:id/expire', expireConversationSessionController);

export default conversationRouter;
