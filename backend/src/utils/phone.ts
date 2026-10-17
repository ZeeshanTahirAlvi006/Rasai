// src/utils/phone.ts
// Phone PII handling: normalisation, AES-256-GCM encryption at rest,
// HMAC lookup hash, and masking for API responses.
import crypto from 'crypto';
import { config } from '../config/index.js';
import { AppError } from '../middleware/error.js';

const ENC_PREFIX = 'v1';

// Two independent subkeys derived from the single master ENCRYPTION_KEY,
// so the lookup hash never reuses the encryption key.
let keys: { enc: Buffer; mac: Buffer } | null = null;
const getKeys = () => {
  if (keys) return keys;
  const raw = config.encryptionKey || process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('ENCRYPTION_KEY is not configured; cannot encrypt or hash phone numbers');
  }
  const master = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  const derive = (info: string) =>
    Buffer.from(crypto.hkdfSync('sha256', master, Buffer.alloc(0), info, 32));
  keys = { enc: derive('ndr:phone:enc'), mac: derive('ndr:phone:mac') };
  return keys;
};

/** Normalises Pakistani mobile numbers to E.164 (+92XXXXXXXXXX). */
export const normalizePkPhone = (raw: string): string => {
  const digits = raw.replace(/[\s\-()]/g, '').replace(/^\+/, '');
  let national: string | null = null;
  if (/^03\d{9}$/.test(digits)) national = digits.slice(1);
  else if (/^923\d{9}$/.test(digits)) national = digits.slice(2);
  else if (/^00923\d{9}$/.test(digits)) national = digits.slice(4);
  else if (/^3\d{9}$/.test(digits)) national = digits;
  if (!national) {
    throw new AppError(400, 'invalid Pakistani mobile number', 'invalid_phone');
  }
  return `+92${national}`;
};

export const encryptPhone = (e164: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKeys().enc, iv);
  const ct = Buffer.concat([cipher.update(e164, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [ENC_PREFIX, iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
};

export const decryptPhone = (stored: string): string => {
  const [prefix, iv, tag, ct] = stored.split(':');
  if (prefix !== ENC_PREFIX || !iv || !tag || !ct) {
    throw new Error('unrecognised encrypted phone format');
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKeys().enc, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ct, 'base64')), decipher.final()]).toString('utf8');
};

/** Deterministic HMAC for equality lookups (WhatsApp inbound → shipment). */
export const hashPhone = (e164: string): string =>
  crypto.createHmac('sha256', getKeys().mac).update(e164).digest('hex');

/** +923001234567 → +92******4567 */
export const maskPhone = (e164: string): string =>
  e164.length <= 7 ? '****' : `${e164.slice(0, 3)}${'*'.repeat(e164.length - 7)}${e164.slice(-4)}`;
