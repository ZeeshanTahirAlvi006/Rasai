import { CircuitBreakerOpenError } from "./carrierHealth.service.js";
import { config } from "../config/index.js"
export const DEFAULT_BASE_BACKOFF_MS = 60_000;
export const DEFAULT_MAX_BACKOFF_MS = 30 * 60_000;
//distinguish between downtime erros and client errors (clients errors should not trip it)
export function isRetriableBreakerError(error: unknown): boolean {
    if (!error) return false;
    if (error instanceof CircuitBreakerOpenError) {
        return false;
    };
    if (typeof error === 'object') {
        const err = error as Record<string, unknown>;
        const code = String(err.code || "");
        // network errors
        if (['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH', 'ENOTFOUND', 'ENETUNREACH'].includes(code)) {
            return true;
        };
        //timeout errors
        if (err.name === 'TimeoutError' || err.name === 'AbortError' || code === 'ABORT_ERR') return true
        // http status codes
        const reponseObj = err.response as Record<string, unknown>;
        const status = Number(err.status || err.statusCode || reponseObj?.status);
        if (!isNaN(status)) {
            // too many requests
            if (status === 429) return true;
            // server errors
            if (status >= 500 && status <= 599) return true;
            //client erros
            if (status >= 400 && status < 500) return false;
        };

    };
    // error with timeout or network in message
    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('timeout') || msg.includes('econnrefused')
            || msg.includes('network') || msg.includes("socket hang up")) return true
    }


    return true;
}
//extract error code from arbitrary error codes
export function extractErrorCode(error: unknown): string | undefined {
    if (!error) return undefined;
    if (typeof error === 'object') {
        const err = error as Record<string, unknown>;
        if (typeof err.code === 'string') return err.code;
        if (typeof err.code === 'number') return `ERR_${err.code}`;
        if (typeof err.status === 'number') return `HTTP_${err.status}`;
        if (typeof err.statusCode === 'number') return `HTTP_${err.statusCode}`;

        const response = err.reponse as Record<string, unknown> | undefined;
        if (response && typeof response.status === 'number') return `HTTP_${response.status}`;
    };
    if (error instanceof Error) return error.name;
    return 'UNKNOWN_ERROR'
}

//calculate exponential backoff with jitter to prevent thundering herd
export function calculateBackOffWithJitter(tripCount: number,
    baseBackOffMs = DEFAULT_BASE_BACKOFF_MS,
    maxBackOffMs = (config?.breaker?.defaultPauseMs ?? DEFAULT_MAX_BACKOFF_MS)
): number {
    const exponential = Math.min(baseBackOffMs * 2 ** Math.max(0, tripCount), maxBackOffMs);
    const jitter = Math.floor(Math.random() * (exponential * 0.2));
    return Math.min(exponential + jitter, maxBackOffMs)
}