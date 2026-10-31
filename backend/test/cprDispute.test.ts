// test/cprDispute.test.ts
// Comprehensive DeepSWE test suite for CPR Margin Defense, Dispute Scoring & Settlement Retraction (Unit 7)

import { Types } from 'mongoose';
import {
  evaluateCprScore,
  calculateSettlementCutoff,
  CARRIER_CUTOFF_DAYS,
} from '../src/dispute/cprScoring.engine';
import {
  evaluateCprDisputeService,
  getDisputeByIdService,
  listDisputesService,
  submitDisputeService,
  settleDisputeService,
  retractDisputeService,
  getDisputeKpiSummaryService,
  ingestCdrCallLogsService,
  sweepExpiringDisputesService,
} from '../src/dispute/dispute.service';
import { CprDispute } from '../src/models/CprDispute';
import { CdrRecord } from '../src/models/CdrRecord';
import { Shipment } from '../src/shipment/shipment.model';
import { ShipmentEvent } from '../src/shipmentEvent/ShipmentEvent.model';
import { hashPhone, normalizePkPhone } from '../src/utils/phone';

describe('CPR Scoring Engine & Dispute Lifecycle', () => {
  const merchantId = new Types.ObjectId();
  const phone = '03001234567';
  const phoneHash = hashPhone(normalizePkPhone(phone));

  beforeEach(async () => {
    await CprDispute.deleteMany({});
    await CdrRecord.deleteMany({});
    await Shipment.deleteMany({});
    await ShipmentEvent.deleteMany({});
  });

  describe('1. Pure Scoring Function (evaluateCprScore)', () => {
    const cutoffFuture = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const cutoffPast = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

    it('awards 100 points and STRONG band when all 5 signals pass with maximum evidence', () => {
      const now = new Date();
      const result = evaluateCprScore({
        carrier: 'POSTEX',
        settlementCutoff: cutoffFuture,
        referenceTime: now,
        ledgerEvents: [
          { rawStatus: 'Out for Delivery', disposition: 'APPLIED', occurredAt: new Date(now.getTime() - 4 * 3600000) },
          { rawStatus: 'Consignee Address Incomplete', disposition: 'APPLIED', occurredAt: new Date(now.getTime() - 2 * 3600000) },
          { rawStatus: 'Delivery Failed - Untraceable', disposition: 'APPLIED', occurredAt: new Date(now.getTime() - 2 * 3600000 + 5 * 60000) }, // 5 min apart -> Signal 4 pass
        ],
        conversation: {
          state: 'CONFIRMING',
          requestedRescheduleDate: new Date(now.getTime() + 86400000),
          location: { lat: 24.8607, lng: 67.0011 }, // Signal 2 & 3 pass
        },
        callLogs: [], // No call -> Signal 1 pass (40 pts)
      });

      expect(result.score).toBe(100);
      expect(result.band).toBe('STRONG');
      expect(result.breakdown.noCallEvidence.passed).toBe(true);
      expect(result.breakdown.noCallEvidence.points).toBe(40);
      expect(result.breakdown.customerConfirmed.passed).toBe(true);
      expect(result.breakdown.customerConfirmed.points).toBe(25);
      expect(result.breakdown.addressContradicts.passed).toBe(true);
      expect(result.breakdown.addressContradicts.points).toBe(15);
      expect(result.breakdown.timingDiscrepancy.passed).toBe(true);
      expect(result.breakdown.timingDiscrepancy.points).toBe(10);
      expect(result.breakdown.insideCutoff.passed).toBe(true);
      expect(result.breakdown.insideCutoff.points).toBe(10);
    });

    it('deducts 40 points when a valid courier call is detected within ±120m window', () => {
      const now = new Date();
      const failureTime = new Date(now.getTime() - 2 * 3600000);

      const result = evaluateCprScore({
        carrier: 'TRAX',
        settlementCutoff: cutoffFuture,
        referenceTime: now,
        ledgerEvents: [
          { rawStatus: 'Out for Delivery', disposition: 'APPLIED', occurredAt: new Date(now.getTime() - 4 * 3600000) },
          { rawStatus: 'Customer Unavailable', disposition: 'APPLIED', occurredAt: failureTime },
        ],
        callLogs: [
          {
            callTimestamp: new Date(failureTime.getTime() + 10 * 60000), // 10 mins after attempt
            durationSeconds: 45,
            callStatus: 'ANSWERED',
          },
        ],
      });

      expect(result.breakdown.noCallEvidence.passed).toBe(false);
      expect(result.breakdown.noCallEvidence.points).toBe(0);
      // Only cutoff signal passes (10 pts)
      expect(result.score).toBe(10);
      expect(result.band).toBe('WEAK');
    });

    it('assigns MEDIUM band for score between 50 and 79', () => {
      const now = new Date();
      const result = evaluateCprScore({
        carrier: 'LEOPARDS',
        settlementCutoff: cutoffFuture,
        referenceTime: now,
        ledgerEvents: [
          { rawStatus: 'Out for Delivery', disposition: 'APPLIED', occurredAt: new Date(now.getTime() - 3 * 3600000) },
          { rawStatus: 'Customer Unavailable', disposition: 'APPLIED', occurredAt: new Date(now.getTime() - 1 * 3600000) },
        ],
        conversation: {
          state: 'CONFIRMING',
          requestedRescheduleDate: new Date(),
        },
        callLogs: [], // 40 pts (no call) + 25 pts (customer confirmed) + 10 pts (inside cutoff) = 75 pts
      });

      expect(result.score).toBe(75);
      expect(result.band).toBe('MEDIUM');
    });

    it('deducts cutoff points when settlementCutoff has lapsed past the deadline', () => {
      const now = new Date();
      const result = evaluateCprScore({
        carrier: 'TCS',
        settlementCutoff: cutoffPast,
        referenceTime: now,
        ledgerEvents: [
          { rawStatus: 'Delivery Failed', disposition: 'APPLIED', occurredAt: new Date(now.getTime() - 10 * 86400000) },
        ],
        callLogs: [],
      });

      expect(result.breakdown.insideCutoff.passed).toBe(false);
      expect(result.breakdown.insideCutoff.points).toBe(0);
      expect(result.score).toBe(40); // Only signal 1 passed
      expect(result.band).toBe('WEAK');
    });

    it('calculates carrier cutoff days accurately per carrier configuration', () => {
      const base = new Date('2026-10-01T00:00:00Z');
      expect(calculateSettlementCutoff('POSTEX', base).toISOString()).toBe('2026-10-08T00:00:00.000Z');
      expect(calculateSettlementCutoff('TRAX', base).toISOString()).toBe('2026-10-11T00:00:00.000Z');
      expect(calculateSettlementCutoff('LEOPARDS', base).toISOString()).toBe('2026-10-15T00:00:00.000Z');
      expect(calculateSettlementCutoff('TCS', base).toISOString()).toBe('2026-10-08T00:00:00.000Z');
    });
  });

  describe('2. Dispute Lifecycle & Services', () => {
    it('evaluates and upserts a CPR dispute for an existing shipment', async () => {
      const shipment = await Shipment.create({
        merchantId,
        carrier: 'POSTEX',
        trackingNumber: 'POSTEX-DISPUTE-101',
        customerPhone: phone,
        customerPhoneHash: phoneHash,
        status: 'RTO_INITIATED',
        orderValueCOD: 4500,
        ndrAttempt: 2,
        stateVersion: 1,
      });

      await ShipmentEvent.create({
        eventKey: 'POSTEX-DISPUTE-101:FAIL',
        merchantId,
        carrier: 'POSTEX',
        trackingNumber: 'POSTEX-DISPUTE-101',
        source: 'CARRIER_POLL',
        rawStatus: 'Consignee Unavailable',
        disposition: 'APPLIED',
        occurredAt: new Date(),
      });

      const res = await evaluateCprDisputeService(merchantId.toString(), shipment._id.toString());
      expect(res.success).toBe(true);
      expect(res.data.claimAmount).toBe(4500);
      expect(res.data.carrier).toBe('POSTEX');
      expect(res.data.cprScore).toBeGreaterThanOrEqual(50);
      expect(res.data.status).toBe('DRAFT');

      const saved = await CprDispute.findOne({ shipmentId: shipment._id }).lean();
      expect(saved).toBeTruthy();
      expect(saved?.cprScore).toBe(res.data.cprScore);
    });

    it('submits a DRAFT dispute to the carrier', async () => {
      const shipment = await Shipment.create({
        merchantId,
        carrier: 'TRAX',
        trackingNumber: 'TRAX-SUBMIT-202',
        customerPhone: phone,
        customerPhoneHash: phoneHash,
        status: 'RTO_INITIATED',
        orderValueCOD: 3200,
      });

      const evalRes = await evaluateCprDisputeService(merchantId.toString(), shipment._id.toString());
      const disputeId = (evalRes.data as any)._id.toString();

      const submitRes = await submitDisputeService(merchantId.toString(), disputeId, 'Submitted via Trax merchant portal');
      expect(submitRes.success).toBe(true);
      expect(submitRes.data.status).toBe('SUBMITTED');
      expect(submitRes.data.submittedAt).toBeTruthy();

      const shp = await Shipment.findById(shipment._id).lean();
      expect(shp?.disputeStatus).toBe('SUBMITTED');
    });

    it('blocks submission when disputeRetractionRequested is true (B5-RC-02)', async () => {
      const shipment = await Shipment.create({
        merchantId,
        carrier: 'LEOPARDS',
        trackingNumber: 'LEO-RETRACT-303',
        customerPhone: phone,
        customerPhoneHash: phoneHash,
        status: 'RTO_INITIATED',
        disputeRetractionRequested: true,
      });

      const evalRes = await evaluateCprDisputeService(merchantId.toString(), shipment._id.toString());
      const disputeId = (evalRes.data as any)._id.toString();

      await expect(
        submitDisputeService(merchantId.toString(), disputeId, 'Attempting submit'),
      ).rejects.toThrow(/consignee delivery was confirmed and retraction is requested/);
    });

    it('records courier settlement with agreed amount', async () => {
      const shipment = await Shipment.create({
        merchantId,
        carrier: 'POSTEX',
        trackingNumber: 'POSTEX-SETTLE-404',
        customerPhone: phone,
        customerPhoneHash: phoneHash,
        status: 'RTO_INITIATED',
        orderValueCOD: 5000,
      });

      const evalRes = await evaluateCprDisputeService(merchantId.toString(), shipment._id.toString());
      const disputeId = (evalRes.data as any)._id.toString();

      await submitDisputeService(merchantId.toString(), disputeId);
      const settleRes = await settleDisputeService(merchantId.toString(), disputeId, 4500, 'Courier accepted 90% claim');
      expect(settleRes.success).toBe(true);
      expect(settleRes.data.status).toBe('SETTLED');
      expect(settleRes.data.settlementAmount).toBe(4500);

      const shp = await Shipment.findById(shipment._id).lean();
      expect(shp?.disputeStatus).toBe('SETTLED');
    });

    it('retracts a dispute with reason note', async () => {
      const shipment = await Shipment.create({
        merchantId,
        carrier: 'TCS',
        trackingNumber: 'TCS-RETRACT-505',
        customerPhone: phone,
        customerPhoneHash: phoneHash,
        status: 'RTO_INITIATED',
      });

      const evalRes = await evaluateCprDisputeService(merchantId.toString(), shipment._id.toString());
      const disputeId = (evalRes.data as any)._id.toString();

      const retractRes = await retractDisputeService(
        merchantId.toString(),
        disputeId,
        'Customer confirmed brother received the package',
      );
      expect(retractRes.success).toBe(true);
      expect(retractRes.data.status).toBe('RETRACTED');
      expect(retractRes.data.retractionReason).toContain('Customer confirmed');
    });

    it('computes financial KPI summary across all merchant disputes (B5-BN-05)', async () => {
      const s1 = await Shipment.create({
        merchantId,
        carrier: 'POSTEX',
        trackingNumber: 'KPI-1',
        customerPhone: phone,
        customerPhoneHash: phoneHash,
        status: 'RTO_INITIATED',
        orderValueCOD: 1000,
      });
      const s2 = await Shipment.create({
        merchantId,
        carrier: 'TRAX',
        trackingNumber: 'KPI-2',
        customerPhone: phone,
        customerPhoneHash: phoneHash,
        status: 'RTO_INITIATED',
        orderValueCOD: 2000,
      });

      const d1 = await evaluateCprDisputeService(merchantId.toString(), s1._id.toString());
      const d2 = await evaluateCprDisputeService(merchantId.toString(), s2._id.toString());

      await settleDisputeService(merchantId.toString(), (d1.data as any)._id.toString(), 900);

      const kpiRes = await getDisputeKpiSummaryService(merchantId.toString());
      expect(kpiRes.success).toBe(true);
      expect(kpiRes.data.totalDisputes).toBe(2);
      expect(kpiRes.data.settledCount).toBe(1);
      expect(kpiRes.data.totalSettledAmount).toBe(900);
      expect(kpiRes.data.totalDisputedAmount).toBe(2000); // Only active (D2)
      expect(kpiRes.data.winRate).toBe(50);
    });

    it('ingests CDR call logs and recalculates matched disputes', async () => {
      const shipment = await Shipment.create({
        merchantId,
        carrier: 'POSTEX',
        trackingNumber: 'CDR-MATCH-01',
        customerPhone: phone,
        customerPhoneHash: phoneHash,
        status: 'RTO_INITIATED',
        orderValueCOD: 6000,
      });

      // Initial dispute evaluation (no call log -> 50 pts)
      const initial = await evaluateCprDisputeService(merchantId.toString(), shipment._id.toString());
      expect(initial.data.breakdown.noCallEvidence.points).toBe(40);

      const attemptTime = new Date().toISOString();
      const csv = `Rider,Phone,Time,Duration,Status\n03129999999,03001234567,${attemptTime},35,ANSWERED\n`;

      const uploadRes = await ingestCdrCallLogsService(merchantId.toString(), csv);
      expect(uploadRes.success).toBe(true);
      expect(uploadRes.data.ingestedCount).toBe(1);
      expect(uploadRes.data.matchedDisputesCount).toBe(1);

      // Duplicate file upload must be rejected (B5-RC-03)
      await expect(ingestCdrCallLogsService(merchantId.toString(), csv)).rejects.toThrow(
        /This CDR call-log file has already been ingested/,
      );

      // Verify that after CDR ingestion, the dispute score was automatically updated
      const updated = await CprDispute.findOne({ shipmentId: shipment._id }).lean();
      expect(updated?.breakdown.noCallEvidence.points).toBe(0);
    });

    it('sweeper alerts approaching cutoffs and marks past-due disputes as EXPIRED', async () => {
      const now = new Date();
      const sLapsed = await Shipment.create({
        merchantId,
        carrier: 'POSTEX',
        trackingNumber: 'EXP-1',
        customerPhone: phone,
        customerPhoneHash: phoneHash,
        status: 'RTO_INITIATED',
        settlementCutoff: new Date(now.getTime() - 24 * 3600000), // Lapsed yesterday
      });

      await evaluateCprDisputeService(merchantId.toString(), sLapsed._id.toString());

      const sweepRes = await sweepExpiringDisputesService();
      expect(sweepRes.success).toBe(true);
      expect(sweepRes.data.expiredCount).toBeGreaterThanOrEqual(1);

      const d = await CprDispute.findOne({ shipmentId: sLapsed._id }).lean();
      expect(d?.status).toBe('EXPIRED');
    });
  });
});
