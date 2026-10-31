// src/outbox/outbox.router.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import {
  listOutboxMessagesController,
  getOutboxMessageDetailController,
  triggerRelayTickController,
  dispatchOutboxMessageController,
  getGovernorStatusController,
  pauseGovernorController,
  resumeGovernorController,
  listMerchantTemplatesController,
  upsertMerchantTemplateController,
  listOpsAlertsController,
  resolveOpsAlertController,
} from './outbox.controller';

const outboxRouter = Router();

outboxRouter.use(requireAuth);

// Governor controls
outboxRouter.get('/governor/status', getGovernorStatusController);
outboxRouter.post('/governor/pause', pauseGovernorController);
outboxRouter.post('/governor/resume', resumeGovernorController);

// Relay triggers
outboxRouter.post('/relay/trigger', triggerRelayTickController);

// Templates catalog
outboxRouter.get('/templates', listMerchantTemplatesController);
outboxRouter.post('/templates', upsertMerchantTemplateController);

// Ops Alerts
outboxRouter.get('/alerts', listOpsAlertsController);
outboxRouter.post('/alerts/:id/resolve', resolveOpsAlertController);

// Message queries & dispatch
outboxRouter.get('/', listOutboxMessagesController);
outboxRouter.get('/:id', getOutboxMessageDetailController);
outboxRouter.post('/:id/dispatch', dispatchOutboxMessageController);

export default outboxRouter;
