// src/api/shipmentEventApi.ts
import API from './api';
import { recordLog } from './shipmentApi';
import type {
  ApiEnvelope,
  RecordShipmentEventInput,
  RecordShipmentEventResult,
  BulkRecordEventsInput,
  BulkRecordEventsResult,
  ListShipmentEventsFilter,
  ListShipmentEventsResult,
  LedgerMetricsFilter,
  LedgerMetricsResult,
  ShipmentTimelineResult,
} from '../types/shipment';

/**
 * Record a single shipment event (POST /api/shipment-events)
 * Used by carrier poller webhooks, driver apps, or customer action ingestion.
 */
export async function recordShipmentEvent(
  eventData: RecordShipmentEventInput,
): Promise<{ status: number; envelope: ApiEnvelope<RecordShipmentEventResult> }> {
  const start = performance.now();
  const endpoint = '/shipment-events';
  const reqBody = eventData;

  try {
    const res = await API.post<ApiEnvelope<RecordShipmentEventResult>>(endpoint, reqBody);
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
 * Bulk ingestion of up to 500 events (POST /api/shipment-events/bulk)
 * Runs lane-based concurrency and optimistic state engine transitions.
 */
export async function bulkRecordShipmentEvents(
  input: BulkRecordEventsInput,
): Promise<{ status: number; envelope: ApiEnvelope<BulkRecordEventsResult> }> {
  const start = performance.now();
  const endpoint = '/shipment-events/bulk';
  const reqBody = input;

  try {
    const res = await API.post<ApiEnvelope<BulkRecordEventsResult>>(endpoint, reqBody);
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
 * Paginated ledger audit query (GET /api/shipment-events)
 */
export async function listShipmentEvents(
  filter?: ListShipmentEventsFilter,
): Promise<{ status: number; envelope: ApiEnvelope<ListShipmentEventsResult> }> {
  const start = performance.now();
  const endpoint = '/shipment-events';

  const params: Record<string, any> = {};
  if (filter) {
    if (filter.cursor) params.cursor = filter.cursor;
    if (filter.limit) params.limit = filter.limit;
    if (filter.carrier) params.carrier = filter.carrier;
    if (filter.trackingNumber) params.trackingNumber = filter.trackingNumber;
    if (filter.source) params.source = filter.source;
    if (filter.disposition) params.disposition = filter.disposition;
    if (filter.batchId) params.batchId = filter.batchId;
    if (filter.startDate) params.startDate = filter.startDate;
    if (filter.endDate) params.endDate = filter.endDate;
  }

  try {
    const res = await API.get<ApiEnvelope<ListShipmentEventsResult>>(endpoint, { params });
    const duration = Math.round(performance.now() - start);

    recordLog({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      method: 'GET',
      endpoint: `${endpoint}${Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : ''}`,
      status: res.status,
      durationMs: duration,
      requestBody: params,
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
      endpoint: `${endpoint}${Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : ''}`,
      status,
      durationMs: duration,
      requestBody: params,
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
 * Telemetry and audit aggregation metrics (GET /api/shipment-events/metrics)
 */
export async function getLedgerMetrics(
  filter?: LedgerMetricsFilter,
): Promise<{ status: number; envelope: ApiEnvelope<LedgerMetricsResult> }> {
  const start = performance.now();
  const endpoint = '/shipment-events/metrics';

  const params: Record<string, any> = {};
  if (filter) {
    if (filter.carrier) params.carrier = filter.carrier;
    if (filter.startDate) params.startDate = filter.startDate;
    if (filter.endDate) params.endDate = filter.endDate;
  }

  try {
    const res = await API.get<ApiEnvelope<LedgerMetricsResult>>(endpoint, { params });
    const duration = Math.round(performance.now() - start);

    recordLog({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      method: 'GET',
      endpoint: `${endpoint}${Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : ''}`,
      status: res.status,
      durationMs: duration,
      requestBody: params,
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
      endpoint: `${endpoint}${Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : ''}`,
      status,
      durationMs: duration,
      requestBody: params,
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
 * Specific parcel chronological event timeline (GET /api/shipment-events/timeline/:carrier/:trackingNumber)
 */
export async function getShipmentEventTimeline(
  carrier: string,
  trackingNumber: string,
): Promise<{ status: number; envelope: ApiEnvelope<ShipmentTimelineResult> }> {
  const start = performance.now();
  const endpoint = `/shipment-events/timeline/${encodeURIComponent(carrier)}/${encodeURIComponent(trackingNumber)}`;

  try {
    const res = await API.get<ApiEnvelope<ShipmentTimelineResult>>(endpoint);
    const duration = Math.round(performance.now() - start);

    recordLog({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      method: 'GET',
      endpoint,
      status: res.status,
      durationMs: duration,
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
