// src/healthCarrier/adapters/postex.adapter.ts
// PostEx carrier adapter with live REST integration, deterministic fallback, and batch limits.
import type {
  CarrierAdapter,
  CarrierUpdate,
  MerchantCarrierCredentials,
  Status,
} from '../../types/index.js';

export function normalizePostExStatus(raw: string): Status {
  const upper = (raw || '').trim().toUpperCase();

  if (
    upper.includes('UNDELIVERED') ||
    upper.includes('NOT DELIVERED') ||
    upper.includes('ATTEMPT') ||
    upper.includes('NOT AVAILABLE') ||
    upper.includes('UNREACHABLE') ||
    upper.includes('REFUSED') ||
    upper.includes('INCOMPLETE ADDRESS') ||
    upper.includes('RESCHEDULED') ||
    upper.includes('FAILED') ||
    upper.includes('NDR')
  ) {
    return 'NDR_ACTIVE';
  }
  if (upper.includes('DELIVERED')) return 'DELIVERED';
  if (
    upper.includes('OUT FOR DELIVERY') ||
    upper.includes('OUT_FOR_DELIVERY') ||
    upper.includes('DISPATCHED') ||
    upper.includes('ARRIVED AT DESTINATION')
  ) {
    return 'OUT_FOR_DELIVERY';
  }
  if (
    upper.includes('RETURN') ||
    upper.includes('RTO') ||
    upper.includes('RETURNING')
  ) {
    if (upper.includes('DELIVERED TO SHIPPER') || upper.includes('RETURN COMPLETED')) {
      return 'RTO_DELIVERED';
    }
    return 'RTO_INITIATED';
  }
  if (upper.includes('CANCEL')) return 'CANCELLED';
  if (upper.includes('BOOKED') || upper.includes('PICKUP SCHEDULED')) return 'BOOKED';

  return 'IN_TRANSIT';
}

function simulatePostExUpdates(cn: string): CarrierUpdate[] {
  const cleanCN = cn.trim().toUpperCase();

  // Fault injection for circuit breaker chaos testing
  if (cleanCN.includes('SIM429')) {
    const error: any = new Error('HTTP 429 Too Many Requests (PostEx Rate Limit)');
    error.status = 429;
    error.statusCode = 429;
    error.response = { status: 429, headers: { 'retry-after': '120' } };
    throw error;
  }
  if (cleanCN.includes('SIM403')) {
    const error: any = new Error('HTTP 403 Forbidden (Cloudflare Challenge / WAF)');
    error.status = 403;
    error.statusCode = 403;
    error.response = { status: 403 };
    throw error;
  }

  // Generate deterministic milestone timeline based on CN character code
  const baseTime = 1714500000000 + (cleanCN.charCodeAt(cleanCN.length - 1) * 3600000);
  const updates: CarrierUpdate[] = [];

  // Milestone 1: Booked
  updates.push({
    trackingNumber: cleanCN,
    rawStatus: 'Order Booked',
    rawRemarks: 'Shipment created and booked at Karachi Hub',
    occurredAt: new Date(baseTime),
    carrierEventId: `${cleanCN}:1:BOOKED`,
    payload: { source: 'POSTEX_SIMULATOR', milestone: 'BOOKED' },
  });

  // Milestone 2: In Transit
  updates.push({
    trackingNumber: cleanCN,
    rawStatus: 'In Transit',
    rawRemarks: 'Consignment departed origin transit facility',
    occurredAt: new Date(baseTime + 3600000),
    carrierEventId: `${cleanCN}:2:IN_TRANSIT`,
    payload: { source: 'POSTEX_SIMULATOR', milestone: 'IN_TRANSIT' },
  });

  if (cleanCN.includes('DELV')) {
    // Delivered flow
    updates.push({
      trackingNumber: cleanCN,
      rawStatus: 'Out For Delivery',
      rawRemarks: 'Rider on route to consignee address',
      occurredAt: new Date(baseTime + 7200000),
      carrierEventId: `${cleanCN}:3:OFD`,
      payload: { source: 'POSTEX_SIMULATOR', milestone: 'OUT_FOR_DELIVERY' },
    });
    updates.push({
      trackingNumber: cleanCN,
      rawStatus: 'Delivered',
      rawRemarks: 'Delivered to consignee and COD collected',
      occurredAt: new Date(baseTime + 10800000),
      carrierEventId: `${cleanCN}:4:DELIVERED`,
      payload: { source: 'POSTEX_SIMULATOR', milestone: 'DELIVERED' },
    });
  } else if (cleanCN.includes('NDR') || cleanCN.includes('FAIL')) {
    // NDR / Failed Attempt flow
    updates.push({
      trackingNumber: cleanCN,
      rawStatus: 'Out For Delivery',
      rawRemarks: 'Rider on route to consignee',
      occurredAt: new Date(baseTime + 7200000),
      carrierEventId: `${cleanCN}:3:OFD`,
      payload: { source: 'POSTEX_SIMULATOR', milestone: 'OUT_FOR_DELIVERY' },
    });
    updates.push({
      trackingNumber: cleanCN,
      rawStatus: 'Delivery Attempted - Customer Unreachable',
      rawRemarks: 'Phone powered off during delivery call attempt',
      occurredAt: new Date(baseTime + 10800000),
      carrierEventId: `${cleanCN}:4:NDR`,
      payload: { source: 'POSTEX_SIMULATOR', milestone: 'NDR_ACTIVE' },
    });
  } else if (cleanCN.includes('RTO')) {
    // RTO flow
    updates.push({
      trackingNumber: cleanCN,
      rawStatus: 'Return To Shipper Initiated',
      rawRemarks: 'Returning to merchant warehouse after 3 failed attempts',
      occurredAt: new Date(baseTime + 14400000),
      carrierEventId: `${cleanCN}:5:RTO`,
      payload: { source: 'POSTEX_SIMULATOR', milestone: 'RTO_INITIATED' },
    });
  }

  // Sort chronological occurredAt ASC (B4-RC-03)
  return updates.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
}

export const PostExAdapter: CarrierAdapter = {
  carrier: 'POSTEX',
  limits: { maxBatch: 10, minIntervalMs: 1000 },

  async fetchUpdates(creds: MerchantCarrierCredentials, trackingNumbers: string[]): Promise<CarrierUpdate[]> {
    const isSimMode = Boolean(creds.extra?.simulationMode) || !creds.apiKey;
    const allUpdates: CarrierUpdate[] = [];

    if (isSimMode) {
      for (const cn of trackingNumbers) {
        allUpdates.push(...simulatePostExUpdates(cn));
      }
      return allUpdates;
    }

    // Live API integration
    for (const cn of trackingNumbers) {
      const cleanCN = cn.trim().toUpperCase();
      try {
        const response = await fetch(
          `https://api.postex.pk/services/integration/api/order/v1/track-order/${encodeURIComponent(cleanCN)}`,
          {
            method: 'GET',
            headers: {
              token: creds.apiKey,
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(10_000), // Enforce 10s socket timeout (B4-BN-01)
          }
        );

        if (!response.ok) {
          const err: any = new Error(`PostEx upstream returned status ${response.status}`);
          err.status = response.status;
          err.statusCode = response.status;
          const retryAfter = response.headers.get('retry-after');
          if (retryAfter) {
            err.response = { status: response.status, headers: { 'retry-after': retryAfter } };
          }
          throw err;
        }

        const data: any = await response.json();
        const dist = data?.dist || data?.data || data;
        const transactionHistory = dist?.transactionHistory || dist?.history || [];

        if (Array.isArray(transactionHistory) && transactionHistory.length > 0) {
          const milestones: CarrierUpdate[] = transactionHistory.map((item: any, idx: number) => {
            const dateStr = item?.transactionDate || item?.date || item?.createdAt;
            const parsedDate = dateStr ? new Date(dateStr) : new Date(0);
            const rawStatus = item?.transactionStatus || item?.status || 'IN_TRANSIT';
            const rawRemarks = item?.remarks || item?.status || '';

            return {
              trackingNumber: cleanCN,
              rawStatus,
              rawRemarks,
              occurredAt: isNaN(parsedDate.getTime()) ? new Date(0) : parsedDate,
              carrierEventId: `${cleanCN}:${idx}:${rawStatus}`,
              payload: { source: 'POSTEX_LIVE_API', raw: item },
            };
          });

          // Chronological sorting (B4-RC-03)
          milestones.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
          allUpdates.push(...milestones);
        } else {
          // Fall back to current stage
          const currentStatus = dist?.orderStatus || 'IN_TRANSIT';
          allUpdates.push({
            trackingNumber: cleanCN,
            rawStatus: currentStatus,
            rawRemarks: dist?.remarks || currentStatus,
            occurredAt: new Date(),
            carrierEventId: `${cleanCN}:curr:${currentStatus}`,
            payload: { source: 'POSTEX_LIVE_API', raw: dist },
          });
        }
      } catch (err: any) {
        throw err;
      }
    }

    return allUpdates;
  },

  normalize(update: CarrierUpdate): Status | null {
    return normalizePostExStatus(update.rawStatus);
  },
};
