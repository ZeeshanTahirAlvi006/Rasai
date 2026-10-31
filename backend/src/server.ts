// src/server.ts
// HTTP server entrypoint, middleware mounting, queue daemon lifecycles, and graceful shutdown.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config/index.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { closeSharedRedisClient } from './config/redis.js';
import { buildCorsOptions } from './config/cors.js';
import authRouter from './auth/auth.router.js';
import { errorHandler } from './middleware/error.js';
import carrierRouter from '../src/healthCarrier/carrierHealth.router.js';
import shipmentRouter from './shipment/shipment.router.js';
import shipmentEventRouter from './shipmentEvent/ShipmentEvent.router.js';
import importBatchRouter from './importBatch/importBatch.router.js';
import outboxRouter from './outbox/outbox.router.js';
import conversationRouter, { webhookRouter } from './conversation/conversation.router.js';
import manifestRouter from './manifestBatch/manifest.router.js';
import disputeRouter from './dispute/dispute.router.js';
import { initializeAllCarriers } from './healthCarrier/carrierHealth.service.js';
import { closeBulkImportQueue, startBulkImportWorker } from './importBatch/importBatch.queue.js';
import { getOutboxQueue, startOutboxWorker, closeOutboxQueue } from './outbox/outbox.queue.js';
import { startOutboxRelayDaemon, stopOutboxRelayDaemon } from './outbox/outbox.relay.js';
import { startManifestWorker, scheduleManifestJob, closeManifestQueue } from './manifestBatch/manifest.queue.js';
import { startCarrierPollerWorker, scheduleCarrierPoller, closeCarrierPoller } from './healthCarrier/index.js';
import { scheduleDisputeSweeper, closeDisputeQueue } from './dispute/dispute.queue.js';
import { startDisputeWorker } from './dispute/dispute.worker.js';

const app = express();

// Middlewares
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(buildCorsOptions(config.corsOrigins, config.isProd)));
// Preserve raw byte stream for Meta webhook HMAC-SHA256 signature verification (B3-RC-06)
app.use(
  express.json({
    limit: '2mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(
  express.urlencoded({
    extended: true,
    limit: '2mb',
    verify: (req: any, _res, buf) => {
      if (!req.rawBody) {
        req.rawBody = buf;
      }
    },
  }),
);

// Serve static test dashboard
app.use(express.static(path.join(__dirname, '..', 'public')));

// Routes
app.use('/api/carrier-health', carrierRouter);
app.use('/api/auth', authRouter);
app.use('/api/shipments', shipmentRouter);
app.use('/api/shipment-events', shipmentEventRouter);
app.use('/api/events', shipmentEventRouter);
app.use('/api/imports', importBatchRouter);
app.use('/api/v1/imports', importBatchRouter);
app.use('/api/outbox', outboxRouter);
app.use('/api/webhooks', webhookRouter);
app.use('/api/conversations', conversationRouter);
app.use('/api/manifests', manifestRouter);
app.use('/api/disputes', disputeRouter);

// Centralized error handler (must be last middleware)
app.use(errorHandler);

// Start server after DB connection
async function startServer() {
  await connectDatabase();
  await initializeAllCarriers().catch((err) => console.error('Failed to initialize carriers:', err));

  if (config.nodeEnv !== 'test') {
    startBulkImportWorker();
    startOutboxWorker();
    const outboxQueue = getOutboxQueue();
    startOutboxRelayDaemon(outboxQueue);
    startManifestWorker();
    await scheduleManifestJob().catch((err) => console.error('Failed to schedule manifest job:', err));
    startCarrierPollerWorker();
    await scheduleCarrierPoller().catch((err) => console.error('Failed to schedule poller:', err));
    startDisputeWorker();
    await scheduleDisputeSweeper().catch((err) => console.error('Failed to schedule dispute sweeper:', err));
  }

  const server = app.listen(config.port, () => {
    console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
  });

  const gracefulShutdown = async (signal: string) => {
    console.log(`Received ${signal}. Gracefully shutting down...`);
    server.close(async () => {
      console.log('HTTP server closed.');
      await stopOutboxRelayDaemon().catch(() => {});
      await closeOutboxQueue().catch(() => {});
      await closeManifestQueue().catch(() => {});
      await closeBulkImportQueue().catch(() => {});
      await closeCarrierPoller().catch(() => {});
      await closeDisputeQueue().catch(() => {});
      await closeSharedRedisClient().catch(() => {});
      await disconnectDatabase().catch(() => {});
      console.log('Graceful shutdown complete.');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
