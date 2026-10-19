import IORedis from 'ioredis';
import { getRedisClient } from '../config/redis.js';

const ACQUIRE_BULK_SLOT_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local leaseUntil = tonumber(ARGV[2])
local lockMember = ARGV[3]
local maxConcurrent = tonumber(ARGV[4])

-- 1. Reap expired leases from crashed/OOM pods
redis.call('ZREMRANGEBYSCORE', key, '-inf', now)

-- 2. Re-entrant check: if this chunk already holds a lease, refresh it
if redis.call('ZSCORE', key, lockMember) then
  redis.call('ZADD', key, leaseUntil, lockMember)
  redis.call('PEXPIRE', key, 300000)
  return 1
end

-- 3. Check tenant concurrency ceiling
if redis.call('ZCARD', key) >= maxConcurrent then
  return 0
end

-- 4. Grant lease
redis.call('ZADD', key, leaseUntil, lockMember)
redis.call('PEXPIRE', key, 300000)
return 1
`;

// In-memory simulation fallback for test environments without live Redis
interface InMemLease {
  expiresAt: number;
}
const inMemorySemaphores = new Map<string, Map<string, InMemLease>>();

function isTestMockRedis(): boolean {
  return process.env.NODE_ENV === 'test' && !process.env.FORCE_REAL_REDIS;
}

export function _clearInMemorySemaphores(): void {
  inMemorySemaphores.clear();
}

/**
 * Acquire a time-bounded concurrency slot for a merchant
 */
export async function acquireBulkLease(
  merchantId: string,
  chunkId: string,
  maxConcurrent: number = 2,
  leaseDurationMs: number = 30000,
  redisClient?: IORedis,
): Promise<boolean> {
  const key = `bulk_sem:${merchantId}`;
  const now = Date.now();
  const leaseUntil = now + leaseDurationMs;

  if (isTestMockRedis()) {
    let merchantMap = inMemorySemaphores.get(key);
    if (!merchantMap) {
      merchantMap = new Map();
      inMemorySemaphores.set(key, merchantMap);
    }

    // 1. Evict expired
    for (const [member, lease] of merchantMap.entries()) {
      if (lease.expiresAt <= now) {
        merchantMap.delete(member);
      }
    }

    // 2. Re-entrant
    if (merchantMap.has(chunkId)) {
      merchantMap.set(chunkId, { expiresAt: leaseUntil });
      return true;
    }

    // 3. Check max concurrent
    if (merchantMap.size >= maxConcurrent) {
      return false;
    }

    // 4. Acquire
    merchantMap.set(chunkId, { expiresAt: leaseUntil });
    return true;
  }

  const client = redisClient || getRedisClient();
  const res = await client.eval(
    ACQUIRE_BULK_SLOT_LUA,
    1,
    key,
    now.toString(),
    leaseUntil.toString(),
    chunkId,
    maxConcurrent.toString(),
  );

  return Number(res) === 1;
}

/**
 * Refresh an active lease (heartbeat)
 */
export async function refreshBulkLease(
  merchantId: string,
  chunkId: string,
  leaseDurationMs: number = 30000,
  redisClient?: IORedis,
): Promise<boolean> {
  const key = `bulk_sem:${merchantId}`;
  const now = Date.now();
  const leaseUntil = now + leaseDurationMs;

  if (isTestMockRedis()) {
    const merchantMap = inMemorySemaphores.get(key);
    if (!merchantMap || !merchantMap.has(chunkId)) {
      return false;
    }
    merchantMap.set(chunkId, { expiresAt: leaseUntil });
    return true;
  }

  const client = redisClient || getRedisClient();
  const pipeline = client.pipeline();
  pipeline.zadd(key, 'XX', leaseUntil, chunkId);
  pipeline.pexpire(key, 300000);
  const results = await pipeline.exec();
  const zaddRes = results?.[0]?.[1];
  return zaddRes !== null && zaddRes !== undefined;
}

/**
 * Release an acquired lease slot
 */
export async function releaseBulkLease(
  merchantId: string,
  chunkId: string,
  redisClient?: IORedis,
): Promise<void> {
  const key = `bulk_sem:${merchantId}`;

  if (isTestMockRedis()) {
    const merchantMap = inMemorySemaphores.get(key);
    if (merchantMap) {
      merchantMap.delete(chunkId);
      if (merchantMap.size === 0) {
        inMemorySemaphores.delete(key);
      }
    }
    return;
  }

  const client = redisClient || getRedisClient();
  await client.zrem(key, chunkId);
}

/**
 * Executes a callback within a managed merchant bulk lease with active heartbeat renewal
 */
export async function withMerchantBulkLease<T>(
  merchantId: string,
  chunkId: string,
  fn: () => Promise<T>,
  options: {
    maxConcurrent?: number;
    leaseDurationMs?: number;
    heartbeatIntervalMs?: number;
    redisClient?: IORedis;
  } = {},
): Promise<{ acquired: true; result: T } | { acquired: false }> {
  const {
    maxConcurrent = 2,
    leaseDurationMs = 30000,
    heartbeatIntervalMs = 10000,
    redisClient,
  } = options;

  const acquired = await acquireBulkLease(
    merchantId,
    chunkId,
    maxConcurrent,
    leaseDurationMs,
    redisClient,
  );

  if (!acquired) {
    return { acquired: false };
  }

  let heartbeatTimer: NodeJS.Timeout | null = null;
  heartbeatTimer = setInterval(async () => {
    try {
      await refreshBulkLease(merchantId, chunkId, leaseDurationMs, redisClient);
    } catch (err: any) {
      console.warn(`[BulkSemaphore] Failed to refresh lease for ${merchantId}:${chunkId}:`, err?.message);
    }
  }, heartbeatIntervalMs);

  try {
    const result = await fn();
    return { acquired: true, result };
  } finally {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
    }
    await releaseBulkLease(merchantId, chunkId, redisClient).catch((err) => {
      console.warn(`[BulkSemaphore] Failed to release lease for ${merchantId}:${chunkId}:`, err?.message);
    });
  }
}
