// test/shipment.service.test.ts
import { Types } from 'mongoose';
import {
  bulkCreateShipments,
  listShipments,
  getShipment,
  updateShipment,
  cancelShipment,
  selectDueForPoll,
  findOpenByPhoneHash,
  touchPolled,
  markTrackingHealth,
} from '../src/shipment/shipment.service.js';
import { Shipment } from '../src/shipment/shipment.model.js';
import { ShipmentEvent } from '../src/shipmentEvent/ShipmentEvent.model.js';
import { decryptPhone, hashPhone } from '../src/utils/phone.js';

describe('shipment.service', () => {
  const merchantA = new Types.ObjectId();
  const merchantB = new Types.ObjectId();

  describe('bulkCreateShipments', () => {
    it('creates shipments with encrypted phone, hash, and BOOKED status', async () => {
      const rows = [
        {
          carrier: 'POSTEX' as const,
          trackingNumber: 'TRK-001',
          customerPhone: '03001234567',
          orderValueCOD: 1500,
          destinationStationCode: 'LHE-01',
        },
        {
          carrier: 'TRAX' as const,
          trackingNumber: 'TRK-002',
          customerPhone: '+923219876543',
          orderValueCOD: 3000,
        },
      ];

      const res = await bulkCreateShipments(merchantA, rows);
      expect(res.data.created).toBe(2);
      expect(res.data.duplicates).toBe(0);
      expect(res.data.rejected).toBe(0);

      const s1 = await Shipment.findOne({ merchantId: merchantA, trackingNumber: 'TRK-001' });
      expect(s1).not.toBeNull();
      expect(s1?.status).toBe('BOOKED');
      expect(s1?.stateVersion).toBe(0);
      expect(s1?.customerPhone.startsWith('v1:')).toBe(true);
      expect(decryptPhone(s1!.customerPhone)).toBe('+923001234567');
      expect(s1?.customerPhoneHash).toBe(hashPhone('+923001234567'));
    });

    it('identifies duplicate tracking numbers and rejected invalid phones', async () => {
      // Seed first shipment
      await bulkCreateShipments(merchantA, [
        {
          carrier: 'POSTEX' as const,
          trackingNumber: 'TRK-EXISTING',
          customerPhone: '03001234567',
        },
      ]);

      const batch = [
        {
          carrier: 'POSTEX' as const,
          trackingNumber: 'TRK-EXISTING', // Duplicate
          customerPhone: '03001234567',
        },
        {
          carrier: 'POSTEX' as const,
          trackingNumber: 'TRK-BAD-PHONE',
          customerPhone: 'not-a-phone', // Rejected
        },
        {
          carrier: 'LEOPARDS' as const,
          trackingNumber: 'TRK-VALID',
          customerPhone: '03335555555',
        },
      ];

      const res = await bulkCreateShipments(merchantA, batch);
      expect(res.data.created).toBe(1);
      expect(res.data.duplicates).toBe(1);
      expect(res.data.rejected).toBe(1);

      expect(res.data.results[0].status).toBe('DUPLICATE');
      expect(res.data.results[1].status).toBe('REJECTED');
      expect(res.data.results[2].status).toBe('CREATED');
    });
  });

  describe('listShipments & isolation', () => {
    beforeEach(async () => {
      await bulkCreateShipments(merchantA, [
        { carrier: 'POSTEX', trackingNumber: 'A-1', customerPhone: '03001111111' },
        { carrier: 'TRAX', trackingNumber: 'A-2', customerPhone: '03002222222' },
        { carrier: 'POSTEX', trackingNumber: 'A-3', customerPhone: '03003333333' },
      ]);
      await bulkCreateShipments(merchantB, [
        { carrier: 'POSTEX', trackingNumber: 'B-1', customerPhone: '03004444444' },
      ]);
    });

    it('enforces merchant isolation and hides ciphertext/hash from outputs', async () => {
      const listA = await listShipments(merchantA, {});
      expect(listA.data.shipments.length).toBe(3);
      expect(listA.data.shipments.every((s: any) => String(s.merchantId) === merchantA.toString())).toBe(true);

      const first = listA.data.shipments[0];
      expect(first.customerPhone).toBeUndefined();
      expect(first.customerPhoneHash).toBeUndefined();
      expect(typeof first.customerPhoneMasked).toBe('string');
      expect((first.customerPhoneMasked as string).startsWith('+92')).toBe(true);
    });

    it('filters by carrier and supports limit cursor pagination', async () => {
      const filtered = await listShipments(merchantA, { carrier: 'TRAX' });
      expect(filtered.data.shipments.length).toBe(1);
      expect(filtered.data.shipments[0].trackingNumber).toBe('A-2');

      const page1 = await listShipments(merchantA, { limit: 2 });
      expect(page1.data.shipments.length).toBe(2);
      expect(page1.data.nextCursor).toBeDefined();

      const page2 = await listShipments(merchantA, { cursor: page1.data.nextCursor, limit: 2 });
      expect(page2.data.shipments.length).toBe(1);
    });
  });

  describe('getShipment', () => {
    it('returns shipment and its complete audit event timeline', async () => {
      const created = await bulkCreateShipments(merchantA, [
        { carrier: 'POSTEX', trackingNumber: 'DETAIL-1', customerPhone: '03001234567' },
      ]);
      const id = created.data.results[0].id!;

      await ShipmentEvent.create({
        eventKey: 'ev-1',
        merchantId: merchantA,
        carrier: 'POSTEX',
        trackingNumber: 'DETAIL-1',
        source: 'CARRIER_POLL',
        rawStatus: 'IN_TRANSIT',
        occurredAt: new Date(),
        disposition: 'APPLIED',
        payload: {},
      });

      const res = await getShipment(merchantA, id);
      expect(res.data.shipment).toBeDefined();
      expect(res.data.shipment.trackingNumber).toBe('DETAIL-1');
      expect(res.data.timeline.length).toBe(1);
    });

    it('throws 404 if shipment belongs to another merchant', async () => {
      const created = await bulkCreateShipments(merchantB, [
        { carrier: 'POSTEX', trackingNumber: 'OTHER-1', customerPhone: '03001234567' },
      ]);
      const id = created.data.results[0].id!;

      await expect(getShipment(merchantA, id)).rejects.toMatchObject({
        statusCode: 404,
        code: 'shipment_not_found',
      });
    });
  });

  describe('updateShipment', () => {
    it('updates mutable fields when expectedVersion matches and increments version', async () => {
      const created = await bulkCreateShipments(merchantA, [
        { carrier: 'POSTEX', trackingNumber: 'UPD-1', customerPhone: '03001111111', orderValueCOD: 100 },
      ]);
      const id = created.data.results[0].id!;

      const updated = await updateShipment(merchantA, id, 0, {
        orderValueCOD: 500,
        destinationStationCode: 'ISB-02',
        customerPhone: '03219999999',
      });

      expect(updated.data.stateVersion).toBe(1);
      expect(updated.data.orderValueCOD).toBe(500);
      expect(updated.data.destinationStationCode).toBe('ISB-02');
    });

    it('throws 409 on version conflict', async () => {
      const created = await bulkCreateShipments(merchantA, [
        { carrier: 'POSTEX', trackingNumber: 'UPD-2', customerPhone: '03001111111' },
      ]);
      const id = created.data.results[0].id!;

      await expect(updateShipment(merchantA, id, 99, { orderValueCOD: 500 })).rejects.toMatchObject({
        statusCode: 409,
        code: 'version_conflict',
      });
    });

    it('throws 422 when attempting to update terminal shipment', async () => {
      const created = await bulkCreateShipments(merchantA, [
        { carrier: 'POSTEX', trackingNumber: 'UPD-3', customerPhone: '03001111111' },
      ]);
      const id = created.data.results[0].id!;

      await Shipment.updateOne({ _id: id }, { status: 'DELIVERED' });

      await expect(updateShipment(merchantA, id, 0, { orderValueCOD: 500 })).rejects.toMatchObject({
        statusCode: 422,
        code: 'terminal_shipment',
      });
    });
  });

  describe('cancelShipment', () => {
    it('cancels shipment through state machine and emits CANCELLED event', async () => {
      const created = await bulkCreateShipments(merchantA, [
        { carrier: 'POSTEX', trackingNumber: 'CANCEL-1', customerPhone: '03001111111' },
      ]);
      const id = created.data.results[0].id!;

      const res = await cancelShipment(merchantA, id);
      expect(res.data.disposition).toBe('APPLIED');

      const s = await Shipment.findById(id);
      expect(s?.status).toBe('CANCELLED');
    });

    it('throws 422 when attempting to cancel already delivered parcel', async () => {
      const created = await bulkCreateShipments(merchantA, [
        { carrier: 'POSTEX', trackingNumber: 'CANCEL-2', customerPhone: '03001111111' },
      ]);
      const id = created.data.results[0].id!;
      await Shipment.updateOne({ _id: id }, { status: 'DELIVERED' });

      await expect(cancelShipment(merchantA, id)).rejects.toMatchObject({
        statusCode: 422,
        code: 'terminal_shipment',
      });
    });
  });

  describe('Internal helpers (selectDueForPoll, findOpenByPhoneHash, touchPolled, markTrackingHealth)', () => {
    it('selects shipments due for polling', async () => {
      await bulkCreateShipments(merchantA, [
        { carrier: 'POSTEX', trackingNumber: 'POLL-1', customerPhone: '03001111111' },
      ]);

      const due = await selectDueForPoll('BOOKED', new Date());
      expect(due.some((s) => s.trackingNumber === 'POLL-1')).toBe(true);
    });

    it('finds open shipment by phone hash', async () => {
      await bulkCreateShipments(merchantA, [
        { carrier: 'POSTEX', trackingNumber: 'WA-1', customerPhone: '03007777777' },
      ]);
      const hash = hashPhone('+923007777777');

      const found = await findOpenByPhoneHash(hash);
      expect(found).not.toBeNull();
      expect(found?.trackingNumber).toBe('WA-1');
    });

    it('touches polled shipments and marks tracking health', async () => {
      await bulkCreateShipments(merchantA, [
        { carrier: 'LEOPARDS', trackingNumber: 'LEO-1', customerPhone: '03001111111' },
      ]);

      await touchPolled('LEOPARDS', ['LEO-1'], merchantA);
      let s = await Shipment.findOne({ trackingNumber: 'LEO-1' });
      expect(s?.trackingHealth).toBe('HEALTHY');
      expect(s?.lastPolledAt).toBeDefined();

      await markTrackingHealth('LEOPARDS', [s!._id], 'DEGRADED');
      s = await Shipment.findOne({ trackingNumber: 'LEO-1' });
      expect(s?.trackingHealth).toBe('DEGRADED');
    });
  });
});
