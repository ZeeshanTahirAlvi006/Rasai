// test/setup.ts
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.JWT_SECRET = 'test-jwt-secret-very-secure-1234567890';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.META_PHONE_NUMBER_ID = 'test_phone_number_id';
process.env.META_ACCESS_TOKEN = 'test_access_token';
process.env.META_WABA_ID = 'test_waba_id';
process.env.META_APP_SECRET = 'test_app_secret';

import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import os from 'os';
import '../src/shipment/shipment.model.js';
import '../src/shipmentEvent/ShipmentEvent.model.js';
import '../src/models/OutboxMessage.js';
import '../src/importBatch/ImportBatch.model.js';
import '../src/importBatch/ImportChunk.model.js';
import '../src/models/MerchantWaTemplate.js';
import '../src/models/OpsAlert.js';
import '../src/models/ConversationSession.js';
import '../src/models/InboundWaMessage.js';
import '../src/manifestBatch/ManifestBatch.js';
import '../src/models/CarrierStation.js';
import '../src/models/MerchantCarrierCredential.js';
import '../src/models/CprDispute.js';
import '../src/models/CdrRecord.js';

let replSet: MongoMemoryReplSet | null = null;

beforeAll(async () => {
  // Start an in-memory replica set to support multi-document transactions in tests
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
  });
  const uri = replSet.getUri();
  await mongoose.connect(uri, {
    runtimeAdapters: { os },
  } as any);
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}, 60000);

afterAll(async () => {
  const { closeCarrierPoller } = await import('../src/healthCarrier/carrierPoller.queue.js');
  const { closeSharedRedisClient } = await import('../src/config/redis.js');
  await closeCarrierPoller().catch(() => {});
  await closeSharedRedisClient().catch(() => {});
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (replSet) {
    await replSet.stop();
  }
}, 60000);

afterEach(async () => {
  // Clean all collections between test cases
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
      await collections[key].deleteMany({});
    }
  }
});
