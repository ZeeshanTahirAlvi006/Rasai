// src/config/index.ts
// ─────────────────────────────────────────────────────────────
// Centralised configuration. Reads from process.env once at
// startup; everything else imports this module.
// Fails fast on missing or malformed values and never echoes
// env values in error messages (they may be secrets).
// Validated strictly using Zod.
// ─────────────────────────────────────────────────────────────

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Helpers & Parsers 

const NODE_ENVS = ['development', 'production', 'test'] as const;
type NodeEnv = (typeof NODE_ENVS)[number];

/** Trimmed value, or undefined if unset/blank. */
function read(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v === undefined || v === '' ? undefined : v;
}

const isHex32Bytes = (val: string): boolean => /^[0-9a-fA-F]{64}$/.test(val);
const isBase6432Bytes = (val: string): boolean =>
  /^[A-Za-z0-9+/]+={0,2}$/.test(val) && Buffer.from(val, 'base64').length === 32;

function parseCorsOrigins(
  raw: string | undefined,
  isProd: boolean,
  onError?: (message: string) => void,
): string[] {
  const list = (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const normalised: string[] = [];

  for (let i = 0; i < list.length; i++) {
    const entry = list[i];
    const where = `CORS_ORIGINS entry #${i + 1}`;

    if (entry === '*') {
      onError?.(`${where}: wildcard "*" is not allowed (credentials enabled)`);
      continue;
    }

    let url: URL;
    try {
      url = new URL(entry);
    } catch {
      onError?.(`${where}: not a valid URL (expected e.g. https://app.example.com)`);
      continue;
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      onError?.(`${where}: must use http or https`);
      continue;
    }

    if (url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
      onError?.(`${where}: must be a bare origin (no path, query, hash or credentials)`);
      continue;
    }

    if (isProd && url.protocol !== 'https:') {
      onError?.(`${where}: must use https in production`);
      continue;
    }

    normalised.push(url.origin);
  }

  const unique = [...new Set(normalised)];
  if (isProd && unique.length === 0) {
    onError?.('CORS_ORIGINS: at least one origin is required in production');
  }

  return unique;
}

function deepFreeze<T extends object>(obj: T): T {
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object') deepFreeze(v as object);
  }
  return Object.freeze(obj);
}

// Zod Preprocessors (safe coercion without leaking raw values) 

const intSchema = (key: string, fallback: number, min = 0) =>
  z.preprocess(
    (val) => {
      const v = typeof val === 'string' ? val.trim() : val;
      if (v === undefined || v === '') return fallback;
      const n = Number(v);
      return Number.isInteger(n) ? n : NaN;
    },
    z
      .number({ message: `Invalid env var ${key}: expected integer >= ${min}` })
      .int(`Invalid env var ${key}: expected integer >= ${min}`)
      .min(min, `Invalid env var ${key}: expected integer >= ${min}`),
  );

const boolSchema = (key: string, fallback: boolean) =>
  z.preprocess((val) => {
    const v = typeof val === 'string' ? val.trim() : val;
    if (v === undefined || v === '') return fallback;
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
    return undefined;
  }, z.boolean({ message: `Invalid env var ${key}: expected true/false` }));

//  Zod Environment Schema 

export const envSchema = z
  .object({
    PORT: intSchema('PORT', 4000, 1),
    NODE_ENV: z
      .enum(NODE_ENVS, {
        message: `Invalid NODE_ENV: expected one of ${NODE_ENVS.join(', ')}`,
      })
      .default('development'),
    JWT_SECRET: z.string().default(''),
    // MongoDB
    MONGO_URI: z
      .string({ message: 'Missing required env var: MONGO_URI' })
      .trim()
      .min(1, 'Missing required env var: MONGO_URI')
      .refine(
        (val) => /^mongodb(\+srv)?:\/\//.test(val),
        'Invalid MONGO_URI: must start with mongodb:// or mongodb+srv://',
      ),

    // CORS allowed origins (validated in superRefine)
    CORS_ORIGINS: z.string().optional().default(''),

    // Redis (BullMQ only)
    REDIS_HOST: z.string().default('127.0.0.1'),
    REDIS_PORT: intSchema('REDIS_PORT', 6379, 1),
    REDIS_PASSWORD: z.string().default(''),
    REDIS_DB: intSchema('REDIS_DB', 0, 0),
    REDIS_TLS: boolSchema('REDIS_TLS', false),

    // Meta WhatsApp Cloud API
    META_APP_SECRET: z.string().default(''),
    META_ACCESS_TOKEN: z.string().default(''),
    META_PHONE_NUMBER_ID: z.string().default(''),
    META_WABA_ID: z.string().default(''),

    // Field-level encryption key (AES-256 32-byte key)
    ENCRYPTION_KEY: z.string().default(''),

    // Google APIs (manifest delivery)
    GOOGLE_SERVICE_ACCOUNT_KEY_PATH: z.string().default(''),
    GOOGLE_DRIVE_FOLDER_ID: z.string().default(''),
    GOOGLE_USER: z.string().default(''),
    GOOGLE_CLIENT_ID: z.string().default(''),
    GOOGLE_CLIENT_SECRET: z.string().default(''),
    GOOGLE_REFRESH_TOKEN: z.string().default(''),

    // Outbox & send governor
    OUTBOX_RELAY_INTERVAL_MS: intSchema('OUTBOX_RELAY_INTERVAL_MS', 3000, 1),
    OUTBOX_LEASE_MS: intSchema('OUTBOX_LEASE_MS', 60000, 1),
    OUTBOX_MAX_ATTEMPTS: intSchema('OUTBOX_MAX_ATTEMPTS', 5, 1),

    // Send governor pauses
    WA_SPAM_PAUSE_MS: intSchema('WA_SPAM_PAUSE_MS', 14_400_000, 0), // 4 hours
    WA_PAIR_LIMIT_DELAY_MS: intSchema('WA_PAIR_LIMIT_DELAY_MS', 3_600_000, 0), // 1 hour

    // Circuit breaker defaults
    BREAKER_PAUSE_MS: intSchema('BREAKER_PAUSE_MS', 3_600_000, 0), // 60 min

    // Object Storage (AWS S3 / Cloudflare R2 / MinIO)
    S3_BUCKET: z.string().default('ndr-imports'),
    S3_REGION: z.string().default('us-east-1'),
    S3_ENDPOINT: z.string().default(''),
    S3_ACCESS_KEY_ID: z.string().default(''),
    S3_SECRET_ACCESS_KEY: z.string().default(''),
    S3_FORCE_PATH_STYLE: boolSchema('S3_FORCE_PATH_STYLE', false),
  })
  .superRefine((data, ctx) => {
    const isProd = data.NODE_ENV === 'production';

    // CORS origin validation
    parseCorsOrigins(data.CORS_ORIGINS, isProd, (message) => {
      ctx.addIssue({
        code: 'custom',
        path: ['CORS_ORIGINS'],
        message,
      });
    });

    // Required in production
    if (isProd) {
      if (!data.META_APP_SECRET) {
        ctx.addIssue({
          code: 'custom',
          path: ['META_APP_SECRET'],
          message: 'Missing required env var: META_APP_SECRET',
        });
      }
      if (!data.META_ACCESS_TOKEN) {
        ctx.addIssue({
          code: 'custom',
          path: ['META_ACCESS_TOKEN'],
          message: 'Missing required env var: META_ACCESS_TOKEN',
        });
      }
      if (!data.META_PHONE_NUMBER_ID) {
        ctx.addIssue({
          code: 'custom',
          path: ['META_PHONE_NUMBER_ID'],
          message: 'Missing required env var: META_PHONE_NUMBER_ID',
        });
      }
      if (!data.META_WABA_ID) {
        ctx.addIssue({
          code: 'custom',
          path: ['META_WABA_ID'],
          message: 'Missing required env var: META_WABA_ID',
        });
      }
      if (!data.ENCRYPTION_KEY) {
        ctx.addIssue({
          code: 'custom',
          path: ['ENCRYPTION_KEY'],
          message: 'Missing required env var: ENCRYPTION_KEY',
        });
      }
    }

    // AES-256 key validation: 32 bytes (64 hex chars or base64)
    if (data.ENCRYPTION_KEY) {
      if (!isHex32Bytes(data.ENCRYPTION_KEY) && !isBase6432Bytes(data.ENCRYPTION_KEY)) {
        ctx.addIssue({
          code: 'custom',
          path: ['ENCRYPTION_KEY'],
          message: 'Invalid ENCRYPTION_KEY: must be 32 bytes (64 hex chars or base64-encoded)',
        });
      }
    }

    // Cross-field sanity check:
    // A lease shorter than a couple of relay cycles lets another relay
    // reclaim a message that is still being processed → duplicate sends.
    if (data.OUTBOX_LEASE_MS < data.OUTBOX_RELAY_INTERVAL_MS * 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['OUTBOX_LEASE_MS'],
        message: `Invalid outbox config: OUTBOX_LEASE_MS (${data.OUTBOX_LEASE_MS}) must be at least 2x OUTBOX_RELAY_INTERVAL_MS (${data.OUTBOX_RELAY_INTERVAL_MS})`,
      });
    }
  });

export type ValidatedEnv = z.infer<typeof envSchema>;

// Parse & Validate at Startup 

function parseEnv(): ValidatedEnv {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  • ${issue.message}`)
      .join('\n');
    console.error('Configuration validation failed:\n' + formatted);
    throw new Error(`Configuration validation failed:\n${formatted}`);
  }
  return result.data;
}

const validated = parseEnv();
const isProd = validated.NODE_ENV === 'production';

const parsedCorsOrigins = parseCorsOrigins(validated.CORS_ORIGINS, isProd);

// Config 

const built = {
  port: validated.PORT,
  nodeEnv: validated.NODE_ENV,
  isProd,
  jwtSecret: validated.JWT_SECRET,
  // MongoDB
  mongoUri: validated.MONGO_URI,

  // Allowed browser origins for CORS
  corsOrigins: parsedCorsOrigins,

  // Redis (BullMQ only)
  redis: {
    host: validated.REDIS_HOST,
    port: validated.REDIS_PORT,
    password: validated.REDIS_PASSWORD,
    db: validated.REDIS_DB,
    tls: validated.REDIS_TLS,
  },

  // Meta WhatsApp Cloud API
  meta: {
    appSecret: validated.META_APP_SECRET,
    accessToken: validated.META_ACCESS_TOKEN,
    phoneNumberId: validated.META_PHONE_NUMBER_ID,
    wabaId: validated.META_WABA_ID,
  },

  // Field-level encryption key for PII
  encryptionKey: validated.ENCRYPTION_KEY,

  // Google APIs
  google: {
    serviceAccountKeyPath: validated.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    driveFolderId: validated.GOOGLE_DRIVE_FOLDER_ID,
    user: validated.GOOGLE_USER,
    clientId: validated.GOOGLE_CLIENT_ID,
    clientSecret: validated.GOOGLE_CLIENT_SECRET,
    refreshToken: validated.GOOGLE_REFRESH_TOKEN,
  },

  // Outbox & send governor
  outbox: {
    relayIntervalMs: validated.OUTBOX_RELAY_INTERVAL_MS,
    leaseMs: validated.OUTBOX_LEASE_MS,
    maxAttempts: validated.OUTBOX_MAX_ATTEMPTS,
  },

  // Send governor pauses
  sendGovernor: {
    spamPauseMs: validated.WA_SPAM_PAUSE_MS,
    pairLimitDelayMs: validated.WA_PAIR_LIMIT_DELAY_MS,
  },

  // Circuit breaker defaults
  breaker: {
    defaultPauseMs: validated.BREAKER_PAUSE_MS,
  },

  // Object Storage
  s3: {
    bucket: validated.S3_BUCKET,
    region: validated.S3_REGION,
    endpoint: validated.S3_ENDPOINT || undefined,
    accessKeyId: validated.S3_ACCESS_KEY_ID || undefined,
    secretAccessKey: validated.S3_SECRET_ACCESS_KEY || undefined,
    forcePathStyle: validated.S3_FORCE_PATH_STYLE,
  },
};

// Immutable at runtime: nothing can mutate config after startup.
export const config = deepFreeze(built);
export type Config = typeof config;