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
