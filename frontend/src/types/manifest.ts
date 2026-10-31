// src/types/manifest.ts
export type ManifestStatus = 'STARTED' | 'SENT' | 'FAILED';

export interface IManifestBatchItem {
  _id: string;
  merchantId: string;
  carrier: 'POSTEX' | 'TRAX' | 'LEOPARDS' | 'TCS';
  dateKey: string;
  stationCode: string;
  status: ManifestStatus;
  parcelCount: number;
  shipmentIds: any[];
  totalCOD: number;
  recipientEmail?: string;
  driveUrl?: string;
  pdfStorageKey?: string;
  csvStorageKey?: string;
  emailDelivered?: boolean;
  sentAt?: string;
  error?: string;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ManifestSummary {
  SENT: number;
  STARTED: number;
  FAILED: number;
  totalParcelsSent: number;
  pendingParcelsCount: number;
}

export interface ListManifestsResponse {
  batches: IManifestBatchItem[];
  total: number;
  summary: ManifestSummary;
  limit: number;
  skip: number;
}

export interface PendingManifestParcelItem {
  _id: string;
  carrier: string;
  destinationStationCode?: string;
  trackingNumber: string;
  status: string;
  orderValueCOD: number;
  customerPhonePlain?: string;
  customerPhoneMasked: string;
  customerPhoneHash: string;
  rescheduledDate?: string;
  customerCoordinates?: { lat: number; lng: number };
  lastManifestedAt?: string;
  stationContact?: {
    carrier: string;
    stationCode: string;
    managerWhatsAppPhone?: string;
    managerEmail?: string;
  } | null;
  escalationLink: string;
}

export interface CarrierStationItem {
  _id: string;
  merchantId: string;
  carrier: 'POSTEX' | 'TRAX' | 'LEOPARDS' | 'TCS';
  stationCode: string;
  stationName: string;
  city?: string;
  managerEmail?: string;
  managerWhatsAppPhone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EscalationLinkResponse {
  shipmentId: string;
  carrier: string;
  stationCode: string;
  stationContact?: {
    managerWhatsAppPhone?: string;
    managerEmail?: string;
    stationName?: string;
  } | null;
  deepLink: string;
  coordinates?: { lat: number; lng: number } | null;
}
