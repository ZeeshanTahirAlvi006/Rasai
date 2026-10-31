// src/dispute/cprScoring.engine.ts
// Deterministic 5-signal, 100-point Courier Performance Rate (CPR) scoring engine (Spec §9)

import type { Carrier } from '../types';
import type { ICprSignalBreakdown, CprBand } from '../models/CprDispute';

export interface IScoringInput {
  carrier: Carrier;
  settlementCutoff: Date;
  referenceTime?: Date;
  ledgerEvents: Array<{
    rawStatus: string;
    disposition: string;
    occurredAt: Date;
  }>;
  conversation?: {
    state: string;
    requestedRescheduleDate?: Date;
    location?: { lat: number; lng: number };
  } | null;
  callLogs?: Array<{
    callTimestamp: Date;
    durationSeconds: number;
    callStatus: string;
  }>;
}

export interface IScoringResult {
  score: number;
  band: CprBand;
  breakdown: ICprSignalBreakdown;
}

export const CARRIER_CUTOFF_DAYS: Record<Carrier, number> = {
  POSTEX: 7,
  TRAX: 10,
  LEOPARDS: 14,
  TCS: 7,
};

export function calculateSettlementCutoff(carrier: Carrier, rtoInitiatedAt: Date): Date {
  const days = CARRIER_CUTOFF_DAYS[carrier] ?? 7;
  return new Date(rtoInitiatedAt.getTime() + days * 24 * 60 * 60 * 1000);
}

// Evaluate all 5 CPR signals and assign evidence band (Spec §9)
export function evaluateCprScore(input: IScoringInput): IScoringResult {
  const now = input.referenceTime ?? new Date();

  // Find the primary failure/RTO event to anchor the temporal window
  const failureEvents = input.ledgerEvents.filter(
    (e) =>
      e.disposition === 'APPLIED' &&
      /ndr|fail|unreach|unavail|refus|reject|address|rto/i.test(e.rawStatus),
  );
  const primaryFailure = failureEvents[failureEvents.length - 1] ?? input.ledgerEvents[input.ledgerEvents.length - 1];
  const failureTime = primaryFailure ? new Date(primaryFailure.occurredAt).getTime() : now.getTime();

  // --- Signal 1: No courier call evidence for the attempt (40 points) ---
  // Within ±120 minutes of failure scan, did the courier actually call and talk (duration >= 10s)?
  const windowMs = 120 * 60 * 1000;
  const validCall = input.callLogs?.some((c) => {
    const callTime = new Date(c.callTimestamp).getTime();
    const inWindow = Math.abs(callTime - failureTime) <= windowMs;
    return inWindow && c.durationSeconds >= 10 && c.callStatus === 'ANSWERED';
  });

  const signal1Points = validCall ? 0 : 40;
  const noCallEvidence = {
    points: signal1Points,
    maxPoints: 40,
    passed: signal1Points > 0,
    details: validCall
      ? 'Courier call record detected within the 120-minute attempt window (duration >= 10s).'
      : 'No verified courier call record detected within the 120-minute attempt window.',
  };

  // --- Signal 2: Customer confirmed availability or sent a pin within the window (25 points) ---
  const conv = input.conversation;
  const customerConfirmedAvailability = Boolean(
    conv &&
      (conv.requestedRescheduleDate ||
        conv.location ||
        conv.state === 'CONFIRMING' ||
        conv.state === 'DONE'),
  );

  const signal2Points = customerConfirmedAvailability ? 25 : 0;
  const customerConfirmed = {
    points: signal2Points,
    maxPoints: 25,
    passed: signal2Points > 0,
    details: customerConfirmedAvailability
      ? 'Consignee explicitly confirmed delivery availability or shared verified GPS coordinates via WhatsApp.'
      : 'No verified customer availability confirmation or GPS coordinates found in active conversation.',
  };

  // --- Signal 3: Address or pin contradicts the failure reason (15 points) ---
  const isAddressFailure = failureEvents.some((e) =>
    /address|incomplete|wrong|untrace|location/i.test(e.rawStatus),
  );
  const addressContradicted = isAddressFailure && Boolean(conv?.location || conv?.requestedRescheduleDate);

  const signal3Points = addressContradicted ? 15 : 0;
  const addressContradicts = {
    points: signal3Points,
    maxPoints: 15,
    passed: signal3Points > 0,
    details: addressContradicted
      ? 'Carrier cited address/untraceable failure reason, but consignee provided a valid GPS pin or verified address.'
      : isAddressFailure
      ? 'Carrier cited address issues, but no contradictory pin evidence was supplied.'
      : 'Failure reason was not address-related (neutral).',
  };

  // --- Signal 4: Attempt count or timing inconsistent with carrier claim (10 points) ---
  let timingAnomalous = false;
  let timingDetails = 'Courier attempt chronology is consistent with standard transit.';

  // Check 1: Multiple failure scans within < 15 minutes (batch hub scanning)
  for (let i = 0; i < failureEvents.length - 1; i++) {
    const t1 = new Date(failureEvents[i].occurredAt).getTime();
    const t2 = new Date(failureEvents[i + 1].occurredAt).getTime();
    if (Math.abs(t2 - t1) < 15 * 60 * 1000) {
      timingAnomalous = true;
      timingDetails = 'Multiple delivery failure scans were logged within < 15 minutes of each other (suspicious hub bulk-scan).';
      break;
    }
  }

  // Check 2: Failure logged before out-for-delivery scan
  const ofdEvent = input.ledgerEvents.find((e) => /out.?for.?delivery|ofd/i.test(e.rawStatus));
  if (ofdEvent && primaryFailure) {
    if (new Date(primaryFailure.occurredAt).getTime() < new Date(ofdEvent.occurredAt).getTime()) {
      timingAnomalous = true;
      timingDetails = 'Delivery failure scan timestamp predates the Out-for-Delivery dispatch scan.';
    }
  }

  const signal4Points = timingAnomalous ? 10 : 0;
  const timingDiscrepancy = {
    points: signal4Points,
    maxPoints: 10,
    passed: signal4Points > 0,
    details: timingDetails,
  };

  // --- Signal 5: Dispute inside the settlement cutoff (10 points) ---
  const isInsideCutoff = now.getTime() <= new Date(input.settlementCutoff).getTime();
  const signal5Points = isInsideCutoff ? 10 : 0;
  const insideCutoff = {
    points: signal5Points,
    maxPoints: 10,
    passed: signal5Points > 0,
    details: isInsideCutoff
      ? `Dispute is within the active settlement cutoff window (deadline: ${input.settlementCutoff.toISOString()}).`
      : `Dispute has lapsed past the carrier settlement cutoff window (${input.settlementCutoff.toISOString()}).`,
  };

  // Sum and clamp between 0 and 100 (B5-BUG-04)
  const rawScore = signal1Points + signal2Points + signal3Points + signal4Points + signal5Points;
  const score = Math.min(100, Math.max(0, rawScore));

  // Determine band
  let band: CprBand = 'WEAK';
  if (score >= 80) {
    band = 'STRONG';
  } else if (score >= 50) {
    band = 'MEDIUM';
  }

  return {
    score,
    band,
    breakdown: {
      noCallEvidence,
      customerConfirmed,
      addressContradicts,
      timingDiscrepancy,
      insideCutoff,
    },
  };
}
