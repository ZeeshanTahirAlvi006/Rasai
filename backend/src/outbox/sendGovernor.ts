// src/outbox/sendGovernor.ts
import type { OutboxChannel } from '../types';
import { getRedisClient } from '../config/redis';

export interface SendPermit {
  allowed: boolean;
  reason?: 'CHANNEL_PAUSED' | 'RECIPIENT_THROTTLED' | 'RATE_LIMITED';
  retryAfterMs: number;
}

const ACQUIRE_SEND_PERMIT_LUA = `
local pauseKey = KEYS[1]
local pairKey = KEYS[2]
local bucketKey = KEYS[3]

local now = tonumber(ARGV[1])
local ratePerSec = tonumber(ARGV[2])
local burstCapacity = tonumber(ARGV[3])

-- 1. Check Channel Pause Window
local pausePttl = redis.call('PTTL', pauseKey)
if pausePttl > 0 then
    return {0, 'CHANNEL_PAUSED', pausePttl}
end

-- 2. Check Recipient Pair Cooldown Window
if pairKey and pairKey ~= '' then
    local pairPttl = redis.call('PTTL', pairKey)
    if pairPttl > 0 then
        return {0, 'RECIPIENT_THROTTLED', pairPttl}
    end
end

-- 3. Token Bucket Rate Limiter
local data = redis.call('HMGET', bucketKey, 'tokens', 'lastRefill')
local tokens = tonumber(data[1])
local lastRefill = tonumber(data[2])

if not tokens or not lastRefill then
    tokens = burstCapacity
    lastRefill = now
else
    local elapsedSec = math.max(0, (now - lastRefill) / 1000)
    local refilled = elapsedSec * ratePerSec
    tokens = math.min(burstCapacity, tokens + refilled)
    lastRefill = now
end

if tokens < 1 then
    local waitMs = math.ceil(((1 - tokens) / ratePerSec) * 1000)
    redis.call('HMSET', bucketKey, 'tokens', tostring(tokens), 'lastRefill', tostring(lastRefill))
    redis.call('PEXPIRE', bucketKey, 60000)
    return {0, 'RATE_LIMITED', math.max(100, waitMs)}
else
    tokens = tokens - 1
    redis.call('HMSET', bucketKey, 'tokens', tostring(tokens), 'lastRefill', tostring(lastRefill))
    redis.call('PEXPIRE', bucketKey, 60000)
    return {1, 'OK', 0}
end
`;

// In-Memory Fallback State for Test / Redis-less Environments
interface InMemoryBucket {
  tokens: number;
  lastRefill: number;
}

const localPauses = new Map<string, number>();
const localPairLimits = new Map<string, number>();
const localBuckets = new Map<string, InMemoryBucket>();
const MAX_LOCAL_PAIR_ENTRIES = 5000;

function sweepExpiredLocalState(now: number): void {
  if (localPairLimits.size > MAX_LOCAL_PAIR_ENTRIES) {
    for (const [k, exp] of localPairLimits.entries()) {
      if (exp <= now) localPairLimits.delete(k);
    }
  }
}

export class SendGovernor {
  private defaultRatePerSec: number;
  private defaultBurstCapacity: number;

  constructor(ratePerSec = 60, burstCapacity = 60) {
    this.defaultRatePerSec = ratePerSec;
    this.defaultBurstCapacity = burstCapacity;
  }

  private isTestMode(): boolean {
    return process.env.NODE_ENV === 'test' && !process.env.FORCE_REAL_REDIS;
  }

  /**
   * Evaluates all rate limits in a single atomic operation:
   * 1. Channel pause window (e.g. Meta 131048 Spam Pause)
   * 2. Recipient cooldown window (e.g. Meta 131056 Pair Limit)
   * 3. Token-bucket rate limiter (e.g. 60 msgs/sec)
   */
  async acquirePermit(channel: OutboxChannel, phoneHash?: string): Promise<SendPermit> {
    const now = Date.now();
    const pauseKey = `send_gov:pause:${channel}`;
    const pairKey = phoneHash ? `send_gov:pair:${channel}:${phoneHash}` : '';
    const bucketKey = `send_gov:bucket:${channel}`;

    if (this.isTestMode()) {
      return this.acquireLocalPermit(channel, phoneHash, now);
    }

    try {
      const redis = getRedisClient();
      const res = (await redis.eval(
        ACQUIRE_SEND_PERMIT_LUA,
        3,
        pauseKey,
        pairKey,
        bucketKey,
        now,
        this.defaultRatePerSec,
        this.defaultBurstCapacity,
      )) as [number, string, number];

      const allowed = res[0] === 1;
      return {
        allowed,
        reason: allowed ? undefined : (res[1] as SendPermit['reason']),
        retryAfterMs: res[2] || 0,
      };
    } catch {
      // Fallback to local in-memory governor if Redis command fails
      return this.acquireLocalPermit(channel, phoneHash, now);
    }
  }

  private acquireLocalPermit(
    channel: OutboxChannel,
    phoneHash: string | undefined,
    now: number,
  ): SendPermit {
    sweepExpiredLocalState(now);

    // 1. Channel Pause
    const pauseUntil = localPauses.get(channel) || 0;
    if (pauseUntil > now) {
      return {
        allowed: false,
        reason: 'CHANNEL_PAUSED',
        retryAfterMs: pauseUntil - now,
      };
    }

    // 2. Recipient Cooldown
    if (phoneHash) {
      const pairUntil = localPairLimits.get(`${channel}:${phoneHash}`) || 0;
      if (pairUntil > now) {
        return {
          allowed: false,
          reason: 'RECIPIENT_THROTTLED',
          retryAfterMs: pairUntil - now,
        };
      }
    }

    // 3. Token Bucket
    let bucket = localBuckets.get(channel);
    if (!bucket) {
      bucket = { tokens: this.defaultBurstCapacity, lastRefill: now };
      localBuckets.set(channel, bucket);
    } else {
      const elapsedSec = Math.max(0, (now - bucket.lastRefill) / 1000);
      bucket.tokens = Math.min(this.defaultBurstCapacity, bucket.tokens + elapsedSec * this.defaultRatePerSec);
      bucket.lastRefill = now;
    }

    if (bucket.tokens < 1) {
      const waitMs = Math.ceil(((1 - bucket.tokens) / this.defaultRatePerSec) * 1000);
      return {
        allowed: false,
        reason: 'RATE_LIMITED',
        retryAfterMs: Math.max(100, waitMs),
      };
    }

    bucket.tokens -= 1;
    return {
      allowed: true,
      retryAfterMs: 0,
    };
  }

  /**
   * Pauses all outbound sends on the given channel for durationMs.
   */
  async pause(channel: OutboxChannel, durationMs: number): Promise<Date> {
    const resumeAt = new Date(Date.now() + durationMs);
    const key = `send_gov:pause:${channel}`;

    if (this.isTestMode()) {
      localPauses.set(channel, resumeAt.getTime());
      return resumeAt;
    }

    try {
      const redis = getRedisClient();
      await redis.set(key, resumeAt.toISOString(), 'PX', durationMs);
    } catch {
      localPauses.set(channel, resumeAt.getTime());
    }

    return resumeAt;
  }

  /**
   * Checks if the channel is currently paused.
   */
  async isPaused(channel: OutboxChannel): Promise<boolean> {
    const now = Date.now();
    if (this.isTestMode()) {
      return (localPauses.get(channel) || 0) > now;
    }

    try {
      const redis = getRedisClient();
      const pttl = await redis.pttl(`send_gov:pause:${channel}`);
      return pttl > 0;
    } catch {
      return (localPauses.get(channel) || 0) > now;
    }
  }

  /**
   * Returns the timestamp when the channel will resume dispatching.
   */
  async resumeAt(channel: OutboxChannel): Promise<Date> {
    const now = Date.now();
    if (this.isTestMode()) {
      const local = localPauses.get(channel) || 0;
      return new Date(Math.max(now, local));
    }

    try {
      const redis = getRedisClient();
      const pttl = await redis.pttl(`send_gov:pause:${channel}`);
      if (pttl > 0) return new Date(now + pttl);
      return new Date(now);
    } catch {
      const local = localPauses.get(channel) || 0;
      return new Date(Math.max(now, local));
    }
  }

  /**
   * Records a temporary cooldown window for a specific recipient (Meta 131056).
   */
  async recordRecipientThrottle(
    channel: OutboxChannel,
    phoneHash: string,
    delayMs: number,
  ): Promise<Date> {
    const resumeAt = new Date(Date.now() + delayMs);
    const key = `send_gov:pair:${channel}:${phoneHash}`;

    if (this.isTestMode()) {
      localPairLimits.set(`${channel}:${phoneHash}`, resumeAt.getTime());
      return resumeAt;
    }

    try {
      const redis = getRedisClient();
      await redis.set(key, resumeAt.toISOString(), 'PX', delayMs);
    } catch {
      localPairLimits.set(`${channel}:${phoneHash}`, resumeAt.getTime());
    }

    return resumeAt;
  }

  /**
   * Resets all internal and Redis state (for test setup/teardown).
   */
  async resetForTests(): Promise<void> {
    localPauses.clear();
    localPairLimits.clear();
    localBuckets.clear();
  }
}

export const sendGovernor = new SendGovernor();
