// src/outbox/metaClient.ts
import { config } from '../config/index';
import type { IOutboxMessage } from '../models/OutboxMessage';
import type { IShipment } from '../shipment/shipment.model';
import type { OutboxMessageType } from '../types';
import { MerchantWaTemplate, type IMerchantWaTemplate } from '../models/MerchantWaTemplate';
import { normalizePkPhone } from '../utils/phone';

export type MetaErrorClassification =
  | 'SPAM_RATE_LIMIT'
  | 'THROUGHPUT_LIMIT'
  | 'PAIR_LIMIT'
  | 'PERMANENT_FATAL'
  | 'TRANSIENT_RETRYABLE';

export const PERMANENT_META_ERROR_CODES = new Set<number>([
  100, // Invalid parameter
  131008, // Required parameter is missing
  131009, // Parameter value is not valid
  131026, // Message undeliverable (phone number not on WhatsApp)
  132000, // Template does not exist
  132001, // Template parameter count mismatch
  132005, // Template translated text missing
  132012, // Template header format mismatch
  133010, // Account disabled
]);

export interface MetaSendResult {
  messages: Array<{ id: string }>;
}

export interface ClassifiedMetaError {
  code?: number;
  statusCode?: number;
  classification: MetaErrorClassification;
  message: string;
}

export class MetaApiError extends Error {
  code?: number;
  statusCode?: number;
  data?: any;

  constructor(message: string, statusCode?: number, code?: number, data?: any) {
    super(message);
    this.name = 'MetaApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.data = data;
  }
}

export function classifyMetaError(err: any): ClassifiedMetaError {
  const errorObj = err?.data?.error || err?.response?.data?.error;
  const code: number | undefined = errorObj?.code ?? err?.code;
  const statusCode: number | undefined = err?.statusCode ?? err?.status ?? err?.response?.status;
  const rawMessage: string = errorObj?.message || err?.message || 'Meta API call failed';

  if (code === 131048) {
    return { code, statusCode, classification: 'SPAM_RATE_LIMIT', message: rawMessage };
  }
  if (code === 130429 || statusCode === 429) {
    return { code, statusCode, classification: 'THROUGHPUT_LIMIT', message: rawMessage };
  }
  if (code === 131056) {
    return { code, statusCode, classification: 'PAIR_LIMIT', message: rawMessage };
  }
  if (code != null && PERMANENT_META_ERROR_CODES.has(code)) {
    return { code, statusCode, classification: 'PERMANENT_FATAL', message: rawMessage };
  }
  if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
    return { code, statusCode, classification: 'PERMANENT_FATAL', message: rawMessage };
  }

  return { code, statusCode, classification: 'TRANSIENT_RETRYABLE', message: rawMessage };
}

// Bounded in-memory template configuration cache (B2-BN-02)
interface CachedTemplate {
  template: IMerchantWaTemplate | null;
  cachedAt: number;
}
const templateCache = new Map<string, CachedTemplate>();
const MAX_TEMPLATE_CACHE_SIZE = 500;
const TEMPLATE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function invalidateTemplateCache(merchantId?: string): void {
  if (!merchantId) {
    templateCache.clear();
    return;
  }
  for (const key of templateCache.keys()) {
    if (key.startsWith(`${merchantId}:`)) {
      templateCache.delete(key);
    }
  }
}

/**
 * Resolves a template parameter binding with guaranteed non-empty fallback (B2-BUG-02).
 */
export function resolveTemplateVariable(
  key: string,
  shipment: Partial<IShipment>,
  payload: Record<string, any> = {},
): string {
  switch (key) {
    case 'trackingNumber':
      return String(shipment.trackingNumber || payload.trackingNumber || 'N/A');
    case 'orderValueCOD':
    case 'cod':
      return shipment.orderValueCOD != null
        ? `PKR ${shipment.orderValueCOD}`
        : payload.cod != null
          ? `PKR ${payload.cod}`
          : 'PKR 0';
    case 'carrier':
      return String(shipment.carrier || payload.carrier || 'Courier');
    case 'customerName':
      return String(payload.customerName || 'Valued Customer');
    case 'rescheduledDate':
      if (shipment.rescheduledDate) {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(
          new Date(shipment.rescheduledDate),
        );
      }
      return payload.rescheduledDate ? String(payload.rescheduledDate) : 'the requested date';
    case 'ndrAttempt':
      return String(shipment.ndrAttempt || payload.ndrAttempt || '1');
    default:
      const val = payload[key] ?? (shipment as any)[key];
      return val != null && String(val).trim() !== '' ? String(val) : 'N/A';
  }
}

export class MetaCloudApiClient {
  private async getTemplateConfig(
    merchantId: any,
    messageType: OutboxMessageType,
  ): Promise<{
    templateName: string;
    languageCode: string;
    parameterBindings: string[];
    buttonPayloads?: Record<string, string>;
  }> {
    const cacheKey = `${String(merchantId)}:${messageType}`;
    const now = Date.now();
    const cached = templateCache.get(cacheKey);

    if (cached && now - cached.cachedAt < TEMPLATE_CACHE_TTL_MS) {
      if (cached.template) {
        return {
          templateName: cached.template.templateName,
          languageCode: cached.template.languageCode || 'en_US',
          parameterBindings: cached.template.parameterBindings || [],
          buttonPayloads: cached.template.buttonPayloads as Record<string, string>,
        };
      }
    } else {
      // Clean cache if too large
      if (templateCache.size >= MAX_TEMPLATE_CACHE_SIZE) {
        const oldestKey = templateCache.keys().next().value;
        if (oldestKey) templateCache.delete(oldestKey);
      }

      const customTemplate = await MerchantWaTemplate.findOne({
        merchantId,
        messageType: messageType as any,
        status: 'ACTIVE',
      })
        .lean()
        .exec();

      templateCache.set(cacheKey, { template: customTemplate as any, cachedAt: now });

      if (customTemplate) {
        return {
          templateName: customTemplate.templateName,
          languageCode: customTemplate.languageCode || 'en_US',
          parameterBindings: customTemplate.parameterBindings || [],
          buttonPayloads: customTemplate.buttonPayloads as Record<string, string>,
        };
      }
    }

    // Canonical System Defaults
    switch (messageType) {
      case 'NDR_UTILITY_TEMPLATE':
        return {
          templateName: process.env.META_TEMPLATE_NDR_UTILITY || 'ndr_utility_v1',
          languageCode: 'en_US',
          parameterBindings: ['trackingNumber', 'orderValueCOD', 'carrier'],
          buttonPayloads: {
            reschedule: 'ACTION_RESCHEDULE',
            addressCorrection: 'ACTION_CORRECTION',
            cancel: 'ACTION_CANCEL',
          },
        };
      case 'RTO_NOTICE':
        return {
          templateName: process.env.META_TEMPLATE_RTO_NOTICE || 'ndr_rto_notice_v1',
          languageCode: 'en_US',
          parameterBindings: ['trackingNumber', 'orderValueCOD'],
        };
      case 'DELIVERY_CORRECTION':
        return {
          templateName: process.env.META_TEMPLATE_DELIVERY_CORRECTION || 'ndr_delivery_correction_v1',
          languageCode: 'en_US',
          parameterBindings: ['trackingNumber'],
        };
      case 'RESCHEDULE_CONFIRMATION':
        return {
          templateName: process.env.META_TEMPLATE_RESCHEDULE_CONFIRMATION || 'ndr_reschedule_confirmed_v1',
          languageCode: 'en_US',
          parameterBindings: ['trackingNumber', 'rescheduledDate'],
        };
      default:
        return {
          templateName: 'ndr_notification_v1',
          languageCode: 'en_US',
          parameterBindings: ['trackingNumber'],
        };
    }
  }

  /**
   * Dispatches a WhatsApp template message via Meta Graph API v21.0.
   */
  async send(
    msg: IOutboxMessage,
    shipment: Partial<IShipment>,
    decryptedPhone: string,
  ): Promise<MetaSendResult> {
    const phoneNumberId = config.meta.phoneNumberId || process.env.META_PHONE_NUMBER_ID;
    const accessToken = config.meta.accessToken || process.env.META_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      throw new Error('Meta WhatsApp Cloud API credentials (META_PHONE_NUMBER_ID / META_ACCESS_TOKEN) are missing');
    }

    // Meta expects recipient digits without leading '+' (e.g. 923001234567)
    const e164 = normalizePkPhone(decryptedPhone);
    const recipientDigits = e164.replace(/^\+/, '');

    const tplConfig = await this.getTemplateConfig(msg.merchantId, msg.messageType);
    const bodyParameters = (tplConfig.parameterBindings || []).map((binding) => ({
      type: 'text',
      text: resolveTemplateVariable(binding, shipment, msg.payload || {}),
    }));

    const components: any[] = [];
    if (bodyParameters.length > 0) {
      components.push({
        type: 'body',
        parameters: bodyParameters,
      });
    }

    // If quick-reply button payloads exist
    if (tplConfig.buttonPayloads) {
      const buttonKeys = Object.keys(tplConfig.buttonPayloads);
      buttonKeys.forEach((btnKey, idx) => {
        const rawPayload = tplConfig.buttonPayloads![btnKey];
        // Append :shipmentId to payload for unambiguous parcel resolution (B3-BUG-01)
        const boundPayload = shipment?._id ? `${rawPayload}:${shipment._id}` : rawPayload;
        components.push({
          type: 'button',
          sub_type: 'quick_reply',
          index: idx,
          parameters: [
            {
              type: 'payload',
              payload: boundPayload,
            },
          ],
        });
      });
    }

    const requestBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientDigits,
      type: 'template',
      template: {
        name: tplConfig.templateName,
        language: {
          code: tplConfig.languageCode,
        },
        components: components.length > 0 ? components : undefined,
      },
    };

    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(15_000), // Strict 15s timeout (RC-03, RC-06)
    });

    const responseData: any = await res.json().catch(() => null);

    if (!res.ok) {
      const errorCode = responseData?.error?.code;
      const errorMsg = responseData?.error?.message || `Meta API request failed with status ${res.status}`;
      throw new MetaApiError(errorMsg, res.status, errorCode, responseData);
    }

    return responseData as MetaSendResult;
  }

  /**
   * Dispatches an interactive prompt or session message within the 24h customer window (Spec §7.2).
   * Gracefully falls back to simulation mode in test or when Meta credentials are absent.
   */
  async sendInteractiveSessionMessage(
    decryptedPhone: string,
    messagePayload: {
      type: 'text' | 'button' | 'list';
      bodyText: string;
      buttonText?: string;
      buttons?: Array<{ id: string; title: string }>;
      sections?: Array<{
        title: string;
        rows: Array<{ id: string; title: string; description?: string }>;
      }>;
    },
  ): Promise<{ wamid: string; simulated: boolean }> {
    const phoneNumberId = config.meta.phoneNumberId || process.env.META_PHONE_NUMBER_ID;
    const accessToken = config.meta.accessToken || process.env.META_ACCESS_TOKEN;

    // In tests or local dev without live Meta credentials, generate a simulated delivery (Q3)
    if (!phoneNumberId || !accessToken || config.nodeEnv === 'test') {
      return {
        wamid: `wamid_sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        simulated: true,
      };
    }

    const e164 = normalizePkPhone(decryptedPhone);
    const recipientDigits = e164.replace(/^\+/, '');

    let interactiveObj: any = null;
    if (messagePayload.type === 'button') {
      interactiveObj = {
        type: 'button',
        body: { text: messagePayload.bodyText },
        action: {
          buttons: (messagePayload.buttons || []).map((btn) => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title.slice(0, 20),
            },
          })),
        },
      };
    } else if (messagePayload.type === 'list') {
      interactiveObj = {
        type: 'list',
        body: { text: messagePayload.bodyText },
        action: {
          button: (messagePayload.buttonText || 'Options').slice(0, 20),
          sections: (messagePayload.sections || []).map((sec) => ({
            title: sec.title.slice(0, 24),
            rows: sec.rows.map((r) => ({
              id: r.id,
              title: r.title.slice(0, 24),
              description: r.description ? r.description.slice(0, 72) : undefined,
            })),
          })),
        },
      };
    }

    const requestBody: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientDigits,
    };

    if (interactiveObj) {
      requestBody.type = 'interactive';
      requestBody.interactive = interactiveObj;
    } else {
      requestBody.type = 'text';
      requestBody.text = { body: messagePayload.bodyText };
    }

    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(8_000), // Strict 8s session prompt timeout (B3-BN-02)
    });

    const responseData: any = await res.json().catch(() => null);

    if (!res.ok) {
      const errorCode = responseData?.error?.code;
      const errorMsg = responseData?.error?.message || `Meta API session message failed with status ${res.status}`;
      throw new MetaApiError(errorMsg, res.status, errorCode, responseData);
    }

    const wamid = responseData?.messages?.[0]?.id || `wamid_${Date.now()}`;
    return { wamid, simulated: false };
  }
}

export const metaClient = new MetaCloudApiClient();
