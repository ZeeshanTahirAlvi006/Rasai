// src/api/outboxApi.ts
import API from './api';
import { recordLog } from './shipmentApi';
import type {
  IOutboxMessageItem,
  ListOutboxMessagesResponse,
  GovernorStatus,
  MerchantTemplateConfig,
  OpsAlertItem,
  ListOutboxFilter,
} from '../types/outbox';

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

function logCall(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  endpoint: string,
  start: number,
  res?: any,
  reqBody?: any,
  err?: any,
) {
  const duration = Math.round(performance.now() - start);
  recordLog({
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toLocaleTimeString(),
    method,
    endpoint,
    status: res?.status || err?.response?.status || 500,
    durationMs: duration,
    requestBody: reqBody,
    responseBody: res?.data || err?.response?.data,
    isError: !res || res.status >= 400,
  });
}

/**
 * Fetch paginated outbox messages with status summary
 */
export async function listOutboxMessages(
  filter: ListOutboxFilter = {},
): Promise<{ status: number; data: ListOutboxMessagesResponse }> {
  const start = performance.now();
  const endpoint = '/outbox';

  try {
    const res = await API.get<ApiEnvelope<ListOutboxMessagesResponse>>(endpoint, {
      params: filter,
    });
    logCall('GET', endpoint, start, res);
    return { status: res.status, data: res.data.data };
  } catch (err: any) {
    logCall('GET', endpoint, start, undefined, undefined, err);
    throw {
      status: err?.response?.status || 500,
      message: err?.response?.data?.message || err.message,
    };
  }
}

/**
 * Fetch a single outbox message details
 */
export async function getOutboxMessageDetail(
  id: string,
): Promise<{ status: number; data: IOutboxMessageItem }> {
  const start = performance.now();
  const endpoint = `/outbox/${id}`;

  try {
    const res = await API.get<ApiEnvelope<IOutboxMessageItem>>(endpoint);
    logCall('GET', endpoint, start, res);
    return { status: res.status, data: res.data.data };
  } catch (err: any) {
    logCall('GET', endpoint, start, undefined, undefined, err);
    throw {
      status: err?.response?.status || 500,
      message: err?.response?.data?.message || err.message,
    };
  }
}

/**
 * Manually trigger relay tick to claim PENDING messages and enqueue to BullMQ
 */
export async function triggerRelayTick(
  batch = 50,
): Promise<{ status: number; data: { claimedCount: number; timestamp: string } }> {
  const start = performance.now();
  const endpoint = '/outbox/relay/trigger';
  const reqBody = { batch };

  try {
    const res = await API.post<ApiEnvelope<{ claimedCount: number; timestamp: string }>>(
      endpoint,
      reqBody,
    );
    logCall('POST', endpoint, start, res, reqBody);
    return { status: res.status, data: res.data.data };
  } catch (err: any) {
    logCall('POST', endpoint, start, undefined, reqBody, err);
    throw {
      status: err?.response?.status || 500,
      message: err?.response?.data?.message || err.message,
    };
  }
}

/**
 * Manually dispatch/process a single outbox message immediately
 */
export async function dispatchOutboxMessage(
  id: string,
): Promise<{ status: number; data: IOutboxMessageItem; message: string }> {
  const start = performance.now();
  const endpoint = `/outbox/${id}/dispatch`;

  try {
    const res = await API.post<ApiEnvelope<IOutboxMessageItem>>(endpoint);
    logCall('POST', endpoint, start, res);
    return { status: res.status, data: res.data.data, message: res.data.message || 'Dispatched' };
  } catch (err: any) {
    logCall('POST', endpoint, start, undefined, undefined, err);
    throw {
      status: err?.response?.status || 500,
      message: err?.response?.data?.message || err.message,
    };
  }
}

/**
 * Get current SendGovernor status
 */
export async function getGovernorStatus(): Promise<{ status: number; data: GovernorStatus }> {
  const start = performance.now();
  const endpoint = '/outbox/governor/status';

  try {
    const res = await API.get<ApiEnvelope<GovernorStatus>>(endpoint);
    logCall('GET', endpoint, start, res);
    return { status: res.status, data: res.data.data };
  } catch (err: any) {
    logCall('GET', endpoint, start, undefined, undefined, err);
    throw {
      status: err?.response?.status || 500,
      message: err?.response?.data?.message || err.message,
    };
  }
}

/**
 * Pause Governor for testing or circuit breaking
 */
export async function pauseGovernor(
  channel = 'META_WHATSAPP',
  durationMs = 600_000,
): Promise<{ status: number; data: any }> {
  const start = performance.now();
  const endpoint = '/outbox/governor/pause';
  const reqBody = { channel, durationMs };

  try {
    const res = await API.post<ApiEnvelope<any>>(endpoint, reqBody);
    logCall('POST', endpoint, start, res, reqBody);
    return { status: res.status, data: res.data.data };
  } catch (err: any) {
    logCall('POST', endpoint, start, undefined, reqBody, err);
    throw {
      status: err?.response?.status || 500,
      message: err?.response?.data?.message || err.message,
    };
  }
}

/**
 * Resume Governor immediately
 */
export async function resumeGovernor(
  channel = 'META_WHATSAPP',
): Promise<{ status: number; data: any }> {
  const start = performance.now();
  const endpoint = '/outbox/governor/resume';
  const reqBody = { channel };

  try {
    const res = await API.post<ApiEnvelope<any>>(endpoint, reqBody);
    logCall('POST', endpoint, start, res, reqBody);
    return { status: res.status, data: res.data.data };
  } catch (err: any) {
    logCall('POST', endpoint, start, undefined, reqBody, err);
    throw {
      status: err?.response?.status || 500,
      message: err?.response?.data?.message || err.message,
    };
  }
}

/**
 * List merchant WhatsApp templates
 */
export async function listTemplates(): Promise<{
  status: number;
  data: MerchantTemplateConfig[];
}> {
  const start = performance.now();
  const endpoint = '/outbox/templates';

  try {
    const res = await API.get<ApiEnvelope<MerchantTemplateConfig[]>>(endpoint);
    logCall('GET', endpoint, start, res);
    return { status: res.status, data: res.data.data };
  } catch (err: any) {
    logCall('GET', endpoint, start, undefined, undefined, err);
    throw {
      status: err?.response?.status || 500,
      message: err?.response?.data?.message || err.message,
    };
  }
}

/**
 * Save or update merchant WhatsApp template config
 */
export async function saveTemplate(
  template: Partial<MerchantTemplateConfig>,
): Promise<{ status: number; data: MerchantTemplateConfig }> {
  const start = performance.now();
  const endpoint = '/outbox/templates';

  try {
    const res = await API.post<ApiEnvelope<MerchantTemplateConfig>>(endpoint, template);
    logCall('POST', endpoint, start, res, template);
    return { status: res.status, data: res.data.data };
  } catch (err: any) {
    logCall('POST', endpoint, start, undefined, template, err);
    throw {
      status: err?.response?.status || 500,
      message: err?.response?.data?.message || err.message,
    };
  }
}

/**
 * List active ops alerts
 */
export async function listOpsAlerts(): Promise<{ status: number; data: OpsAlertItem[] }> {
  const start = performance.now();
  const endpoint = '/outbox/alerts';

  try {
    const res = await API.get<ApiEnvelope<OpsAlertItem[]>>(endpoint);
    logCall('GET', endpoint, start, res);
    return { status: res.status, data: res.data.data };
  } catch (err: any) {
    logCall('GET', endpoint, start, undefined, undefined, err);
    throw {
      status: err?.response?.status || 500,
      message: err?.response?.data?.message || err.message,
    };
  }
}

/**
 * Mark an ops alert as resolved
 */
export async function resolveOpsAlert(
  id: string,
): Promise<{ status: number; data: OpsAlertItem }> {
  const start = performance.now();
  const endpoint = `/outbox/alerts/${id}/resolve`;

  try {
    const res = await API.post<ApiEnvelope<OpsAlertItem>>(endpoint);
    logCall('POST', endpoint, start, res);
    return { status: res.status, data: res.data.data };
  } catch (err: any) {
    logCall('POST', endpoint, start, undefined, undefined, err);
    throw {
      status: err?.response?.status || 500,
      message: err?.response?.data?.message || err.message,
    };
  }
}
