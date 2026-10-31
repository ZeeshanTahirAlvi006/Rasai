// src/healthCarrier/adapters/trax.adapter.ts
// Trax carrier adapter with live Trax Sonic API integration, deterministic simulator, and batch limits.
import type {
  CarrierAdapter,
  CarrierUpdate,
  MerchantCarrierCredentials,
  Status,
} from '../../types/index.js';

export function normalizeTraxStatus(raw: string): Status {
  const upper = (raw || '').trim().toUpperCase();

  if (
    upper.includes('UNDELIVERED') ||
    upper.includes('NOT DELIVERED') ||
    upper.includes('UNREACHABLE') ||
    upper.includes('ATTEMPT') ||
    upper.includes('REFUSED') ||
    upper.includes('CLOSED') ||
    upper.includes('INCOMPLETE') ||
    upper.includes('RESCHEDULED') ||
    upper.includes('CONSIGNEE NOT AVAILABLE') ||
    upper.includes('FAILED')
  ) {
    return 'NDR_ACTIVE';
  }
  if (
    upper.includes('OUT FOR DELIVERY') ||
    upper.includes('RIDER ASSIGNED') ||
    upper.includes('DISPATCHED') ||
    upper.includes('RUN SHEET')
  ) {
    return 'OUT_FOR_DELIVERY';
  }
  if (upper.includes('DELIVERED')) return 'DELIVERED';

  if (
    upper.includes('RETURN') ||
    upper.includes('RTO')
  ) {
    if (upper.includes('RETURNED TO SHIPPER') || upper.includes('RETURN DELIVERED')) {
      return 'RTO_DELIVERED';
    }
    return 'RTO_INITIATED';
  }
  if (upper.includes('CANCEL')) return 'CANCELLED';
  if (upper.includes('BOOKED') || upper.includes('PICKUP GENERATED')) return 'BOOKED';

  return 'IN_TRANSIT';
}

function simulateTraxUpdates(cn: string): CarrierUpdate[] {
  const cleanCN = cn.trim().toUpperCase();

  // Fault injection for circuit breaker chaos testing
  if (cleanCN.includes('SIM429')) {
    const error: any = new Error('HTTP 429 Too Many Requests (Trax Sonic Rate Limit)');
    error.status = 429;
    error.statusCode = 429;
    error.response = { status: 429, headers: { 'retry-after': '60' } };
    throw error;
  }
  if (cleanCN.includes('SIM403')) {
    const error: any = new Error('HTTP 403 Forbidden (Trax Cloudflare Security Challenge)');
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
    rawStatus: 'Shipment Booked',
    rawRemarks: 'Consignment booking created on Trax Sonic Portal',
    occurredAt: new Date(baseTime),
    carrierEventId: `${cleanCN}:1:BOOKED`,
    payload: { source: 'TRAX_SIMULATOR', milestone: 'BOOKED' },
  });

  // Milestone 2: Arrived at Origin
  updates.push({
    trackingNumber: cleanCN,
    rawStatus: 'Arrived at Origin Hub',
    rawRemarks: 'Scanned at Lahore Gateway Hub',
    occurredAt: new Date(baseTime + 3600000),
    carrierEventId: `${cleanCN}:2:IN_TRANSIT`,
    payload: { source: 'TRAX_SIMULATOR', milestone: 'IN_TRANSIT' },
  });

  if (cleanCN.includes('DELV')) {
    updates.push({
      trackingNumber: cleanCN,
      rawStatus: 'Rider Assigned - Out for Delivery',
      rawRemarks: 'Assigned to courier on route',
      occurredAt: new Date(baseTime + 7200000),
      carrierEventId: `${cleanCN}:3:OFD`,
      payload: { source: 'TRAX_SIMULATOR', milestone: 'OUT_FOR_DELIVERY' },
    });
    updates.push({
      trackingNumber: cleanCN,
      rawStatus: 'Shipment Delivered',
      rawRemarks: 'Delivered to consignee with COD collection',
      occurredAt: new Date(baseTime + 10800000),
      carrierEventId: `${cleanCN}:4:DELIVERED`,
      payload: { source: 'TRAX_SIMULATOR', milestone: 'DELIVERED' },
    });
  } else if (cleanCN.includes('NDR') || cleanCN.includes('FAIL')) {
    updates.push({
      trackingNumber: cleanCN,
      rawStatus: 'Rider Assigned - Out for Delivery',
      rawRemarks: 'Assigned to courier on route',
      occurredAt: new Date(baseTime + 7200000),
      carrierEventId: `${cleanCN}:3:OFD`,
      payload: { source: 'TRAX_SIMULATOR', milestone: 'OUT_FOR_DELIVERY' },
    });
    updates.push({
      trackingNumber: cleanCN,
      rawStatus: 'Undelivered - Consignee Unreachable',
      rawRemarks: 'Rider called customer multiple times; no response',
      occurredAt: new Date(baseTime + 10800000),
      carrierEventId: `${cleanCN}:4:NDR`,
      payload: { source: 'TRAX_SIMULATOR', milestone: 'NDR_ACTIVE' },
    });
  } else if (cleanCN.includes('RTO')) {
    updates.push({
      trackingNumber: cleanCN,
      rawStatus: 'Return Marked',
      rawRemarks: 'Consignment approved for return to shipper',
      occurredAt: new Date(baseTime + 14400000),
      carrierEventId: `${cleanCN}:5:RTO`,
      payload: { source: 'TRAX_SIMULATOR', milestone: 'RTO_INITIATED' },
    });
  }

  // Chronological sort (B4-RC-03)
  return updates.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
}

export const TraxAdapter: CarrierAdapter = {
  carrier: 'TRAX',
  limits: { maxBatch: 20, minIntervalMs: 1000 },

  async fetchUpdates(creds: MerchantCarrierCredentials, trackingNumbers: string[]): Promise<CarrierUpdate[]> {
    const isSimMode = Boolean(creds.extra?.simulationMode) || !creds.apiKey;
    const allUpdates: CarrierUpdate[] = [];

    if (isSimMode) {
      for (const cn of trackingNumbers) {
        allUpdates.push(...simulateTraxUpdates(cn));
      }
      return allUpdates;
    }

    // Live API integration
    for (const cn of trackingNumbers) {
      const cleanCN = cn.trim().toUpperCase();
      try {
        const response = await fetch(
          `https://sonic.pk/api/shipment/track?tracking_number=${encodeURIComponent(cleanCN)}&type=0`,
          {
            method: 'GET',
            headers: {
              Authorization: creds.apiKey,
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(10_000), // Enforce 10s socket timeout (B4-BN-01)
          }
        );

        if (!response.ok) {
          const err: any = new Error(`Trax upstream returned status ${response.status}`);
          err.status = response.status;
          err.statusCode = response.status;
          const retryAfter = response.headers.get('retry-after');
          if (retryAfter) {
            err.response = { status: response.status, headers: { 'retry-after': retryAfter } };
          }
          throw err;
        }

        const data: any = await response.json();
        const details = data?.details || data?.data || data;
        const trackingHistory = details?.history || details?.milestones || [];

        if (Array.isArray(trackingHistory) && trackingHistory.length > 0) {
          const milestones: CarrierUpdate[] = trackingHistory.map((item: any, idx: number) => {
            const dateStr = item?.date_time || item?.created_at || item?.date;
            const parsedDate = dateStr ? new Date(dateStr) : new Date(0);
            const rawStatus = item?.status || item?.event || 'IN_TRANSIT';
            const rawRemarks = item?.remarks || item?.status || '';

            return {
              trackingNumber: cleanCN,
              rawStatus,
              rawRemarks,
              occurredAt: isNaN(parsedDate.getTime()) ? new Date(0) : parsedDate,
              carrierEventId: `${cleanCN}:${idx}:${rawStatus}`,
              payload: { source: 'TRAX_LIVE_API', raw: item },
            };
          });

          // Chronological sorting (B4-RC-03)
          milestones.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
          allUpdates.push(...milestones);
        } else {
          const currentStatus = details?.status || 'IN_TRANSIT';
          allUpdates.push({
            trackingNumber: cleanCN,
            rawStatus: currentStatus,
            rawRemarks: details?.remarks || currentStatus,
            occurredAt: new Date(),
            carrierEventId: `${cleanCN}:curr:${currentStatus}`,
            payload: { source: 'TRAX_LIVE_API', raw: details },
          });
        }
      } catch (err: any) {
        throw err;
      }
    }

    return allUpdates;
  },

  normalize(update: CarrierUpdate): Status | null {
    return normalizeTraxStatus(update.rawStatus);
  },
};
