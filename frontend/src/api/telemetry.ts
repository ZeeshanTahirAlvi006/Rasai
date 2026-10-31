// src/api/telemetry.ts
// Central telemetry hub for live API Inspector console logging.
export interface ApiCallLogEntry {
  id?: string;
  timestamp: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | string;
  status: number;
  durationMs: number;
  requestBody?: unknown;
  responseBody?: unknown;
  isError?: boolean;
  payload?: any;
  response?: any;
  error?: string | null;
}

type LogListener = (entry: ApiCallLogEntry) => void;
const logListeners: Set<LogListener> = new Set();

export const onApiCallLogged = (listener: LogListener): (() => void) => {
  logListeners.add(listener);
  return () => {
    logListeners.delete(listener);
  };
};

export function recordLog(entry: ApiCallLogEntry) {
  logListeners.forEach((fn) => {
    try {
      fn(entry);
    } catch (e) {
      console.error('Log listener error:', e);
    }
  });
}
