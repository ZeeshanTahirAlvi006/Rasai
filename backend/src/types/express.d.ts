// src/types/express.d.ts
// Global Express type declarations augmenting Request with authenticated user and rawBody buffer.
import type { Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        merchantId: Types.ObjectId;
        sessionId: string;
      };
    }
  }
}

export {};
