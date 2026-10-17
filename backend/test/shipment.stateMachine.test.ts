// test/shipment.stateMachine.test.ts
import { decide, ALLOWED, TERMINAL } from '../src/shipment/shipment.stateMachine.js';
import type { Status } from '../src/types/index.js';

describe('shipment.stateMachine (decide)', () => {
  describe('Carrier Status Transitions', () => {
    // 1. Same-status events are always NOOP with 0 effects (v2 fix #2)
    it.each([
      'BOOKED',
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY',
      'NDR_ACTIVE',
      'RESOLVED_RESCHEDULED',
      'RTO_INITIATED',
      'RTO_DELIVERED',
      'DELIVERED',
      'CANCELLED',
    ] as Status[])('returns NOOP when target status equals current status: %s', (status) => {
      const decision = decide(status, { kind: 'CARRIER_STATUS', status }, { ndrTemplateSent: false });
      expect(decision.disposition).toBe('NOOP');
      expect(decision.next).toBe(status);
      expect(decision.effects).toEqual([]);
    });

    // 2. Terminal states reject all incoming carrier events
    it.each(Array.from(TERMINAL))('rejects carrier transitions from terminal state %s', (termStatus) => {
      const decision = decide(
        termStatus,
        { kind: 'CARRIER_STATUS', status: 'IN_TRANSIT' },
        { ndrTemplateSent: false },
      );
      expect(decision.disposition).toBe('STALE_REJECTED');
      expect(decision.next).toBe(termStatus);
      expect(decision.effects).toEqual([]);
    });

    // 3. Decision #8: RTO_DELIVERED is accepted from every non-terminal state
    const nonTerminalStates = Object.keys(ALLOWED).filter((s) => !TERMINAL.has(s as Status)) as Status[];

    it.each(nonTerminalStates)(
      'accepts RTO_DELIVERED from non-terminal status %s with PURGE and CLEAR effects',
      (fromStatus) => {
        const decision = decide(
          fromStatus,
          { kind: 'CARRIER_STATUS', status: 'RTO_DELIVERED' },
          { ndrTemplateSent: false },
        );
        expect(decision.disposition).toBe('APPLIED');
        expect(decision.next).toBe('RTO_DELIVERED');
        expect(decision.effects).toContain('PURGE_PENDING_OUTBOX');
        expect(decision.effects).toContain('CLEAR_NEEDS_MANIFEST');
      },
    );

    // 4. NDR_ACTIVE produces attempt increment and WhatsApp template enqueue
    it('produces INCREMENT_NDR_ATTEMPT and ENQUEUE_NDR_TEMPLATE on transition to NDR_ACTIVE', () => {
      const decision = decide(
        'OUT_FOR_DELIVERY',
        { kind: 'CARRIER_STATUS', status: 'NDR_ACTIVE' },
        { ndrTemplateSent: false },
      );
      expect(decision.disposition).toBe('APPLIED');
      expect(decision.next).toBe('NDR_ACTIVE');
      expect(decision.effects).toEqual(['INCREMENT_NDR_ATTEMPT', 'ENQUEUE_NDR_TEMPLATE']);
    });

    // 5. DELIVERED handles outbox purge and conditional delivery correction
    it('enqueues DELIVERY_CORRECTION if NDR template was previously dispatched', () => {
      const decision = decide(
        'OUT_FOR_DELIVERY',
        { kind: 'CARRIER_STATUS', status: 'DELIVERED' },
        { ndrTemplateSent: true },
      );
      expect(decision.disposition).toBe('APPLIED');
      expect(decision.next).toBe('DELIVERED');
      expect(decision.effects).toContain('PURGE_PENDING_OUTBOX');
      expect(decision.effects).toContain('ENQUEUE_DELIVERY_CORRECTION');
      expect(decision.effects).toContain('CLEAR_NEEDS_MANIFEST');
    });

    it('does NOT enqueue DELIVERY_CORRECTION if no NDR template was dispatched', () => {
      const decision = decide(
        'OUT_FOR_DELIVERY',
        { kind: 'CARRIER_STATUS', status: 'DELIVERED' },
        { ndrTemplateSent: false },
      );
      expect(decision.disposition).toBe('APPLIED');
      expect(decision.effects).not.toContain('ENQUEUE_DELIVERY_CORRECTION');
      expect(decision.effects).toContain('PURGE_PENDING_OUTBOX');
      expect(decision.effects).toContain('CLEAR_NEEDS_MANIFEST');
    });

    // 6. RTO_INITIATED produces RTO_NOTICE if coming from NDR or reschedule
    it('enqueues RTO_NOTICE when moving from NDR_ACTIVE to RTO_INITIATED', () => {
      const decision = decide(
        'NDR_ACTIVE',
        { kind: 'CARRIER_STATUS', status: 'RTO_INITIATED' },
        { ndrTemplateSent: false },
      );
      expect(decision.disposition).toBe('APPLIED');
      expect(decision.next).toBe('RTO_INITIATED');
      expect(decision.effects).toContain('PURGE_PENDING_OUTBOX');
      expect(decision.effects).toContain('ENQUEUE_RTO_NOTICE');
    });

    it('does NOT enqueue RTO_NOTICE when moving from IN_TRANSIT to RTO_INITIATED', () => {
      const decision = decide(
        'IN_TRANSIT',
        { kind: 'CARRIER_STATUS', status: 'RTO_INITIATED' },
        { ndrTemplateSent: false },
      );
      expect(decision.disposition).toBe('APPLIED');
      expect(decision.next).toBe('RTO_INITIATED');
      expect(decision.effects).toContain('PURGE_PENDING_OUTBOX');
      expect(decision.effects).not.toContain('ENQUEUE_RTO_NOTICE');
    });
  });

  describe('Non-Carrier Intents', () => {
    const futureDate = new Date('2026-10-15T10:00:00Z');

    it('applies CUSTOMER_RESCHEDULE from NDR_ACTIVE with MARK_NEEDS_MANIFEST', () => {
      const decision = decide(
        'NDR_ACTIVE',
        { kind: 'CUSTOMER_RESCHEDULE', date: futureDate },
        { ndrTemplateSent: false },
      );
      expect(decision.disposition).toBe('APPLIED');
      expect(decision.next).toBe('RESOLVED_RESCHEDULED');
      expect(decision.effects).toEqual(['MARK_NEEDS_MANIFEST']);
    });

    it('applies CUSTOMER_RESCHEDULE from RTO_INITIATED preserving state and setting MARK_NEEDS_MANIFEST', () => {
      const decision = decide(
        'RTO_INITIATED',
        { kind: 'CUSTOMER_RESCHEDULE', date: futureDate },
        { ndrTemplateSent: false },
      );
      expect(decision.disposition).toBe('APPLIED');
      expect(decision.next).toBe('RTO_INITIATED');
      expect(decision.effects).toEqual(['MARK_NEEDS_MANIFEST']);
    });

    it('returns NOOP for CUSTOMER_RESCHEDULE on terminal states', () => {
      const decision = decide(
        'DELIVERED',
        { kind: 'CUSTOMER_RESCHEDULE', date: futureDate },
        { ndrTemplateSent: false },
      );
      expect(decision.disposition).toBe('NOOP');
      expect(decision.effects).toEqual([]);
    });

    it('applies CUSTOMER_CORRECTION by emitting RETRACT_DISPUTE without changing delivery status', () => {
      const decision = decide(
        'NDR_ACTIVE',
        { kind: 'CUSTOMER_CORRECTION' },
        { ndrTemplateSent: false },
      );
      expect(decision.disposition).toBe('APPLIED');
      expect(decision.next).toBe('NDR_ACTIVE');
      expect(decision.effects).toEqual(['RETRACT_DISPUTE']);
    });

    it('applies MERCHANT_CANCEL transitioning to CANCELLED with purge and clear effects', () => {
      const decision = decide(
        'IN_TRANSIT',
        { kind: 'MERCHANT_CANCEL' },
        { ndrTemplateSent: false },
      );
      expect(decision.disposition).toBe('APPLIED');
      expect(decision.next).toBe('CANCELLED');
      expect(decision.effects).toContain('PURGE_PENDING_OUTBOX');
      expect(decision.effects).toContain('CLEAR_NEEDS_MANIFEST');
    });

    it('returns NOOP for MERCHANT_CANCEL on terminal state', () => {
      const decision = decide(
        'DELIVERED',
        { kind: 'MERCHANT_CANCEL' },
        { ndrTemplateSent: false },
      );
      expect(decision.disposition).toBe('NOOP');
      expect(decision.effects).toEqual([]);
    });
  });
});
