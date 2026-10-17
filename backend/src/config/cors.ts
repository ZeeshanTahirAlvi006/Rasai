// src/config/cors.ts
import cors from 'cors';

const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/** Normalise "https://App.example.com/" -> "https://app.example.com". Throws on junk. */
function normalizeOrigin(raw: string): string {
    const url = new URL(raw.trim());
    return url.origin;
}

export function buildCorsOptions(
    allowedOriginsRaw: readonly string[] | string[],
    isProd: boolean,
): cors.CorsOptions {
    // Validate once at startup so a bad value fails fast, not on first request.
    const allowed = new Set(
        allowedOriginsRaw.filter(Boolean).map((o) => {
            if (o.trim() === '*') {
                throw new Error('CORS: wildcard "*" is not allowed (credentials are enabled)');
            }
            const origin = normalizeOrigin(o);
            if (isProd && !origin.startsWith('https://')) {
                throw new Error(`CORS: production origins must use https (got ${origin})`);
            }
            return origin;
        }),
    );

    if (isProd && allowed.size === 0) {
        throw new Error('CORS: at least one allowed origin is required in production');
    }

    return {
        origin(origin, callback) {
            // No Origin header = not a browser cross-origin request
            // (curl, health checks, server-to-server, webhooks). CORS doesn't apply.
            if (!origin) return callback(null, true);

            if (allowed.has(origin)) return callback(null, true);

            // Dev convenience only: any localhost port.
            if (!isProd && LOCALHOST_RE.test(origin)) return callback(null, true);

            // Deny quietly: no CORS headers are sent and the browser blocks it.
            // (Passing an Error here would turn it into a 500.)
            return callback(null, false);
        },

        credentials: true,

        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],

        // Only headers the browser app actually sends. Add custom ones here
        // explicitly (e.g. 'X-Request-Id') rather than reflecting everything.
        allowedHeaders: ['Content-Type', 'Authorization'],

        // Headers frontend JS is allowed to read from responses.
        exposedHeaders: ['ETag'],

        // Cache preflight results for 10 min to cut OPTIONS traffic.
        maxAge: 600,

        optionsSuccessStatus: 204,
    };
}

// ── Usage ────────────────────────────────────────────────────
// import { buildCorsOptions } from './config/cors';
//
// app.set('trust proxy', 1);              // let Express derive req.ip safely
// app.use(cors(buildCorsOptions(config.corsOrigins, config.isProd)));
// // ^ register BEFORE your routes so preflight (OPTIONS) is answered first