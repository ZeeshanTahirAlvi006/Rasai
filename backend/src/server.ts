import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config/index.js';
import { connectDatabase } from './config/database.js';
import { buildCorsOptions } from './config/cors.js';
import authRouter from './auth/auth.router.js';
import { errorHandler } from './middleware/error.js';
import carrierRouter from '../src/healthCarrier/carrierHealth.router.js';
import shipmentRouter from './shipment/shipment.router.js';
import shipmentEventRouter from './shipmentEvent/ShipmentEvent.router.js';
import importBatchRouter from './importBatch/importBatch.router.js';

const app = express();

// Middlewares
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(buildCorsOptions(config.corsOrigins, config.isProd)));
app.use(express.json());

// Serve static test dashboard
app.use(express.static(path.join(__dirname, '..', 'public')));

// Routes
app.use("/api/carrier-health", carrierRouter);
app.use('/api/auth', authRouter);
app.use('/api/shipments', shipmentRouter);
app.use('/api/shipment-events', shipmentEventRouter);
app.use('/api/events', shipmentEventRouter);
app.use('/api/imports', importBatchRouter);
app.use('/api/v1/imports', importBatchRouter);

// Centralized error handler (must be last middleware)
app.use(errorHandler);

import { initializeAllCarriers } from './healthCarrier/carrierHealth.service.js';

// Start server after DB connection
async function startServer() {
  await connectDatabase();
  await initializeAllCarriers().catch((err) => console.error('Failed to initialize carriers:', err));
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
