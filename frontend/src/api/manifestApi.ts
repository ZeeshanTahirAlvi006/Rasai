// src/api/manifestApi.ts
import API from './api';
import { recordLog } from './shipmentApi';
import type {
  IManifestBatchItem,
  ListManifestsResponse,
  PendingManifestParcelItem,
  CarrierStationItem,
  EscalationLinkResponse,
} from '../types/manifest';

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
 * List historical manifest batches with KPI counts and summary
 */
export async function listManifests(
  filter: { carrier?: string; dateKey?: string; stationCode?: string; limit?: number; skip?: number } = {},
): Promise<{ status: number; data: ListManifestsResponse }> {
  const start = performance.now();
  const endpoint = '/manifests';

  try {
    const res = await API.get<ApiEnvelope<ListManifestsResponse>>(endpoint, {
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
 * Retrieve single manifest batch detail and parcel list
 */
export async function getManifestDetail(
  id: string,
): Promise<{ status: number; data: IManifestBatchItem }> {
  const start = performance.now();
  const endpoint = `/manifests/${id}`;

  try {
    const res = await API.get<ApiEnvelope<IManifestBatchItem>>(endpoint);
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
 * List pending manifest parcels awaiting 07:30 PKT run-sheet dispatch
 */
export async function listPendingManifestParcels(): Promise<{
  status: number;
  data: { parcels: PendingManifestParcelItem[]; total: number };
}> {
  const start = performance.now();
  const endpoint = '/manifests/pending-parcels';

  try {
    const res = await API.get<ApiEnvelope<{ parcels: PendingManifestParcelItem[]; total: number }>>(endpoint);
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
 * Trigger manual or ad-hoc manifest compilation run
 */
export async function triggerManifestCompilation(payload: {
  carrier?: string;
  stationCode?: string;
} = {}): Promise<{
  status: number;
  data: { compiledCount: number; batches: IManifestBatchItem[] };
}> {
  const start = performance.now();
  const endpoint = '/manifests/trigger';

  try {
    const res = await API.post<ApiEnvelope<{ compiledCount: number; batches: IManifestBatchItem[] }>>(
      endpoint,
      payload,
    );
    logCall('POST', endpoint, start, res, payload);
    return { status: res.status, data: res.data.data };
  } catch (err: any) {
    logCall('POST', endpoint, start, undefined, payload, err);
    throw {
      status: err?.response?.status || 500,
      message: err?.response?.data?.message || err.message,
    };
  }
}

/**
 * Download manifest PDF or CSV binary artifact
 */
export async function downloadManifestArtifact(
  id: string,
  format: 'pdf' | 'csv',
): Promise<void> {
  const start = performance.now();
  const endpoint = `/manifests/${id}/download/${format}`;

  try {
    const res = await API.get(endpoint, { responseType: 'blob' });
    logCall('GET', endpoint, start, { status: res.status, data: `[Blob ${format.toUpperCase()}]` });

    const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', `manifest_${id}.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  } catch (err: any) {
    logCall('GET', endpoint, start, undefined, undefined, err);
    throw {
      status: err?.response?.status || 500,
      message: err?.response?.data?.message || err.message,
    };
  }
}

/**
 * Generate Tier 3 WhatsApp escalation link for high-priority NDR resolution
 */
export async function getEscalationLink(
  shipmentId: string,
): Promise<{ status: number; data: EscalationLinkResponse }> {
  const start = performance.now();
  const endpoint = `/manifests/escalation/${shipmentId}`;

  try {
    const res = await API.get<ApiEnvelope<EscalationLinkResponse>>(endpoint);
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
 * List configured carrier stations
 */
export async function listCarrierStations(
  carrier?: string,
): Promise<{ status: number; data: CarrierStationItem[] }> {
  const start = performance.now();
  const endpoint = '/manifests/stations';

  try {
    const res = await API.get<ApiEnvelope<CarrierStationItem[]>>(endpoint, {
      params: carrier ? { carrier } : {},
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
 * Upsert carrier station contact
 */
export async function upsertCarrierStation(payload: {
  carrier: 'POSTEX' | 'TRAX' | 'LEOPARDS' | 'TCS';
  stationCode: string;
  stationName: string;
  city?: string;
  managerEmail?: string;
  managerWhatsAppPhone?: string;
  isActive?: boolean;
}): Promise<{ status: number; data: CarrierStationItem }> {
  const start = performance.now();
  const endpoint = '/manifests/stations';

  try {
    const res = await API.post<ApiEnvelope<CarrierStationItem>>(endpoint, payload);
    logCall('POST', endpoint, start, res, payload);
    return { status: res.status, data: res.data.data };
  } catch (err: any) {
    logCall('POST', endpoint, start, undefined, payload, err);
    throw {
      status: err?.response?.status || 500,
      message: err?.response?.data?.message || err.message,
    };
  }
}

/**
 * Delete carrier station
 */
export async function deleteCarrierStation(
  id: string,
): Promise<{ status: number; data: { deleted: boolean } }> {
  const start = performance.now();
  const endpoint = `/manifests/stations/${id}`;

  try {
    const res = await API.delete<ApiEnvelope<{ deleted: boolean }>>(endpoint);
    logCall('DELETE', endpoint, start, res);
    return { status: res.status, data: res.data.data };
  } catch (err: any) {
    logCall('DELETE', endpoint, start, undefined, undefined, err);
    throw {
      status: err?.response?.status || 500,
      message: err?.response?.data?.message || err.message,
    };
  }
}
