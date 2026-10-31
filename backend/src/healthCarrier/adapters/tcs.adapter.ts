// src/healthCarrier/adapters/tcs.adapter.ts
// TCS carrier adapter with live Envío API integration, deterministic simulator, and batch limits.
import type {
  CarrierAdapter,
  CarrierUpdate,
  MerchantCarrierCredentials,
  Status,
} from '../../types/index.js';

export function normalizeTcsStatus(raw: string): Status {
  const upper = (raw || '').trim().toUpperCase();

  if (upper.includes('DELIVERED')) return 'DELIVERED';
  if (
    upper.includes('OUT FOR DELIVERY') ||
    upper.includes('COURIER OUT') ||
    upper.includes('DISPATCHED') ||
    upper.includes('RUNSHEET')
  ) {
    return 'OUT_FOR_DELIVERY';
  }
  if (
    upper.includes('ATTEMPT') ||
    upper.includes('NOT AVAILABLE') ||
    upper.includes('UNREACHABLE') ||
    upper.includes('BAD ADDRESS') ||
    upper.includes('PREMISES CLOSED') ||
    upper.includes('REFUSED') ||
    upper.includes('HOLD') ||
    upper.includes('FAILED') ||
    upper.includes('NDR')
  ) {
    return 'NDR_ACTIVE';
  }
  if (
    upper.includes('RETURN') ||
    upper.includes('RTO')
  ) {
    if (upper.includes('RETURNED TO SHIPPER') || upper.includes('DELIVERED TO ORIGIN')) {
      return 'RTO_DELIVERED';
    }
    return 'RTO_INITIATED';
  }
  if (upper.includes('CANCEL')) return 'CANCELLED';
  if (upper.includes('PICKED') || upper.includes('BOOKED')) return 'BOOKED';

  return 'IN_TRANSIT';
}

function simulateTcsUpdates(cn: string): CarrierUpdate[] {
  const cleanCN = cn.trim().toUpperCase();

  if (cleanCN.includes('SIM429')) {
    const error: any = new Error('HTTP 429 Too Many Requests (TCS API Rate Limit)');
    error.status = 429;
    error.statusCode = 429;
    error.response = { status: 429, headers: { 'retry-after': '90' } };
    throw error;
  }
  if (cleanCN.includes('SIM403')) {
    const error: any = new Error('HTTP 403 Forbidden (TCS WAF Security Block)');
    error.status = 403;
    error.statusCode = 403;
    error.response = { status: 403 };
    throw error;
  }

  const baseTime = 1714500000000 + (cleanCN.charCodeAt(cleanCN.length - 1) * 3600000);
  const updates: CarrierUpdate[] = [];

  // Milestone 1: Picked
  updates.push({
    trackingNumber: cleanCN,
    rawStatus: 'Shipment Picked',
    rawRemarks: 'Consignment received at TCS Express Centre Islamabad',
    occurredAt: new Date(baseTime),
    carrierEventId: `${cleanCN}:1:BOOKED`,
    payload: { source: 'TCS_SIMULATOR', milestone: 'BOOKED' },
  });

  // Milestone 2: In Transit
  updates.push({
    trackingNumber: cleanCN,
    rawStatus: 'In Transit to Hub',
    rawRemarks: 'Departed Islamabad Gateway towards destination facility',
    occurredAt: new Date(baseTime + 3600000),
    carrierEventId: `${cleanCN}:2:IN_TRANSIT`,
    payload: { source: 'TCS_SIMULATOR', milestone: 'IN_TRANSIT' },
  });

  if (cleanCN.includes('DELV')) {
    updates.push({
      trackingNumber: cleanCN,
      rawStatus: 'Out For Delivery',
      rawRemarks: 'Out for delivery via Courier Van',
      occurredAt: new Date(baseTime + 7200000),
      carrierEventId: `${cleanCN}:3:OFD`,
      payload: { source: 'TCS_SIMULATOR', milestone: 'OUT_FOR_DELIVERY' },
    });
    updates.push({
      trackingNumber: cleanCN,
      rawStatus: 'Shipment Delivered',
      rawRemarks: 'Delivered to consignee and signature obtained',
      occurredAt: new Date(baseTime + 10800000),
      carrierEventId: `${cleanCN}:4:DELIVERED`,
      payload: { source: 'TCS_SIMULATOR', milestone: 'DELIVERED' },
    });
  } else if (cleanCN.includes('NDR') || cleanCN.includes('FAIL')) {
    updates.push({
      trackingNumber: cleanCN,
      rawStatus: 'Out For Delivery',
      rawRemarks: 'Out for delivery via Courier Van',
      occurredAt: new Date(baseTime + 7200000),
      carrierEventId: `${cleanCN}:3:OFD`,
      payload: { source: 'TCS_SIMULATOR', milestone: 'OUT_FOR_DELIVERY' },
    });
    updates.push({
      trackingNumber: cleanCN,
      rawStatus: 'Delivery Attempted - Bad Address / Closed',
      rawRemarks: 'Customer address incomplete or shop was closed upon arrival',
      occurredAt: new Date(baseTime + 10800000),
      carrierEventId: `${cleanCN}:4:NDR`,
      payload: { source: 'TCS_SIMULATOR', milestone: 'NDR_ACTIVE' },
    });
  } else if (cleanCN.includes('RTO')) {
    updates.push({
      trackingNumber: cleanCN,
      rawStatus: 'Returned to Shipper',
      rawRemarks: 'Consignment returned back to origin sender',
      occurredAt: new Date(baseTime + 14400000),
      carrierEventId: `${cleanCN}:5:RTO`,
      payload: { source: 'TCS_SIMULATOR', milestone: 'RTO_INITIATED' },
    });
  }

  // Chronological sort (B4-RC-03)
  return updates.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
}

export const TcsAdapter: CarrierAdapter = {
  carrier: 'TCS',
  limits: { maxBatch: 20, minIntervalMs: 1000 },

  async fetchUpdates(creds: MerchantCarrierCredentials, trackingNumbers: string[]): Promise<CarrierUpdate[]> {
    const isSimMode = Boolean(creds.extra?.simulationMode) || !creds.apiKey;
    const allUpdates: CarrierUpdate[] = [];

    if (isSimMode) {
      for (const cn of trackingNumbers) {
        allUpdates.push(...simulateTcsUpdates(cn));
      }
      return allUpdates;
    }

    // Live API integration
    for (const cn of trackingNumbers) {
      const cleanCN = cn.trim().toUpperCase();
      try {
        const response = await fetch(
          `https://api.tcscourier.com/track/v1/shipments/${encodeURIComponent(cleanCN)}`,
          {
            method: 'GET',
            headers: {
              'X-IBM-Client-Id': creds.apiKey,
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(10_000), // Enforce 10s socket timeout (B4-BN-01)
          }
        );

        if (!response.ok) {
          const err: any = new Error(`TCS upstream returned status ${response.status}`);
          err.status = response.status;
          err.statusCode = response.status;
          const retryAfter = response.headers.get('retry-after');
          if (retryAfter) {
            err.response = { status: response.status, headers: { 'retry-after': retryAfter } };
          }
          throw err;
        }

        const data: any = await response.json();
        const checkpoints = data?.checkpoints || data?.milestones || [];

        if (Array.isArray(checkpoints) && checkpoints.length > 0) {
          const milestones: CarrierUpdate[] = checkpoints.map((item: any, idx: number) => {
            const dateStr = item?.date || item?.dateTime || item?.time;
            const parsedDate = dateStr ? new Date(dateStr) : new Date(0);
            const rawStatus = item?.status || item?.event || 'IN_TRANSIT';
            const rawRemarks = item?.location ? `${rawStatus} at ${item.location}` : rawStatus;

            return {
              trackingNumber: cleanCN,
              rawStatus,
              rawRemarks,
              occurredAt: isNaN(parsedDate.getTime()) ? new Date(0) : parsedDate,
              carrierEventId: `${cleanCN}:${idx}:${rawStatus}`,
              payload: { source: 'TCS_LIVE_API', raw: item },
            };
          });

          // Chronological sorting (B4-RC-03)
          milestones.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
          allUpdates.push(...milestones);
        } else {
          const currentStatus = data?.status || 'IN_TRANSIT';
          allUpdates.push({
            trackingNumber: cleanCN,
            rawStatus: currentStatus,
            rawRemarks: data?.remarks || currentStatus,
            occurredAt: new Date(),
            carrierEventId: `${cleanCN}:curr:${currentStatus}`,
            payload: { source: 'TCS_LIVE_API', raw: data },
          });
        }
      } catch (err: any) {
        throw err;
      }
    }

    return allUpdates;
  },

  normalize(update: CarrierUpdate): Status | null {
    return normalizeTcsStatus(update.rawStatus);
  },
};
