// src/api/conversationApi.ts
import API from './api';
import { recordLog } from './shipmentApi';
import type {
  IConversationSessionItem,
  ListConversationsResponse,
  ListConversationsFilter,
  SimulateInboundInput,
} from '../types/conversation';

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
 * List paginated customer conversation sessions with state counters
 */
export async function listConversations(
  filter: ListConversationsFilter = {},
): Promise<{ status: number; data: ListConversationsResponse }> {
  const start = performance.now();
  const endpoint = '/conversations';

  try {
    const res = await API.get<ApiEnvelope<ListConversationsResponse>>(endpoint, {
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
 * Get detailed conversation session and full chat transcript
 */
export async function getConversationDetail(
  id: string,
): Promise<{ status: number; data: IConversationSessionItem }> {
  const start = performance.now();
  const endpoint = `/conversations/${id}`;

  try {
    const res = await API.get<ApiEnvelope<IConversationSessionItem>>(endpoint);
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
 * Simulate customer WhatsApp turn directly from the frontend UI console
 */
export async function simulateInboundTurn(
  input: SimulateInboundInput,
): Promise<{ status: number; data: any; message: string }> {
  const start = performance.now();
  const endpoint = '/conversations/simulate';

  try {
    const res = await API.post<ApiEnvelope<any>>(endpoint, input);
    logCall('POST', endpoint, start, res, input);
    return { status: res.status, data: res.data.data, message: res.data.message || 'Processed' };
  } catch (err: any) {
    logCall('POST', endpoint, start, undefined, input, err);
    throw {
      status: err?.response?.status || 500,
      message: err?.response?.data?.message || err.message,
    };
  }
}

/**
 * Manually expire a conversation session
 */
export const simulateInboundConversation = simulateInboundTurn;
export const expireOverdueConversations = (id: string) => expireConversation(id);

export async function expireConversation(
  id: string,
): Promise<{ status: number; data: IConversationSessionItem }> {
  const start = performance.now();
  const endpoint = `/conversations/${id}/expire`;

  try {
    const res = await API.post<ApiEnvelope<IConversationSessionItem>>(endpoint);
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
