// src/utils/opsAlert.ts
import { OpsAlert, type OpsAlertType, type OpsAlertSeverity } from '../models/OpsAlert';
import { emailEmitter } from '../email/emailEmitter';
import { getRedisClient } from '../config/redis';

interface AlertOptions {
  severity?: OpsAlertSeverity;
  dedupeScope?: string;
  source?: string;
}

const inMemoryCooldowns = new Map<string, number>();
const MAX_IN_MEMORY_COOLDOWNS = 1000;
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

function acquireLocalCooldown(key: string, cooldownMs: number): boolean {
  const now = Date.now();
  // Sweep expired entries if map grows large
  if (inMemoryCooldowns.size > MAX_IN_MEMORY_COOLDOWNS) {
    for (const [k, exp] of inMemoryCooldowns.entries()) {
      if (exp <= now) inMemoryCooldowns.delete(k);
    }
  }
  const existing = inMemoryCooldowns.get(key);
  if (existing && existing > now) {
    return false; // Still within cooldown window
  }
  inMemoryCooldowns.set(key, now + cooldownMs);
  return true;
}

export async function alertOps(
  type: OpsAlertType,
  details: Record<string, unknown>,
  options?: AlertOptions,
): Promise<void> {
  const severity: OpsAlertSeverity = options?.severity || 'WARNING';
  const scope = options?.dedupeScope || 'global';
  const source = options?.source || 'outbox_worker';
  const dedupeKey = `ops_alert:${type}:${scope}`;

  let shouldAlert = false;
  const isTest = process.env.NODE_ENV === 'test' && !process.env.FORCE_REAL_REDIS;

  if (!isTest) {
    try {
      const redis = getRedisClient();
      const res = await redis.set(dedupeKey, '1', 'PX', DEFAULT_COOLDOWN_MS, 'NX');
      shouldAlert = res === 'OK';
    } catch {
      shouldAlert = acquireLocalCooldown(dedupeKey, DEFAULT_COOLDOWN_MS);
    }
  } else {
    shouldAlert = acquireLocalCooldown(dedupeKey, DEFAULT_COOLDOWN_MS);
  }

  // Always log the occurrence with structured metadata
  const logPrefix = `[OpsAlert] [${severity}] ${type} (${scope}):`;
  if (severity === 'CRITICAL') {
    console.error(logPrefix, details);
  } else {
    console.warn(logPrefix, details);
  }

  // If duplicate within cooldown window, suppress DB row and email storm (B2-BN-04)
  if (!shouldAlert) {
    return;
  }

  try {
    // 1. Persist alert record to MongoDB
    await OpsAlert.create({
      type,
      severity,
      source,
      dedupeScope: scope,
      details,
      resolved: false,
    });

    // 2. Dispatch multi-channel email alert via emailEmitter
    const subject = `[NDR Middleware Alert] ${severity}: ${type}`;
    const formattedDetails = JSON.stringify(details, null, 2);
    const text = `An operational alert was triggered in ${source}:\n\nType: ${type}\nSeverity: ${severity}\nScope: ${scope}\n\nDetails:\n${formattedDetails}`;
    const html = `<h3>[NDR Alert] ${severity}: ${type}</h3><p><b>Source:</b> ${source}</p><p><b>Scope:</b> ${scope}</p><pre style="background:#f4f4f4;padding:12px;border-radius:6px;">${formattedDetails}</pre>`;

    emailEmitter.emit('send_ops_alert', { subject, text, html });
  } catch (err) {
    console.error('[OpsAlert] Failed to record or dispatch ops alert:', err);
  }
}

export function clearOpsAlertCooldownsForTests(): void {
  inMemoryCooldowns.clear();
}
