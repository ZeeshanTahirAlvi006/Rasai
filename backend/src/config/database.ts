// src/config/database.ts
import mongoose from 'mongoose';
import { config } from './index';

const MAX_CONNECT_ATTEMPTS = 5;

const options: mongoose.ConnectOptions = {
  appName: 'backend', // shows up in Mongo logs / Atlas profiler
  maxPoolSize: 100,
  minPoolSize: 10,
  connectTimeoutMS: 10_000,
  serverSelectionTimeoutMS: 10_000, // fail fast instead of hanging
  socketTimeoutMS: 45_000,
  retryWrites: true,
  autoIndex: !config.isProd, //auto index only in dev
};

// Register listeners once, at module load (not per connect attempt).
// The driver reconnects on its own; these just make it visible.
mongoose.connection.on('error', (err) =>
  console.error('MongoDB error:', err.message),
);
mongoose.connection.on('disconnected', () =>
  console.warn('MongoDB disconnected'),
);
mongoose.connection.on('reconnected', () =>
  console.log('MongoDB reconnected'),
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function connectDatabase(): Promise<typeof mongoose> {
  // Avoid silently accepting unknown fields in query filters.
  mongoose.set('strictQuery', true);

  // Warn if production traffic may be going over plaintext.
  if (
    config.isProd &&
    config.mongoUri.startsWith('mongodb://') &&
    !/[?&]tls=true|[?&]ssl=true/i.test(config.mongoUri)
  ) {
    console.warn('MongoDB: production URI does not enable TLS (tls=true)');
  }

  // Retry the *initial* connection (e.g. Mongo still booting in Docker).
  for (let attempt = 1; ; attempt++) {
    try {
      await mongoose.connect(config.mongoUri, options);
      break;
    } catch (err) {
      // Log name + message only; never the URI (it contains credentials).
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : 'unknown error';
      if (attempt >= MAX_CONNECT_ATTEMPTS) {
        console.error(`MongoDB: giving up after ${attempt} attempts (${msg})`);
        throw err; // let the process exit / orchestrator restart it
      }
      const delay = Math.min(1000 * 2 ** (attempt - 1), 10_000);
      console.warn(
        `MongoDB: connect attempt ${attempt}/${MAX_CONNECT_ATTEMPTS} failed (${msg}); retrying in ${delay}ms`,
      );
      await sleep(delay);
    }
  }

  const { host, name } = mongoose.connection;
  console.log(`Connected to MongoDB (host: ${host}, db: ${name})`);
  await warnIfTransactionsUnsupported();
  return mongoose;
}

let transactionsSupported: boolean | null = null;

export function areTransactionsSupported(): boolean {
  // If not yet evaluated, default to true so replica sets use transactions right away.
  return transactionsSupported !== false;
}

export function setTransactionsSupported(supported: boolean): void {
  transactionsSupported = supported;
}

// applyEvent depends on multi-document transactions when running on a replica set (e.g. Atlas).
// On standalone instances (common in local development), we detect this and fall back to
// atomic optimistic-concurrency operations rather than crashing with MongoServerError code 20.
async function warnIfTransactionsUnsupported(): Promise<void> {
  try {
    const admin = mongoose.connection.db!.admin();
    const hello = await admin.command({ hello: 1 });
    const isReplicaOrMongos = Boolean(hello.setName || hello.msg === 'isdbgrid');
    transactionsSupported = isReplicaOrMongos;

    if (isReplicaOrMongos) {
      console.log('MongoDB: Replica set/mongos detected — multi-document transactions enabled.');
    } else {
      console.warn(
        'MongoDB: Standalone instance detected (no replica set). Transactions disabled; applying events with optimistic concurrency fallback.',
      );
    }
  } catch (err) {
    try {
      const isMaster = await mongoose.connection.db!.admin().command({ isMaster: 1 });
      const isReplicaOrMongos = Boolean(isMaster.setName || isMaster.msg === 'isdbgrid');
      transactionsSupported = isReplicaOrMongos;
    } catch {
      transactionsSupported = false;
    }
    console.warn('MongoDB: could not determine replica-set status:', err instanceof Error ? err.message : err);
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) return; // already disconnected
  await mongoose.disconnect(); // waits for in-flight operations
  console.log('Disconnected from MongoDB');
}