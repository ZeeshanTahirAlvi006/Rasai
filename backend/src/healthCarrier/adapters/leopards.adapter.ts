// src/healthCarrier/adapters/leopards.adapter.ts
// Leopards carrier adapter with live REST API, session scraper, deterministic simulator, and timeouts.
import * as cheerio from 'cheerio';
import type {
  CarrierAdapter,
  CarrierUpdate,
  MerchantCarrierCredentials,
  Status,
} from '../../types/index.js';

export interface LeopardsMilestone {
  timestamp: Date | null;
  activity: string;
  location?: string;
  canonicalStatus: Status;
}

export interface LeopardsTrackingResult {
  found: boolean;
  cn: string;
  currentStage?: string;
  deliveredAt?: string;
  signedBy?: string;
  milestones: LeopardsMilestone[];
  rawUpdates: CarrierUpdate[];
}

/**
 * Normalizes raw Leopards status strings into domain Status enum
 */
export function normalizeLeopardsStatus(raw: string): Status {
  const upper = (raw || '').trim().toUpperCase();

  if (upper.includes('DELIVERED')) return 'DELIVERED';
  if (
    upper.includes('ASSIGNED TO') ||
    upper.includes('OUT FOR DELIVERY') ||
    upper.includes('DISPATCHED')
  ) {
    return 'OUT_FOR_DELIVERY';
  }
  if (
    upper.includes('NOT AVAILABLE') ||
    upper.includes('ATTEMPT') ||
    upper.includes('REFUSED') ||
    upper.includes('FAILED') ||
    upper.includes('HOLD') ||
    upper.includes('UNREACHABLE') ||
    upper.includes('NDR')
  ) {
    return 'NDR_ACTIVE';
  }
  if (upper.includes('RETURN') || upper.includes('RTO')) {
    if (upper.includes('RETURN DELIVERED') || upper.includes('RETURNED TO SHIPPER')) {
      return 'RTO_DELIVERED';
    }
    return 'RTO_INITIATED';
  }
  if (upper.includes('CANCEL')) return 'CANCELLED';
  if (upper.includes('BOOKED')) return 'BOOKED';

  return 'IN_TRANSIT';
}

function simulateLeopardsUpdates(cn: string): CarrierUpdate[] {
  const cleanCN = cn.trim().toUpperCase();

  if (cleanCN.includes('SIM429')) {
    const error: any = new Error('HTTP 429 Too Many Requests (Leopards Scraper / API Rate Limit)');
    error.status = 429;
    error.statusCode = 429;
    error.response = { status: 429, headers: { 'retry-after': '120' } };
    throw error;
  }
  if (cleanCN.includes('SIM403')) {
    const error: any = new Error('HTTP 403 Forbidden (Leopards Cloudflare WAF Block)');
    error.status = 403;
    error.statusCode = 403;
    error.response = { status: 403 };
    throw error;
  }

  const baseTime = 1714500000000 + (cleanCN.charCodeAt(cleanCN.length - 1) * 3600000);
  const updates: CarrierUpdate[] = [];

  // Milestone 1: Booked
  updates.push({
    trackingNumber: cleanCN,
    rawStatus: 'Booked at Origin Hub',
    rawRemarks: 'Consignment booked at Karachi Express Centre',
    occurredAt: new Date(baseTime),
    carrierEventId: `${cleanCN}:1:BOOKED`,
    payload: { source: 'LEOPARDS_SIMULATOR', milestone: 'BOOKED' },
  });

  // Milestone 2: In Transit
  updates.push({
    trackingNumber: cleanCN,
    rawStatus: 'In Transit',
    rawRemarks: 'Departed Karachi Central Hub towards Destination',
    occurredAt: new Date(baseTime + 3600000),
    carrierEventId: `${cleanCN}:2:IN_TRANSIT`,
    payload: { source: 'LEOPARDS_SIMULATOR', milestone: 'IN_TRANSIT' },
  });

  if (cleanCN.includes('DELV')) {
    updates.push({
      trackingNumber: cleanCN,
      rawStatus: 'Assigned to Courier - Out for Delivery',
      rawRemarks: 'Packet given to courier for delivery',
      occurredAt: new Date(baseTime + 7200000),
      carrierEventId: `${cleanCN}:3:OFD`,
      payload: { source: 'LEOPARDS_SIMULATOR', milestone: 'OUT_FOR_DELIVERY' },
    });
    updates.push({
      trackingNumber: cleanCN,
      rawStatus: 'Shipment Delivered',
      rawRemarks: 'Delivered to consignee successfully',
      occurredAt: new Date(baseTime + 10800000),
      carrierEventId: `${cleanCN}:4:DELIVERED`,
      payload: { source: 'LEOPARDS_SIMULATOR', milestone: 'DELIVERED' },
    });
  } else if (cleanCN.includes('NDR') || cleanCN.includes('FAIL')) {
    updates.push({
      trackingNumber: cleanCN,
      rawStatus: 'Assigned to Courier - Out for Delivery',
      rawRemarks: 'Packet given to courier for delivery',
      occurredAt: new Date(baseTime + 7200000),
      carrierEventId: `${cleanCN}:3:OFD`,
      payload: { source: 'LEOPARDS_SIMULATOR', milestone: 'OUT_FOR_DELIVERY' },
    });
    updates.push({
      trackingNumber: cleanCN,
      rawStatus: 'Delivery Attempted - Consignee Not Available',
      rawRemarks: 'Door locked / customer not available at address',
      occurredAt: new Date(baseTime + 10800000),
      carrierEventId: `${cleanCN}:4:NDR`,
      payload: { source: 'LEOPARDS_SIMULATOR', milestone: 'NDR_ACTIVE' },
    });
  } else if (cleanCN.includes('RTO')) {
    updates.push({
      trackingNumber: cleanCN,
      rawStatus: 'Return In Transit',
      rawRemarks: 'Packet returning to origin station',
      occurredAt: new Date(baseTime + 14400000),
      carrierEventId: `${cleanCN}:5:RTO`,
      payload: { source: 'LEOPARDS_SIMULATOR', milestone: 'RTO_INITIATED' },
    });
  }

  // Sort chronological occurredAt ASC (B4-RC-03)
  return updates.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
}

/**
 * Scrapes Leopards tracking page using a 3-step session-preserving flow:
 * Enforces AbortSignal.timeout(10_000) on all outbound fetch calls (B4-BN-01)
 */
export async function scrapeLeopardsTracking(cn: string): Promise<LeopardsTrackingResult> {
  const cleanCN = cn.trim().toUpperCase();
  const baseURL = 'https://pk.leopardscourier.com';

  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept':
      'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  // ── Step 1: Initial handshake to obtain session cookies + CSRF token ──
  const initRes = await fetch(`${baseURL}/shipment_tracking_view`, {
    headers,
    signal: AbortSignal.timeout(10_000), // B4-BN-01
  });
  const rawCookies = initRes.headers.getSetCookie
    ? initRes.headers.getSetCookie()
    : [initRes.headers.get('set-cookie')].filter(Boolean) as string[];
  let cookieHeader = rawCookies.map((c) => c.split(';')[0]).join('; ');

  const initHtml = await initRes.text();
  const tokenMatch = initHtml.match(/_token:\s*['"]([^'"]+)['"]/);
  const csrfToken = tokenMatch ? tokenMatch[1] : '';

  if (!csrfToken) {
    const error: any = new Error('Leopards scraper: failed to extract CSRF _token from init page');
    error.status = 502;
    error.statusCode = 502;
    throw error;
  }

  // ── Step 2: AJAX call to /shipment_tracking-new ──
  const ajaxRes = await fetch(
    `${baseURL}/shipment_tracking-new?cn_number=${encodeURIComponent(cleanCN)}&_token=${encodeURIComponent(csrfToken)}`,
    {
      headers: {
        ...headers,
        Cookie: cookieHeader,
        'X-Requested-With': 'XMLHttpRequest',
        Referer: `${baseURL}/shipment_tracking_view`,
        Accept: 'application/json, text/javascript, */*; q=0.01',
      },
      signal: AbortSignal.timeout(10_000), // B4-BN-01
    }
  );

  const ajaxCookies = ajaxRes.headers.getSetCookie
    ? ajaxRes.headers.getSetCookie()
    : [ajaxRes.headers.get('set-cookie')].filter(Boolean) as string[];
  if (ajaxCookies.length > 0) {
    const updated = ajaxCookies.map((c) => c.split(';')[0]).join('; ');
    cookieHeader = `${cookieHeader}; ${updated}`;
  }

  let ajaxSuccess = false;
  try {
    const ajaxJson = await ajaxRes.json() as { success?: boolean };
    ajaxSuccess = ajaxJson.success === true;
  } catch {
    // If not JSON, CN not found
  }

  if (!ajaxSuccess) {
    return {
      found: false,
      cn: cleanCN,
      milestones: [],
      rawUpdates: [],
    };
  }

  // ── Step 3: Fetch the rendered tracking page ──
  const pageRes = await fetch(`${baseURL}/shipment_tracking_view`, {
    headers: {
      ...headers,
      Cookie: cookieHeader,
      Referer: `${baseURL}/shipment_tracking_view`,
    },
    signal: AbortSignal.timeout(10_000), // B4-BN-01
  });

  if (!pageRes.ok) {
    const error: any = new Error(`Leopards upstream returned status ${pageRes.status}`);
    error.status = pageRes.status;
    error.statusCode = pageRes.status;
    throw error;
  }

  const html = await pageRes.text();
  const $ = cheerio.load(html);

  const activeStepText = $('#bar-progress .step.step-active').text().replace(/^\s*\d+\s*/, '').trim();
  const deliveredHeader = $('th[colspan="4"]').text().trim();

  let signedBy: string | undefined;
  $('b').each((_, el) => {
    if ($(el).text().includes('Signed for by')) {
      const val = $(el).closest('td').next('td').text().trim();
      if (val && val !== 'N/A' && val !== '-') signedBy = val;
    }
  });

  const milestones: LeopardsMilestone[] = [];
  const rawUpdates: CarrierUpdate[] = [];

  $('.tracking-item').each((idx, item) => {
    const $item = $(item);

    const dateEl = $item.find('.tracking-date');
    const timeStr = dateEl.find('span').text().replace(/[()]/g, '').trim();
    const baseDateStr = dateEl.clone().children().remove().end().text().trim();

    // Fall back to epoch new Date(0) if unparseable to avoid duplicate eventKeys on every poll (B4-BUG-04)
    let eventDate: Date = new Date(0);
    if (baseDateStr && timeStr) {
      const parsed = new Date(Date.parse(`${baseDateStr} ${timeStr} +05:00`));
      if (!isNaN(parsed.getTime())) eventDate = parsed;
    }

    const content = $item.find('.tracking-content').text().replace(/\s+/g, ' ').trim();
    const canonicalStatus = normalizeLeopardsStatus(content);

    milestones.push({
      timestamp: eventDate,
      activity: content,
      canonicalStatus,
    });

    rawUpdates.push({
      trackingNumber: cleanCN,
      rawStatus: content,
      rawRemarks: content,
      occurredAt: eventDate,
      // Deterministic carrierEventId (B4-BUG-04)
      carrierEventId: `${cleanCN}:${idx}:${canonicalStatus}`,
      // Structured payload capped to prevent memory leak (B4-ML-01)
      payload: {
        source: 'LEOPARDS_WEB_SCRAPE',
        canonicalStatus,
        activeStepText: activeStepText.slice(0, 50),
        deliveredHeader: deliveredHeader.slice(0, 50),
        signedBy: signedBy?.slice(0, 50),
      },
    });
  });

  // Sort milestones chronologically occurredAt ASC (B4-RC-03)
  rawUpdates.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  milestones.sort((a, b) => (a.timestamp?.getTime() ?? 0) - (b.timestamp?.getTime() ?? 0));

  return {
    found: rawUpdates.length > 0,
    cn: cleanCN,
    currentStage: activeStepText || undefined,
    deliveredAt: deliveredHeader || undefined,
    signedBy,
    milestones,
    rawUpdates,
  };
}

async function fetchLeopardsApiUpdates(
  apiKey: string,
  apiSecret: string,
  trackingNumbers: string[]
): Promise<CarrierUpdate[]> {
  const updates: CarrierUpdate[] = [];
  for (const cn of trackingNumbers) {
    const cleanCN = cn.trim().toUpperCase();
    const res = await fetch('https://merchantapi.leopardscourier.com/api/trackBookedPacket/format/json/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        api_password: apiSecret,
        track_numbers: cleanCN,
      }),
      signal: AbortSignal.timeout(10_000), // B4-BN-01
    });

    if (!res.ok) {
      const err: any = new Error(`Leopards Merchant API upstream returned status ${res.status}`);
      err.status = res.status;
      err.statusCode = res.status;
      const retryAfter = res.headers.get('retry-after');
      if (retryAfter) {
        err.response = { status: res.status, headers: { 'retry-after': retryAfter } };
      }
      throw err;
    }

    const data: any = await res.json().catch(() => ({}));
    const packetList = data?.packet_list || data?.data || [];
    if (Array.isArray(packetList) && packetList.length > 0) {
      for (const packet of packetList) {
        const history = packet?.booked_packet_history || packet?.history || [];
        if (Array.isArray(history) && history.length > 0) {
          const milestones: CarrierUpdate[] = history.map((item: any, idx: number) => {
            const rawStatus = item?.activity || item?.status || 'IN_TRANSIT';
            const dateStr = item?.activity_date || item?.date;
            const parsedDate = dateStr ? new Date(dateStr) : new Date(0);
            return {
              trackingNumber: cleanCN,
              rawStatus,
              rawRemarks: item?.activity || item?.status || '',
              occurredAt: isNaN(parsedDate.getTime()) ? new Date(0) : parsedDate,
              carrierEventId: `${cleanCN}:${idx}:${rawStatus}`,
              payload: { source: 'LEOPARDS_LIVE_API', raw: item },
            };
          });
          milestones.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
          updates.push(...milestones);
        } else {
          const currStatus = packet?.current_status || packet?.status || 'IN_TRANSIT';
          updates.push({
            trackingNumber: cleanCN,
            rawStatus: currStatus,
            rawRemarks: packet?.remarks || currStatus,
            occurredAt: new Date(),
            carrierEventId: `${cleanCN}:curr:${currStatus}`,
            payload: { source: 'LEOPARDS_LIVE_API', raw: packet },
          });
        }
      }
    }
  }
  return updates;
}

export const LeopardsAdapter: CarrierAdapter = {
  carrier: 'LEOPARDS',
  limits: { maxBatch: 50, minIntervalMs: 1000 },

  async fetchUpdates(creds: MerchantCarrierCredentials, trackingNumbers: string[]): Promise<CarrierUpdate[]> {
    const isSimMode = Boolean(creds.extra?.simulationMode) || (!creds.apiKey && !process.env.LEOPARDS_API_KEY);
    const allUpdates: CarrierUpdate[] = [];

    const apiKey = creds.apiKey || process.env.LEOPARDS_API_KEY || '';
    const apiSecret = creds.apiSecret || process.env.LEOPARDS_API_SECRET || '';

    for (const cn of trackingNumbers) {
      const cleanCN = cn.trim().toUpperCase();

      if (cleanCN.includes('SIM429') || cleanCN.includes('SIM403') || isSimMode) {
        allUpdates.push(...simulateLeopardsUpdates(cleanCN));
        continue;
      }

      // 1. Live REST API mode if credentials configured (Spec §5.2, Plan Item 5)
      if (apiKey && apiSecret) {
        const apiUpdates = await fetchLeopardsApiUpdates(apiKey, apiSecret, [cleanCN]);
        if (apiUpdates.length > 0) {
          allUpdates.push(...apiUpdates);
          continue;
        }
      }

      // 2. Web scraper fallback (B4-BN-01)
      const result = await scrapeLeopardsTracking(cleanCN);
      allUpdates.push(...result.rawUpdates);
    }

    return allUpdates;
  },

  normalize(update: CarrierUpdate): Status | null {
    return normalizeLeopardsStatus(update.rawStatus);
  },
};
