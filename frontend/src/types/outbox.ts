// src/types/outbox.ts

export type OutboxStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'DISPATCHED'
  | 'DISCARDED_STALE'
  | 'FAILED';

export type OutboxMessageType =
  | 'NDR_UTILITY_TEMPLATE'
  | 'RTO_NOTICE'
  | 'DELIVERY_CORRECTION'
  | 'RESCHEDULE_CONFIRMATION';

export type OutboxChannel = 'META_WHATSAPP' | 'SMS_BACKUP' | 'IVR';

export interface OutboxShipmentRef {
  _id: string;
  trackingNumber?: string;
  carrier?: string;
  status?: string;
  orderValueCOD?: number;
}

export interface IOutboxMessageItem {
  _id: string;
  merchantId: string;
  shipmentId: string | OutboxShipmentRef;
  channel: OutboxChannel;
  messageType: OutboxMessageType;
  status: OutboxStatus;
  attempts: number;
  dedupeKey: string;
  payload: Record<string, any>;
  leaseUntil?: string;
  leaseVersion: number;
  relayClaimToken?: string;
  lastError?: string | { code?: number; message?: string } | any;
  metaMessageId?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutboxSummary {
  PENDING: number;
  PROCESSING: number;
  DISPATCHED: number;
  DISCARDED_STALE: number;
  FAILED: number;
}

export interface ListOutboxMessagesResponse {
  messages: IOutboxMessageItem[];
  total: number;
  summary: OutboxSummary;
  limit: number;
  skip: number;
}

export interface GovernorStatus {
  channel: OutboxChannel;
  isPaused: boolean;
  resumeAt: string | null;
  permitCheck: boolean;
  timestamp: string;
}

export interface MerchantTemplateConfig {
  _id?: string;
  merchantId?: string;
  messageType: OutboxMessageType;
  templateName: string;
  languageCode: string;
  headerType?: 'NONE' | 'TEXT';
  headerText?: string;
  parameterBindings: string[];
  status?: 'ACTIVE' | 'DISABLED';
  isCustom?: boolean;
  updatedAt?: string;
}

export interface OpsAlertItem {
  _id: string;
  type: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  scope: string;
  details: Record<string, any>;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListOutboxFilter {
  status?: OutboxStatus;
  messageType?: OutboxMessageType;
  channel?: OutboxChannel;
  shipmentId?: string;
  limit?: number;
  skip?: number;
}
