// src/middleware/validate.ts
// Express middleware for Zod schema validation of request params, query, body, and headers.
import { Request, Response, NextFunction } from "express"
import { z, ZodObject } from 'zod'

export const validate = (schema: ZodObject) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const result = await schema.safeParseAsync({
            params: req.params,
            query: req.query,
            body: req.body,
            headers: req.headers,
            cookies: req.cookies
        });
        if (!result.success) {
            const formattedErrors = z.treeifyError(result.error);
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                data: null,
                error: formattedErrors
            });

        }
        const data = result.data as {
            params?: Record<string, string>,
            query?: Record<string, unknown>,
            body?: unknown,
            headers?: unknown,
            cookies?: unknown
        }
        req.body = data.body ?? req.body
        req.headers = data.headers as any ?? req.headers
        req.cookies = data.cookies ?? req.cookies
        if (data.params) Object.assign(req.params, data.params)
        // Express 5: req.query is a read-only getter, so parsed/coerced query lives on res.locals
        res.locals.query = data.query ?? {}

        return next()
    }
}