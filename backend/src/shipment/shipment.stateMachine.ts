import type { Status, Intent, Effect, Decision } from '../types/index.js';


export const TERMINAL = new Set<Status>(['DELIVERED', 'CANCELLED', 'RTO_DELIVERED']);
export const isTerminal = (s: Status): boolean => TERMINAL.has(s);


export const ALLOWED: Record<Status, Status[]> = {
  BOOKED: [
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'NDR_ACTIVE',
    'DELIVERED',
    'RTO_INITIATED',
    'RTO_DELIVERED',
    'CANCELLED',
  ],
  IN_TRANSIT: [
    'OUT_FOR_DELIVERY',
    'NDR_ACTIVE',
    'DELIVERED',
    'RTO_INITIATED',
    'RTO_DELIVERED',
    'CANCELLED',
  ],
  OUT_FOR_DELIVERY: [
    'NDR_ACTIVE',
    'DELIVERED',
    'RTO_INITIATED',
    'RTO_DELIVERED',
    'CANCELLED',
  ],
  NDR_ACTIVE: [
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'RTO_INITIATED',
    'RTO_DELIVERED',
    'CANCELLED',
  ],
  RESOLVED_RESCHEDULED: [
    'OUT_FOR_DELIVERY',
    'NDR_ACTIVE',
    'DELIVERED',
    'RTO_INITIATED',
    'RTO_DELIVERED',
    'CANCELLED',
  ],
  RTO_INITIATED: [
    'RTO_DELIVERED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
  ],
  RTO_DELIVERED: [],
  DELIVERED: [],
  CANCELLED: [],
};

export interface DecideContext {
  ndrTemplateSent: boolean;
}

//Evaluates current state against incoming intent and returns target status
export function decide(
  current: Status,
  intent: Intent,
  ctx: DecideContext,
): Decision {
  const noop: Decision = { next: current, effects: [], disposition: 'NOOP' };
  const stale: Decision = { next: current, effects: [], disposition: 'STALE_REJECTED' };

  switch (intent.kind) {
    case 'CARRIER_STATUS': {
      const target = intent.status;
      // Same-status events are NOOP with no effects — prevents duplicate notifications
      if (target === current) return noop;
      if (isTerminal(current) || !ALLOWED[current].includes(target)) return stale;

      const effects: Effect[] = [];

      if (target === 'NDR_ACTIVE') {
        effects.push('INCREMENT_NDR_ATTEMPT', 'ENQUEUE_NDR_TEMPLATE');
      }

      if (target === 'DELIVERED') {
        effects.push('PURGE_PENDING_OUTBOX');
        if (ctx.ndrTemplateSent) {
          effects.push('ENQUEUE_DELIVERY_CORRECTION');
        }
      }

      if (target === 'RTO_INITIATED') {
        effects.push('PURGE_PENDING_OUTBOX');
        if (current === 'NDR_ACTIVE' || current === 'RESOLVED_RESCHEDULED') {
          effects.push('ENQUEUE_RTO_NOTICE');
        }
      }

      if (target === 'RTO_DELIVERED') {
        // When RTO is delivered, cancel pending notifications and manifest requests
        effects.push('PURGE_PENDING_OUTBOX', 'CLEAR_NEEDS_MANIFEST');
      }

      if (target === 'CANCELLED') {
        effects.push('PURGE_PENDING_OUTBOX');
      }

      if (['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].includes(target)) {
        effects.push('CLEAR_NEEDS_MANIFEST');
      }

      return { next: target, effects, disposition: 'APPLIED' };
    }

    case 'INFORMATIONAL':
      return noop;

    case 'CUSTOMER_RESCHEDULE': {
      if (isTerminal(current)) return noop;
      if (current === 'NDR_ACTIVE' || current === 'RESOLVED_RESCHEDULED') {
        return {
          next: 'RESOLVED_RESCHEDULED',
          effects: ['MARK_NEEDS_MANIFEST'],
          disposition: 'APPLIED',
        };
      }
      if (current === 'RTO_INITIATED') {
        // Priority station rescue without changing delivery state until accepted
        return {
          next: current,
          effects: ['MARK_NEEDS_MANIFEST'],
          disposition: 'APPLIED',
        };
      }
      return noop;
    }

    case 'CUSTOMER_CORRECTION':
      return isTerminal(current)
        ? noop
        : { next: current, effects: ['RETRACT_DISPUTE'], disposition: 'APPLIED' };

    case 'MERCHANT_CANCEL':
      return isTerminal(current)
        ? noop
        : {
          next: 'CANCELLED',
          effects: ['PURGE_PENDING_OUTBOX', 'CLEAR_NEEDS_MANIFEST'],
          disposition: 'APPLIED',
        };
  }
}
