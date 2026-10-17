// src/middleware/requireAuth.ts
import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Types } from 'mongoose';
import { config } from '../config/index.js';
import { AppError } from './error.js';

/**
 * Verifies the Bearer access token and attaches the merchant identity.
 * Refresh tokens share the same secret and also carry `id`, so we additionally
 * require the `sessionId` claim, which only access tokens have.
 */
export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'missing access token', 'unauthorized'));
  }
  let payload: JwtPayload;
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (typeof decoded === 'string') throw new Error('unexpected token payload');
    payload = decoded;
  } catch {
    return next(new AppError(401, 'invalid or expired access token', 'unauthorized'));
  }
  const { id, sessionId } = payload as { id?: unknown; sessionId?: unknown };
  if (typeof id !== 'string' || typeof sessionId !== 'string' || !Types.ObjectId.isValid(id)) {
    return next(new AppError(401, 'invalid access token', 'unauthorized'));
  }
  req.user = { id, merchantId: new Types.ObjectId(id), sessionId };
  return next();
};
