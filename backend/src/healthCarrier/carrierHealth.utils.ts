// src/healthCarrier/carrierHealth.utils.ts
// Utility functions for carrier circuit breaker backoff calculation, retry-after parsing, and error classification.
import { CircuitBreakerOpenError } from "./carrierHealth.service.js";
import { config } from "../config/index.js";

export const DEFAULT_BASE_BACKOFF_MS = 60_000;
export const DEFAULT_MAX_BACKOFF_MS = 30 * 60_000;

/**
 * Checks whether an error indicates an immediate circuit trip condition
 * (HTTP 429 Too Many Requests, HTTP 403 Forbidden / Cloudflare challenge).
 */
export function isImmediateTripError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === 'object') {
    const err = error as Record<string, unknown>;
    const responseObj = (err.response || err.reponse) as Record<string, unknown> | undefined;
    const status = Number(err.status || err.statusCode || responseObj?.status);
    if (status === 429 || status === 403) return true;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('429') || msg.includes('too many requests') || msg.includes('rate limit')) return true;
    if (msg.includes('403') || msg.includes('cloudflare') || msg.includes('waf') || msg.includes('forbidden')) return true;
  }
  return false;
}

/**
 * Parses Retry-After header from error response (in seconds or HTTP date string).
 */
export function extractRetryAfterMs(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const err = error as Record<string, unknown>;
  const responseObj = (err.response || err.reponse) as Record<string, unknown> | undefined;
  const headers = (responseObj?.headers || err.headers) as Record<string, unknown> | undefined;
  if (!headers) return undefined;

  const raw = headers['retry-after'] || headers['Retry-After'];
  if (!raw) return undefined;

  const seconds = Number(raw);
  if (!isNaN(seconds) && seconds > 0) {
    return Math.round(seconds * 1000);
  }

  // Parse HTTP date format (e.g., "Wed, 21 Oct 2026 07:28:00 GMT")
  const parsedDate = Date.parse(String(raw));
  if (!isNaN(parsedDate)) {
    const delta = parsedDate - Date.now();
    return delta > 0 ? delta : undefined;
  }

  return undefined;
}

/**
 * Distinguish between downtime / transient errors and normal client errors.
 * HTTP 429 and 403 MUST return true to trigger circuit breaker protection (B4-BUG-01).
 */
export function isRetriableBreakerError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof CircuitBreakerOpenError) {
    return false;
  }

  if (typeof error === 'object') {
    const err = error as Record<string, unknown>;
    const code = String(err.code || (err.cause as any)?.code || '');

    // Network socket errors
    if (['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH', 'ENOTFOUND', 'ENETUNREACH', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET'].includes(code)) {
      return true;
    }

    // Timeout errors
    if (err.name === 'TimeoutError' || err.name === 'AbortError' || code === 'ABORT_ERR' || (err.cause as any)?.name === 'TimeoutError') {
      return true;
    }

    // HTTP status codes
    const responseObj = (err.response || err.reponse) as Record<string, unknown> | undefined;
    const status = Number(err.status || err.statusCode || responseObj?.status);
    if (!isNaN(status)) {
      // Immediate trip rate-limit and Cloudflare WAF block (B4-BUG-01)
      if (status === 429 || status === 403) return true;
      // Server errors (5xx)
      if (status >= 500 && status <= 599) return true;
      // Non-retriable client errors (400, 401, 404, etc.)
      if (status >= 400 && status < 500) return false;
    }
  }

  // Error message matching
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes('timeout') ||
      msg.includes('abort') ||
      msg.includes('econnrefused') ||
      msg.includes('econnreset') ||
      msg.includes('etimedout') ||
      msg.includes('ehostunreach') ||
      msg.includes('enotfound') ||
      msg.includes('network') ||
      msg.includes('socket hang up') ||
      msg.includes('fetch failed') ||
      msg.includes('rate limit') ||
      msg.includes('cloudflare') ||
      msg.includes('429') ||
      msg.includes('403')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts error code from arbitrary error structures.
 */
export function extractErrorCode(error: unknown): string | undefined {
  if (!error) return undefined;
  if (typeof error === 'object') {
    const err = error as Record<string, unknown>;
    if (typeof err.code === 'string') return err.code;
    if (typeof err.code === 'number') return `ERR_${err.code}`;
    if (typeof err.status === 'number') return `HTTP_${err.status}`;
    if (typeof err.statusCode === 'number') return `HTTP_${err.statusCode}`;

    // Fix typo: err.response instead of err.reponse (B4-BUG-02)
    const response = (err.response || err.reponse) as Record<string, unknown> | undefined;
    if (response && typeof response.status === 'number') return `HTTP_${response.status}`;
  }
  if (error instanceof Error) return error.name;
  return 'UNKNOWN_ERROR';
}

/**
 * Calculates exponential backoff with jitter to prevent thundering herd.
 */
export function calculateBackOffWithJitter(
  tripCount: number,
  baseBackOffMs = DEFAULT_BASE_BACKOFF_MS,
  maxBackOffMs = (config?.breaker?.defaultPauseMs ?? DEFAULT_MAX_BACKOFF_MS)
): number {
  const exponential = Math.min(baseBackOffMs * 2 ** Math.max(0, tripCount), maxBackOffMs);
  const jitter = Math.floor(Math.random() * (exponential * 0.2));
  return Math.min(exponential + jitter, maxBackOffMs);
}