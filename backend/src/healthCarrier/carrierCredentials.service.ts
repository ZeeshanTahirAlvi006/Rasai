// src/healthCarrier/carrierCredentials.service.ts
// Encrypted carrier credentials manager with AES-256-GCM, bounded LRU cache, and .env fallback.
import crypto from 'crypto';
import { Types } from 'mongoose';
import { config } from '../config/index.js';
import { CARRIERS, type Carrier, type MerchantCarrierCredentials } from '../types/index.js';
import { MerchantCarrierCredential } from '../models/MerchantCarrierCredential.js';
import { AppError } from '../middleware/error.js';

const ENC_PREFIX = 'v1';

let derivedKey: Buffer | null = null;
const getCarrierKey = (): Buffer => {
  if (derivedKey) return derivedKey;
  const raw = config.encryptionKey || process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const master = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  derivedKey = Buffer.from(crypto.hkdfSync('sha256', master, Buffer.alloc(0), 'ndr:carrier:enc', 32));
  return derivedKey;
};

export const encryptCredential = (plainText: string): string => {
  if (!plainText) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getCarrierKey(), iv);
  const ct = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [ENC_PREFIX, iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
};

export const decryptCredential = (stored?: string): string => {
  if (!stored) return '';
  const [prefix, iv, tag, ct] = stored.split(':');
  if (prefix !== ENC_PREFIX || !iv || !tag || !ct) {
    return stored; // If plaintext fallback or legacy, return as is
  }
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', getCarrierKey(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ct, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
};

export const maskSecret = (secret?: string): string => {
  if (!secret) return '';
  if (secret.length <= 4) return '****';
  return '****' + secret.slice(-4);
};

// ── Bounded LRU Credential Cache (B4-BN-04, B4-ML-03) ──
interface CacheEntry {
  creds: MerchantCarrierCredentials;
  expiresAt: number;
}
const CREDENTIAL_CACHE_MAX_ENTRIES = 500;
const CREDENTIAL_CACHE_TTL_MS = 5 * 60_000; // 5 min TTL
const credentialCache = new Map<string, CacheEntry>();

export const invalidateCredentialCache = (merchantId?: string, carrier?: Carrier): void => {
  if (!merchantId) {
    credentialCache.clear();
    return;
  }
  if (carrier) {
    credentialCache.delete(`${merchantId}:${carrier}`);
    credentialCache.delete(`system:${carrier}`);
  } else {
    for (const key of credentialCache.keys()) {
      if (key.startsWith(`${merchantId}:`) || key.startsWith('system:')) {
        credentialCache.delete(key);
      }
    }
  }
};

const getFromCache = (key: string): MerchantCarrierCredentials | null => {
  const entry = credentialCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    credentialCache.delete(key);
    return null;
  }
  // Refresh recency
  credentialCache.delete(key);
  credentialCache.set(key, entry);
  return entry.creds;
};

const putInCache = (key: string, creds: MerchantCarrierCredentials): void => {
  if (credentialCache.size >= CREDENTIAL_CACHE_MAX_ENTRIES) {
    const oldestKey = credentialCache.keys().next().value;
    if (oldestKey) credentialCache.delete(oldestKey);
  }
  credentialCache.set(key, {
    creds,
    expiresAt: Date.now() + CREDENTIAL_CACHE_TTL_MS,
  });
};

/**
 * Resolves credentials for a given carrier and optional merchant.
 * Order of precedence:
 * 1. Encrypted DB credentials in MerchantCarrierCredential
 * 2. Environment variables (${carrier}_API_KEY, ${carrier}_API_SECRET)
 * 3. Default fallback with simulationMode: true
 */
export async function getCarrierConfig(
  carrier: Carrier,
  merchantId?: string
): Promise<MerchantCarrierCredentials> {
  const cacheKey = `${merchantId || 'system'}:${carrier}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  let apiKey = '';
  let apiSecret = '';
  let accountNumber = '';
  let webhookEnabled = false;
  let webhookSecret = '';
  let simulationMode = false;

  if (merchantId && Types.ObjectId.isValid(merchantId)) {
    const dbCred = await MerchantCarrierCredential.findOne({
      merchantId: new Types.ObjectId(merchantId),
      carrier,
      isActive: true,
    })
      .select('carrier apiKeyEncrypted apiSecretEncrypted accountNumber webhookEnabled webhookSecretEncrypted simulationMode')
      .lean()
      .exec();

    if (dbCred) {
      apiKey = decryptCredential(dbCred.apiKeyEncrypted);
      apiSecret = decryptCredential(dbCred.apiSecretEncrypted);
      accountNumber = dbCred.accountNumber || '';
      webhookEnabled = Boolean(dbCred.webhookEnabled);
      webhookSecret = decryptCredential(dbCred.webhookSecretEncrypted);
      simulationMode = Boolean(dbCred.simulationMode);
    }
  }

  // Fallback to environment variables if no DB key
  if (!apiKey) {
    apiKey = process.env[`${carrier}_API_KEY`] || '';
    apiSecret = process.env[`${carrier}_API_SECRET`] || '';
    accountNumber = process.env[`${carrier}_ACCOUNT_NUMBER`] || '';
    webhookSecret = process.env[`${carrier}_WEBHOOK_SECRET`] || '';
  }

  // If still no key, enable simulation mode
  if (!apiKey && !simulationMode) {
    simulationMode = true;
  }

  const result: MerchantCarrierCredentials = {
    merchantId: merchantId || '',
    carrier,
    apiKey,
    apiSecret,
    extra: {
      accountNumber,
      webhookEnabled,
      webhookSecret,
      simulationMode,
    },
  };

  putInCache(cacheKey, result);
  return result;
}

export interface UpsertCarrierCredentialInput {
  carrier: Carrier;
  apiKey?: string;
  apiSecret?: string;
  accountNumber?: string;
  webhookEnabled?: boolean;
  webhookSecret?: string;
  simulationMode?: boolean;
  isActive?: boolean;
}

export async function upsertMerchantCarrierCredential(
  merchantId: string,
  input: UpsertCarrierCredentialInput
) {
  if (!Types.ObjectId.isValid(merchantId)) {
    throw new AppError(400, 'Invalid merchantId', 'invalid_merchant_id');
  }
  if (!CARRIERS.includes(input.carrier)) {
    throw new AppError(400, `Invalid carrier '${input.carrier}'`, 'invalid_carrier');
  }

  const merchantObjectId = new Types.ObjectId(merchantId);
  const updateData: Record<string, unknown> = {
    carrier: input.carrier,
    merchantId: merchantObjectId,
  };

  if (input.apiKey !== undefined) {
    updateData.apiKeyEncrypted = input.apiKey ? encryptCredential(input.apiKey) : '';
  }
  if (input.apiSecret !== undefined) {
    updateData.apiSecretEncrypted = input.apiSecret ? encryptCredential(input.apiSecret) : '';
  }
  if (input.accountNumber !== undefined) {
    updateData.accountNumber = input.accountNumber;
  }
  if (input.webhookEnabled !== undefined) {
    updateData.webhookEnabled = Boolean(input.webhookEnabled);
  }
  if (input.webhookSecret !== undefined) {
    updateData.webhookSecretEncrypted = input.webhookSecret ? encryptCredential(input.webhookSecret) : '';
  }
  if (input.simulationMode !== undefined) {
    updateData.simulationMode = Boolean(input.simulationMode);
  }
  if (input.isActive !== undefined) {
    updateData.isActive = Boolean(input.isActive);
  }

  const doc = await MerchantCarrierCredential.findOneAndUpdate(
    { merchantId: merchantObjectId, carrier: input.carrier },
    { $set: updateData },
    { returnDocument: 'after', upsert: true }
  )
    .select('carrier accountNumber webhookEnabled simulationMode isActive updatedAt')
    .lean()
    .exec();

  invalidateCredentialCache(merchantId, input.carrier);
  return doc;
}

export async function listMerchantCarrierCredentials(merchantId: string) {
  if (!Types.ObjectId.isValid(merchantId)) {
    throw new AppError(400, 'Invalid merchantId', 'invalid_merchant_id');
  }

  const dbCreds = await MerchantCarrierCredential.find({
    merchantId: new Types.ObjectId(merchantId),
  })
    .select('carrier apiKeyEncrypted apiSecretEncrypted accountNumber webhookEnabled webhookSecretEncrypted simulationMode isActive updatedAt')
    .lean()
    .exec();

  const credMap = new Map(dbCreds.map((c) => [c.carrier, c]));

  return CARRIERS.map((carrier) => {
    const cred = credMap.get(carrier);
    const envKey = process.env[`${carrier}_API_KEY`];
    const hasDbKey = Boolean(cred?.apiKeyEncrypted);
    const rawApiKey = cred?.apiKeyEncrypted ? decryptCredential(cred.apiKeyEncrypted) : envKey || '';

    return {
      carrier,
      isConfigured: Boolean(hasDbKey || envKey),
      source: hasDbKey ? 'DATABASE' : envKey ? 'ENV' : 'NONE',
      apiKeyMasked: maskSecret(rawApiKey),
      accountNumber: cred?.accountNumber || process.env[`${carrier}_ACCOUNT_NUMBER`] || '',
      webhookEnabled: Boolean(cred?.webhookEnabled),
      simulationMode: cred?.simulationMode ?? (!rawApiKey),
      isActive: cred?.isActive ?? true,
      updatedAt: cred?.updatedAt,
    };
  });
}

export async function deleteMerchantCarrierCredential(merchantId: string, carrier: Carrier) {
  if (!Types.ObjectId.isValid(merchantId)) {
    throw new AppError(400, 'Invalid merchantId', 'invalid_merchant_id');
  }
  if (!CARRIERS.includes(carrier)) {
    throw new AppError(400, `Invalid carrier '${carrier}'`, 'invalid_carrier');
  }

  await MerchantCarrierCredential.deleteOne({
    merchantId: new Types.ObjectId(merchantId),
    carrier,
  }).exec();

  invalidateCredentialCache(merchantId, carrier);
}
