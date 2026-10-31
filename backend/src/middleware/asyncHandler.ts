// src/middleware/asyncHandler.ts
// Express async controller wrapper catching unhandled promise rejections and passing to error middleware.
import { Request, Response, NextFunction, RequestHandler } from 'express';

export const asyncHandler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
