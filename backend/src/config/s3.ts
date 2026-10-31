// src/config/s3.ts
// AWS S3 client wrapper for presigned URLs, multipart streaming, and gzipped chunk management.
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import zlib from 'zlib';
import util from 'util';
import { config } from './index.js';
import { AppError } from '../middleware/error.js';

export const gzipAsync = util.promisify(zlib.gzip);
export const gunzipAsync = util.promisify(zlib.gunzip);

let s3ClientInstance: S3Client | null = null;

// In-memory object store for tests
const inMemoryTestStore = new Map<string, { buffer: Buffer; contentType?: string; contentEncoding?: string }>();

export function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    const s3Config: any = {
      region: config.s3.region,
      forcePathStyle: config.s3.forcePathStyle,
    };

    if (config.s3.endpoint) {
      s3Config.endpoint = config.s3.endpoint;
    }

    if (config.s3.accessKeyId && config.s3.secretAccessKey) {
      s3Config.credentials = {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      };
    }

    s3ClientInstance = new S3Client(s3Config);
  }
  return s3ClientInstance;
}

const isTestEnv = () => process.env.NODE_ENV === 'test' && !process.env.FORCE_REAL_S3;

/**
 * Generate a presigned PUT URL for browser uploads
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string = 'text/csv',
  expiresInSeconds: number = 900,
): Promise<{ uploadUrl: string; key: string }> {
  if (isTestEnv()) {
    return {
      uploadUrl: `https://test-mock-s3.local/${config.s3.bucket}/${key}?mockSigned=true`,
      key,
    };
  }

  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  return { uploadUrl, key };
}

/**
 * Verifies that the uploaded object exists and does not exceed maxBytes
 */
export async function verifyUploadedObject(
  key: string,
  maxBytes: number = 50 * 1024 * 1024,
): Promise<{ exists: true; sizeBytes: number }> {
  if (isTestEnv()) {
    const item = inMemoryTestStore.get(key);
    if (!item) {
      throw new AppError(400, `Uploaded file not found in storage: ${key}`, 'file_not_found');
    }
    if (item.buffer.length <= 0) {
      throw new AppError(400, 'Uploaded file is empty', 'empty_file');
    }
    if (item.buffer.length > maxBytes) {
      throw new AppError(
        400,
        `Uploaded file exceeds maximum limit of ${maxBytes / (1024 * 1024)}MB`,
        'file_too_large',
      );
    }
    return { exists: true, sizeBytes: item.buffer.length };
  }

  const client = getS3Client();
  try {
    const head = await client.send(
      new HeadObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
      }),
    );

    const sizeBytes = head.ContentLength ?? 0;
    if (sizeBytes <= 0) {
      throw new AppError(400, 'Uploaded file is empty', 'empty_file');
    }
    if (sizeBytes > maxBytes) {
      throw new AppError(
        400,
        `Uploaded file exceeds maximum limit of ${maxBytes / (1024 * 1024)}MB`,
        'file_too_large',
      );
    }

    return { exists: true, sizeBytes };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') {
      throw new AppError(400, `Uploaded file not found in storage: ${key}`, 'file_not_found');
    }
    throw new AppError(500, `Failed to verify file in storage: ${err?.message}`, 'storage_error');
  }
}

/**
 * Streams an object from S3 as a Node.js Readable stream
 */
export async function getObjectStream(key: string): Promise<Readable> {
  if (isTestEnv()) {
    const item = inMemoryTestStore.get(key);
    if (!item) {
      throw new AppError(404, `Object not found in storage: ${key}`, 'not_found');
    }
    return Readable.from(item.buffer);
  }

  const client = getS3Client();
  const res = await client.send(
    new GetObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
    }),
  );

  if (!res.Body) {
    throw new AppError(500, `Empty body received from S3 for key: ${key}`, 'storage_error');
  }

  return res.Body as Readable;
}

/**
 * Compresses an array of NDJSON row strings with gzip and uploads to S3
 */
export async function putGzippedNdjsonChunk(
  key: string,
  lines: string[],
): Promise<{ key: string; sizeBytes: number }> {
  const rawBuffer = Buffer.from(lines.join('\n'), 'utf8');
  const gzipped = await gzipAsync(rawBuffer);

  if (isTestEnv()) {
    inMemoryTestStore.set(key, {
      buffer: gzipped,
      contentType: 'application/x-ndjson',
      contentEncoding: 'gzip',
    });
    return { key, sizeBytes: gzipped.length };
  }

  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      Body: gzipped,
      ContentType: 'application/x-ndjson',
      ContentEncoding: 'gzip',
    }),
  );

  return { key, sizeBytes: gzipped.length };
}

/**
 * Deletes an object from S3
 */
export async function deleteObject(key: string): Promise<void> {
  if (isTestEnv()) {
    inMemoryTestStore.delete(key);
    return;
  }

  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
    }),
  );
}

// Test helpers
export function _setTestS3Object(key: string, data: Buffer | string): void {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  inMemoryTestStore.set(key, { buffer: buf });
}

export function _getTestS3Object(key: string): Buffer | undefined {
  return inMemoryTestStore.get(key)?.buffer;
}

export function _clearTestS3(): void {
  inMemoryTestStore.clear();
}
