// src/healthCarrier/adapters/leopards.adapter.ts
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
 * Scrapes Leopards tracking page using a 3-step session-preserving flow:
 * 1. Initial GET to obtain leopards_official_session cookie + CSRF _token
 * 2. AJAX GET /shipment_tracking-new to store tracking data in server session
 * 3. GET /shipment_tracking_view (no query) to render the timeline from session
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
  const initRes = await fetch(`${baseURL}/shipment_tracking_view`, { headers });
  const rawCookies = initRes.headers.getSetCookie
    ? initRes.headers.getSetCookie()
    : [initRes.headers.get('set-cookie')].filter(Boolean) as string[];
  let cookieHeader = rawCookies.map((c) => c.split(';')[0]).join('; ');

  const initHtml = await initRes.text();
  const tokenMatch = initHtml.match(/_token:\s*['"]([^'"]+)['"]/);
  const csrfToken = tokenMatch ? tokenMatch[1] : '';

  if (!csrfToken) {
    const error = new Error('Leopards scraper: failed to extract CSRF _token from init page');
    (error as any).status = 502;
    throw error;
  }

  // ── Step 2: AJAX call to /shipment_tracking-new (stores data in server session) ──
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
    }
  );

  // Merge any updated session cookies from the AJAX response
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
    // If AJAX response is not JSON, the CN is likely invalid
  }

  if (!ajaxSuccess) {
    // Leopards returned { success: false } — CN not found in their system
    return {
      found: false,
      cn: cleanCN,
      milestones: [],
      rawUpdates: [],
    };
  }

  // ── Step 3: Fetch the rendered tracking page (session now holds the data) ──
  const pageRes = await fetch(`${baseURL}/shipment_tracking_view`, {
    headers: {
      ...headers,
      Cookie: cookieHeader,
      Referer: `${baseURL}/shipment_tracking_view`,
    },
  });

  if (!pageRes.ok) {
    const error = new Error(`Leopards upstream returned status ${pageRes.status}`);
    (error as any).status = pageRes.status;
    throw error;
  }

  const html = await pageRes.text();
  const $ = cheerio.load(html);

  // 4. Extract Top-Level Delivery Metadata
  const activeStepText = $('#bar-progress .step.step-active').text().replace(/^\s*\d+\s*/, '').trim();
  const deliveredHeader = $('th[colspan="4"]').text().trim();

  let signedBy: string | undefined;
  $('b').each((_, el) => {
    if ($(el).text().includes('Signed for by')) {
      const val = $(el).closest('td').next('td').text().trim();
      if (val && val !== 'N/A' && val !== '-') signedBy = val;
    }
  });

  // 5. Parse Timeline Milestones
  const milestones: LeopardsMilestone[] = [];
  const rawUpdates: CarrierUpdate[] = [];

  $('.tracking-item').each((_, item) => {
    const $item = $(item);

    const dateEl = $item.find('.tracking-date');
    const timeStr = dateEl.find('span').text().replace(/[()]/g, '').trim();
    const baseDateStr = dateEl.clone().children().remove().end().text().trim();

    let eventDate: Date = new Date();
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
      payload: {
        source: 'LEOPARDS_WEB_SCRAPE',
        canonicalStatus,
        activeStepText,
        deliveredHeader,
        signedBy,
      },
    });
  });

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

/**
 * Normalizes raw Leopards status strings into domain Status enum
 */
export function normalizeLeopardsStatus(raw: string): Status {
  const upper = (raw || '').toUpperCase();

  if (upper.includes('DELIVERED')) return 'DELIVERED';
  if (upper.includes('ASSIGNED TO') || upper.includes('OUT FOR DELIVERY')) return 'OUT_FOR_DELIVERY';
  if (
    upper.includes('NOT AVAILABLE') ||
    upper.includes('ATTEMPTED') ||
    upper.includes('REFUSED') ||
    upper.includes('FAILED')
  ) {
    return 'NDR_ACTIVE';
  }
  if (upper.includes('RETURN') || upper.includes('RTO')) return 'RTO_INITIATED';
  if (upper.includes('CANCEL')) return 'CANCELLED';

  return 'IN_TRANSIT';
}

/**
 * Leopards Carrier Adapter conforming to CarrierAdapter interface
 */
export const LeopardsAdapter: CarrierAdapter = {
  carrier: 'LEOPARDS',
  limits: { maxBatch: 1, minIntervalMs: 2000 },

  async fetchUpdates(_creds: MerchantCarrierCredentials, trackingNumbers: string[]): Promise<CarrierUpdate[]> {
    const allUpdates: CarrierUpdate[] = [];

    for (const cn of trackingNumbers) {
      const result = await scrapeLeopardsTracking(cn);
      allUpdates.push(...result.rawUpdates);
    }

    return allUpdates;
  },

  normalize(update: CarrierUpdate): Status | null {
    return normalizeLeopardsStatus(update.rawStatus);
  },
};
