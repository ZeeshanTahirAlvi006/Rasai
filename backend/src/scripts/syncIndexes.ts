// src/scripts/syncIndexes.ts
// ─────────────────────────────────────────────────────────────
// Database Index Synchronization Script
//
// Essential for production environments where Mongoose's
// autoIndex is disabled. Can be executed as part of CI/CD
// deployment steps, Docker container entrypoints, or migrations.
// ─────────────────────────────────────────────────────────────

import { connectDatabase, disconnectDatabase } from '../config/database';
import {
  ShipmentEvent,
  Shipment,
  OutboxMessage,
  ConversationSession,
  InboundWaMessage,
  ManifestBatch,
  ImportBatch,
  ImportChunk,
  carrierHealthModel,
  MerchantWaTemplate,
  OpsAlert,
  CarrierStation,
  userModel,
  sessionModel,
  otpModel,
  MerchantCarrierCredential,
  CprDispute,
  CdrRecord,
} from '../models';

const models = [
  { name: 'ShipmentEvent', model: ShipmentEvent },
  { name: 'Shipment', model: Shipment },
  { name: 'OutboxMessage', model: OutboxMessage },
  { name: 'ConversationSession', model: ConversationSession },
  { name: 'InboundWaMessage', model: InboundWaMessage },
  { name: 'ManifestBatch', model: ManifestBatch },
  { name: 'ImportBatch', model: ImportBatch },
  { name: 'ImportChunk', model: ImportChunk },
  { name: 'CarrierHealth', model: carrierHealthModel },
  { name: 'MerchantWaTemplate', model: MerchantWaTemplate },
  { name: 'OpsAlert', model: OpsAlert },
  { name: 'CarrierStation', model: CarrierStation },
  { name: 'User', model: userModel },
  { name: 'Session', model: sessionModel },
  { name: 'Otp', model: otpModel },
  { name: 'MerchantCarrierCredential', model: MerchantCarrierCredential },
  { name: 'CprDispute', model: CprDispute },
  { name: 'CdrRecord', model: CdrRecord },
];

async function syncAllIndexes(): Promise<void> {
  const startTime = Date.now();
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🔄  MongoDB Index Synchronization Process Started');
  console.log('════════════════════════════════════════════════════════════════\n');

  await connectDatabase();

  let totalModelsSynced = 0;
  let totalErrors = 0;

  for (const { name, model } of models) {
    try {
      process.stdout.write(`⏳ Syncing indexes for [${name}] (${model.collection.collectionName})... `);

      // createIndexes builds indexes additively without dropping existing ones in production
      try {
        if (name === 'Otp') {
          await model.collection.dropIndex('otpHash_1_reason_1_createdAT_-1').catch(() => {});
        }
        await model.createIndexes();
      } catch (createErr: any) {
        // Handle index migration conflict when options or keys were updated (B2-RC-07)
        if (
          createErr.message?.includes('same name as the requested index') ||
          createErr.code === 85 ||
          createErr.code === 86 ||
          createErr.codeName === 'IndexOptionsConflict' ||
          createErr.codeName === 'IndexKeySpecsConflict'
        ) {
          const match = createErr.message?.match(/name:\s*"([^"]+)"/);
          if (match && match[1]) {
            process.stdout.write(`⚠️  Recreating updated index [${match[1]}]... `);
            await model.collection.dropIndex(match[1]).catch(() => {});
            await model.createIndexes();
          } else {
            throw createErr;
          }
        } else {
          throw createErr;
        }
      }

      const activeIndexes = await model.collection.indexes();
      const indexNames = activeIndexes.map((idx: any) => idx.name).join(', ');

      console.log('✅ Done');
      console.log(`   Active indexes (${activeIndexes.length}): ${indexNames}`);
      totalModelsSynced++;
    } catch (err: any) {
      console.log('❌ Failed');
      console.error(`   Error on [${name}]:`, err.message);
      totalErrors++;
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(`🏁  Synchronization Finished in ${durationSec}s`);
  console.log(`    Successfully synced: ${totalModelsSynced}/${models.length} collections`);
  if (totalErrors > 0) {
    console.error(`    Errors encountered:  ${totalErrors}`);
    throw new Error(`${totalErrors} collection(s) failed during index synchronization.`);
  }
  console.log('════════════════════════════════════════════════════════════════\n');
}

syncAllIndexes()
  .then(async () => {
    await disconnectDatabase();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('\n💥 Critical index synchronization error:', err.message);
    try {
      await disconnectDatabase();
    } catch {
      // ignore secondary errors during forced exit
    }
    process.exit(1);
  });
