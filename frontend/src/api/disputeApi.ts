// src/api/disputeApi.ts
// Typed API client for CPR Margin Defense, dispute lifecycle, KPI summary, and CDR upload

import API from './api';
import { recordLog } from './telemetry';
import type {
  ICprDispute,
  DisputeKpiSummary,
  ListDisputesParams,
} from '../types/dispute';

export interface ApiResponse<T> {
  success: boolean;
  status: number;
  message: string;
  data: T;
  error: string | null;
}

async function loggedRequest<T>(
  method: string,
  endpoint: string,
  requestFn: () => Promise<{ status: number; data: ApiResponse<T> }>,
  payload?: any,
): Promise<ApiResponse<T>> {
  const start = performance.now();
  try {
    const res = await requestFn();
    recordLog({
      timestamp: new Date().toLocaleTimeString(),
      endpoint,
      method,
      status: res.status,
      durationMs: Math.round(performance.now() - start),
      payload,
      response: res.data,
      error: null,
    });
    return res.data;
  } catch (err: any) {
    recordLog({
      timestamp: new Date().toLocaleTimeString(),
      endpoint,
      method,
      status: err?.response?.status ?? 500,
      durationMs: Math.round(performance.now() - start),
      payload,
      response: err?.response?.data ?? null,
      error: err?.message ?? 'Unknown error',
    });
    throw err;
  }
}

export const disputeApi = {
  // Fetch paginated list of disputes
  listDisputes: (params?: ListDisputesParams) =>
    loggedRequest<{
      disputes: ICprDispute[];
      total: number;
      page: number;
      limit: number;
      pages: number;
    }>('GET', '/api/disputes', () => API.get('/disputes', { params })),

  // Get full dispute dossier by ID
  getDisputeById: (id: string) =>
    loggedRequest<ICprDispute>('GET', `/api/disputes/${id}`, () =>
      API.get(`/disputes/${id}`),
    ),

  // Evaluate/re-score dispute for a shipment
  evaluateDispute: (shipmentId: string) =>
    loggedRequest<ICprDispute>('POST', `/api/disputes/evaluate/${shipmentId}`, () =>
      API.post(`/disputes/evaluate/${shipmentId}`),
    ),

  // Submit dispute to courier
  submitDispute: (id: string, notes?: string) =>
    loggedRequest<ICprDispute>(
      'POST',
      `/api/disputes/${id}/submit`,
      () => API.post(`/disputes/${id}/submit`, { notes }),
      { notes },
    ),

  // Settle dispute with agreed compensation
  settleDispute: (id: string, settlementAmount: number, notes?: string) =>
    loggedRequest<ICprDispute>(
      'POST',
      `/api/disputes/${id}/settle`,
      () => API.post(`/disputes/${id}/settle`, { settlementAmount, notes }),
      { settlementAmount, notes },
    ),

  // Retract dispute
  retractDispute: (id: string, reason: string, notes?: string) =>
    loggedRequest<ICprDispute>(
      'POST',
      `/api/disputes/${id}/retract`,
      () => API.post(`/disputes/${id}/retract`, { reason, notes }),
      { reason, notes },
    ),

  // Get financial KPI metrics
  getKpiSummary: () =>
    loggedRequest<DisputeKpiSummary>('GET', '/api/disputes/kpi/summary', () =>
      API.get('/disputes/kpi/summary'),
    ),

  // Ingest CDR call-log CSV
  uploadCdrLogs: (csvContent: string) =>
    loggedRequest<{ ingestedCount: number; matchedDisputesCount: number }>(
      'POST',
      '/api/disputes/call-logs/upload',
      () => API.post('/disputes/call-logs/upload', { csvContent }),
      { rowCount: csvContent.split('\n').length },
    ),

  // Trigger settlement cutoff sweeper manually
  triggerSweeper: () =>
    loggedRequest<{ warnedCount: number; expiredCount: number }>(
      'POST',
      '/api/disputes/sweeper/trigger',
      () => API.post('/disputes/sweeper/trigger'),
    ),
};
