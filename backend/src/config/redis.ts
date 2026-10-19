// src/config/redis.ts
// ─────────────────────────────────────────────────────────────
// Redis connection for BullMQ. No correctness dependency —
// a Redis restart loses in-flight jobs, which the relay and
// poller rebuild from Mongo state.
// ─────────────────────────────────────────────────────────────

// src/config/redis.ts
import IORedis from 'ioredis';
import { config } from './index';

if (config.isProd && (!config.redis.password || !config.redis.tls)) {
  console.warn(
    'Redis: running in production without ' +
    [!config.redis.password && 'a password', !config.redis.tls && 'TLS']
      .filter(Boolean)
      .join(' or ') +
    ' (fine only on a private network)',
  );
}

/**
 * Creates a new Redis connection. Call once per BullMQ Queue / Worker /
 * QueueEvents: Workers use blocking commands and need their own connection.
 */
export function createRedisConnection(name = 'app'): IORedis {
  const { host, port, password, db, tls } = config.redis;

  const connection = new IORedis({
    host,
    port,
    password: password || undefined,
    db,
    tls: tls ? { servername: host } : undefined, // SNI + cert verification on
    connectionName: `${name}-${process.pid}`,

    maxRetriesPerRequest: null, // required by BullMQ
    connectTimeout: 10_000,
    keepAlive: 10_000, // stops idle connections being dropped by LBs/NAT

    // Exponential backoff with jitter, capped at 10s. Never gives up.
    retryStrategy: (attempt) =>
      Math.min(attempt * 200, 10_000) + Math.floor(Math.random() * 250),

    // Reconnect after a failover (replica promoted, old primary is READONLY).
    reconnectOnError: (err) => err.message.includes('READONLY'),
  });

  // An 'error' listener is mandatory: without one, Node throws on connection errors.
  connection.on('error', (err) => console.error(`Redis error:`, err.message));
  connection.on('ready', () => console.log(`Redis connected`));
  connection.on('reconnecting', (ms: number) =>
    console.warn(`Redis reconnecting in ${ms}ms`),
  );
  connection.on('end', () => console.warn(`Redis disconnected`));

  return connection;
}

let sharedRedisClient: IORedis | null = null;

export function getRedisClient(): IORedis {
  if (!sharedRedisClient) {
    sharedRedisClient = createRedisConnection('shared');
  }
  return sharedRedisClient;
}

export async function closeSharedRedisClient(): Promise<void> {
  if (sharedRedisClient) {
    try {
      await sharedRedisClient.quit();
    } catch {
      sharedRedisClient.disconnect();
    }
    sharedRedisClient = null;
  }
}

