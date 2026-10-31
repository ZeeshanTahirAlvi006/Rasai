// frontend/src/types/dispute.ts
// TypeScript definitions for CPR Margin Defense and dispute management

export type CprBand = 'STRONG' | 'MEDIUM' | 'WEAK';
export type CprDisputeStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'SUBMITTED'
  | 'SETTLED'
  | 'REJECTED'
  | 'RETRACTED'
  | 'EXPIRED';

export interface ICprSignalResult {
  points: number;
  maxPoints: number;
  passed: boolean;
  details: string;
}

export interface ICprSignalBreakdown {
  noCallEvidence: ICprSignalResult;
  customerConfirmed: ICprSignalResult;
  addressContradicts: ICprSignalResult;
  timingDiscrepancy: ICprSignalResult;
  insideCutoff: ICprSignalResult;
}

export interface ICprDispute {
  _id: string;
  merchantId: string;
  shipmentId: string;
  carrier: 'POSTEX' | 'TRAX' | 'LEOPARDS' | 'TCS';
  trackingNumber: string;
  claimAmount: number;
  cprScore: number;
  cprBand: CprBand;
  breakdown: ICprSignalBreakdown;
  status: CprDisputeStatus;
  stateVersion: number;
  settlementCutoff: string;
  disputeRetractionRequested: boolean;
  retractionReason?: string;
  submittedAt?: string;
  settledAt?: string;
  settlementAmount?: number;
  notes?: string;
  evidenceSnapshot?: {
    ledgerEvents?: Array<{
      eventKey: string;
      rawStatus: string;
      disposition: string;
      occurredAt: string;
    }>;
    conversationSummary?: {
      state: string;
      requestedRescheduleDate?: string;
      location?: { lat: number; lng: number };
    };
    callLogMatches?: Array<{
      callTimestamp: string;
      durationSeconds: number;
      callStatus: string;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DisputeKpiSummary {
  totalDisputedAmount: number;
  totalSettledAmount: number;
  totalDisputes: number;
  settledCount: number;
  winRate: number;
  bandCounts: {
    strong: number;
    medium: number;
    weak: number;
  };
  expiringIn48hCount: number;
}

export interface ListDisputesParams {
  page?: number;
  limit?: number;
  status?: CprDisputeStatus;
  carrier?: string;
  cprBand?: CprBand;
  search?: string;
}
