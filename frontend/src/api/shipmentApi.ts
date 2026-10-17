// src/api/shipmentApi.ts
import API from './api';
import type {
  BulkCreateRowInput,
  BulkCreateResponse,
  ListShipmentsFilter,
  ListShipmentsResponse,
  GetShipmentResponse,
  UpdateShipmentInput,
  CancelShipmentResponse,
  ApiEnvelope,
  ApiCallLogEntry,
  IShipment,
} from '../types/shipment';

// Global log listener for the API Inspector tab
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

/**
 * Bulk ingestion of up to 500 shipments (POST /api/shipments/bulk)
 */
export async function bulkCreateShipments(
  shipments: BulkCreateRowInput[],
): Promise<{ status: number; envelope: ApiEnvelope<BulkCreateResponse> }> {
  const start = performance.now();
  const endpoint = '/shipments/bulk';
  const reqBody = { shipments };

  try {
    const res = await API.post<ApiEnvelope<BulkCreateResponse>>(endpoint, reqBody);
    const duration = Math.round(performance.now() - start);

    recordLog({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      method: 'POST',
      endpoint,
      status: res.status,
      durationMs: duration,
      requestBody: reqBody,
      responseBody: res.data,
      isError: false,
    });

    return { status: res.status, envelope: res.data };
  } catch (err: any) {
    const duration = Math.round(performance.now() - start);
    const status = err.response?.status || 500;
    const respData = err.response?.data || { success: false, message: err.message, error: err.message };

    recordLog({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      method: 'POST',
      endpoint,
      status,
      durationMs: duration,
      requestBody: reqBody,
      responseBody: respData,
      isError: true,
    });

    throw {
      status,
      message: respData.message || err.message,
      data: respData.data || null,
      error: respData.error || err.message,
    };
  }
}

/**
 * List shipments with cursor pagination and filtering (GET /api/shipments)
 */
export async function listShipments(
  filter?: ListShipmentsFilter,
): Promise<{ status: number; envelope: ApiEnvelope<ListShipmentsResponse> }> {
  const start = performance.now();
  const endpoint = '/shipments';

  const params: Record<string, any> = {};
  if (filter) {
    if (filter.cursor) params.cursor = filter.cursor;
    if (filter.limit) params.limit = filter.limit;
    if (filter.status) {
      params.status = Array.isArray(filter.status) ? filter.status.join(',') : filter.status;
    }
    if (filter.carrier) params.carrier = filter.carrier;
    if (filter.trackingHealth) params.trackingHealth = filter.trackingHealth;
    if (filter.needsManifest !== undefined) params.needsManifest = filter.needsManifest;
    if (filter.trackingNumber) params.trackingNumber = filter.trackingNumber.trim();
  }

  try {
    const res = await API.get<ApiEnvelope<ListShipmentsResponse>>(endpoint, { params });
    const duration = Math.round(performance.now() - start);

    recordLog({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      method: 'GET',
      endpoint: `${endpoint}?${new URLSearchParams(params).toString()}`,
      status: res.status,
      durationMs: duration,
      requestBody: null,
      responseBody: res.data,
      isError: false,
    });

    return { status: res.status, envelope: res.data };
  } catch (err: any) {
    const duration = Math.round(performance.now() - start);
    const status = err.response?.status || 500;
    const respData = err.response?.data || { success: false, message: err.message, error: err.message };

    recordLog({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      method: 'GET',
      endpoint: `${endpoint}?${new URLSearchParams(params).toString()}`,
      status,
      durationMs: duration,
      requestBody: null,
      responseBody: respData,
      isError: true,
    });

    throw {
      status,
      message: respData.message || err.message,
      data: respData.data || null,
      error: respData.error || err.message,
    };
  }
}

/**
 * Get shipment details and timeline (GET /api/shipments/:id)
 */
export async function getShipment(
  id: string,
): Promise<{ status: number; envelope: ApiEnvelope<GetShipmentResponse> }> {
  const start = performance.now();
  const endpoint = `/shipments/${id}`;

  try {
    const res = await API.get<ApiEnvelope<GetShipmentResponse>>(endpoint);
    const duration = Math.round(performance.now() - start);

    recordLog({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      method: 'GET',
      endpoint,
      status: res.status,
      durationMs: duration,
      requestBody: null,
      responseBody: res.data,
      isError: false,
    });

    return { status: res.status, envelope: res.data };
  } catch (err: any) {
    const duration = Math.round(performance.now() - start);
    const status = err.response?.status || 500;
    const respData = err.response?.data || { success: false, message: err.message, error: err.message };

    recordLog({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      method: 'GET',
      endpoint,
      status,
      durationMs: duration,
      requestBody: null,
      responseBody: respData,
      isError: true,
    });

    throw {
      status,
      message: respData.message || err.message,
      data: respData.data || null,
      error: respData.error || err.message,
    };
  }
}

/**
 * Optimistic update of parcel metadata (PATCH /api/shipments/:id)
 */
export async function updateShipment(
  id: string,
  patch: UpdateShipmentInput,
): Promise<{ status: number; envelope: ApiEnvelope<IShipment> }> {
  const start = performance.now();
  const endpoint = `/shipments/${id}`;

  try {
    const res = await API.patch<ApiEnvelope<IShipment>>(endpoint, patch);
    const duration = Math.round(performance.now() - start);

    recordLog({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      method: 'PATCH',
      endpoint,
      status: res.status,
      durationMs: duration,
      requestBody: patch,
      responseBody: res.data,
      isError: false,
    });

    return { status: res.status, envelope: res.data };
  } catch (err: any) {
    const duration = Math.round(performance.now() - start);
    const status = err.response?.status || 500;
    const respData = err.response?.data || { success: false, message: err.message, error: err.message };

    recordLog({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      method: 'PATCH',
      endpoint,
      status,
      durationMs: duration,
      requestBody: patch,
      responseBody: respData,
      isError: true,
    });

    throw {
      status,
      message: respData.message || err.message,
      data: respData.data || null,
      error: respData.error || err.message,
    };
  }
}

/**
 * Formal cancellation via state engine (POST /api/shipments/:id/cancel)
 */
export async function cancelShipment(
  id: string,
): Promise<{ status: number; envelope: ApiEnvelope<CancelShipmentResponse> }> {
  const start = performance.now();
  const endpoint = `/shipments/${id}/cancel`;

  try {
    const res = await API.post<ApiEnvelope<CancelShipmentResponse>>(endpoint, {});
    const duration = Math.round(performance.now() - start);

    recordLog({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      method: 'POST',
      endpoint,
      status: res.status,
      durationMs: duration,
      requestBody: {},
      responseBody: res.data,
      isError: false,
    });

    return { status: res.status, envelope: res.data };
  } catch (err: any) {
    const duration = Math.round(performance.now() - start);
    const status = err.response?.status || 500;
    const respData = err.response?.data || { success: false, message: err.message, error: err.message };

    recordLog({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      method: 'POST',
      endpoint,
      status,
      durationMs: duration,
      requestBody: {},
      responseBody: respData,
      isError: true,
    });

    throw {
      status,
      message: respData.message || err.message,
      data: respData.data || null,
      error: respData.error || err.message,
    };
  }
}
