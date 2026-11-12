// src/middleware/cookieParser.ts
// Lightweight zero-dependency cookie parser middleware for Express request cookies.
import { Request, Response, NextFunction } from 'express';

export function cookieParserMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.cookie;
  const cookies: Record<string, string> = {};

  if (header) {
    const pairs = header.split(';');
    for (const pair of pairs) {
      const idx = pair.indexOf('=');
      if (idx < 0) continue;
      const key = pair.slice(0, idx).trim();
      if (!key) continue;
      let val = pair.slice(idx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      try {
        cookies[key] = decodeURIComponent(val);
      } catch {
        cookies[key] = val;
      }
    }
  }

  req.cookies = cookies;
  next();
}
