// src/middleware/error.ts
// Centralized Express error handler and custom AppError class for standardized HTTP failure envelopes.
import { Request, Response, NextFunction } from 'express';

export interface AppErrorPayload<T = any> {
  success?: boolean;
  status?: number;
  statusCode?: number;
  message: string;
  error?: string;
  code?: string;
  data?: T;
  retryAfterMs?: number;
}

export class AppError<T = any> extends Error {
  public readonly success = false;
  public status: number;
  public statusCode: number;
  public error: string;
  public code: string;
  public data: T | null;
  public retryAfterMs?: number;

  constructor(
    statusOrPayload: number | AppErrorPayload<T>,
    message?: string,
    errorCode?: string,
    data: T | null = null,
    retryAfterMs?: number,
  ) {
    let resolvedStatus = 500;
    let resolvedMessage = 'Internal Server Error';
    let resolvedCode = 'internal_error';
    let resolvedData: T | null = null;
    let resolvedRetry: number | undefined = undefined;

    if (typeof statusOrPayload === 'object' && statusOrPayload !== null) {
      resolvedStatus = statusOrPayload.status ?? statusOrPayload.statusCode ?? 500;
      resolvedMessage = statusOrPayload.message ?? 'Internal Server Error';
      resolvedCode = statusOrPayload.error ?? statusOrPayload.code ?? 'internal_error';
      resolvedData = statusOrPayload.data ?? null;
      resolvedRetry = statusOrPayload.retryAfterMs;
    } else {
      resolvedStatus = statusOrPayload;
      resolvedMessage = message ?? 'Internal Server Error';
      resolvedCode = errorCode ?? 'internal_error';
      resolvedData = data;
      resolvedRetry = retryAfterMs;
    }

    super(resolvedMessage);
    this.name = 'AppError';
    this.status = resolvedStatus;
    this.statusCode = resolvedStatus;
    this.error = resolvedCode;
    this.code = resolvedCode;
    this.data = resolvedData;
    this.retryAfterMs = resolvedRetry;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      message: this.message,
      data: this.data,
      error: this.error,
    };
  }

  static badRequest<T = any>(message: string, error = 'bad_request', data: T | null = null) {
    return new AppError<T>(400, message, error, data);
  }

  static unauthorized<T = any>(message: string, error = 'unauthorized', data: T | null = null) {
    return new AppError<T>(401, message, error, data);
  }

  static forbidden<T = any>(message: string, error = 'forbidden', data: T | null = null) {
    return new AppError<T>(403, message, error, data);
  }

  static notFound<T = any>(message: string, error = 'not_found', data: T | null = null) {
    return new AppError<T>(404, message, error, data);
  }

  static conflict<T = any>(message: string, error = 'conflict', data: T | null = null) {
    return new AppError<T>(409, message, error, data);
  }

  static unprocessable<T = any>(message: string, error = 'unprocessable_entity', data: T | null = null) {
    return new AppError<T>(422, message, error, data);
  }

  static serviceUnavailable<T = any>(
    message: string,
    error = 'service_unavailable',
    data: T | null = null,
    retryAfterMs?: number,
  ) {
    return new AppError<T>(503, message, error, data, retryAfterMs);
  }
}

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = 500;
  let message = 'internal server error';
  let code = 'internal_error';
  let data: any = null;

  if (err instanceof AppError) {
    statusCode = err.status || err.statusCode;
    message = err.message;
    code = err.error || err.code || code;
    data = err.data !== undefined ? err.data : null;
    if (err.retryAfterMs) {
      const retrySeconds = Math.ceil(err.retryAfterMs / 1000);
      if (retrySeconds > 0) {
        res.setHeader('Retry-After', retrySeconds);
      }
    }
  } else if (typeof err === 'object' && err !== null) {
    const e = err as {
      code?: unknown;
      status?: unknown;
      statusCode?: unknown;
      message?: unknown;
      error?: unknown;
      data?: unknown;
      retryAfterMs?: unknown;
    };
    const numeric = Number(e.status ?? e.statusCode ?? e.code);
    if (Number.isInteger(numeric) && numeric >= 400 && numeric < 600) {
      statusCode = numeric;
    }
    if (e.message && statusCode !== 500) {
      message = e.message as string;
    }
    if (typeof e.error === 'string') {
      code = e.error;
    } else if (typeof e.code === 'string') {
      code = e.code;
    }
    if (e.data !== undefined) {
      data = e.data;
    }
    if (typeof e.retryAfterMs === 'number') {
      const retrySeconds = Math.ceil(e.retryAfterMs / 1000);
      if (retrySeconds > 0) {
        res.setHeader('Retry-After', retrySeconds);
      }
    }
    if (statusCode === 429) {
      message = 'too many request. please wait';
      code = 'rate_limited';
    }
  }

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    data,
    error: code,
  });
};