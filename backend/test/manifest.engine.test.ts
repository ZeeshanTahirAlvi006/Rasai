// test/manifest.engine.test.ts
// Comprehensive integration test suite for Bolt 3 Courier Station Manifest Engine & Run-Sheets.
import mongoose, { Types } from 'mongoose';
import { Shipment, type IShipment } from '../src/shipment/shipment.model';
import { ManifestBatch } from '../src/manifestBatch/ManifestBatch';
import { CarrierStation } from '../src/models/CarrierStation';
import {
  generateRunSheetPdfBuffer,
  generateRunSheetCsvBuffer,
  buildWhatsAppEscalationLink,
  type ManifestMetadata,
  type ManifestParcelRow,
} from '../src/manifestBatch/manifest.generator';
import { compileAndSendManifests } from '../src/manifestBatch/manifest.worker';
import { encryptPhone, hashPhone } from '../src/utils/phone';

describe('manifest.engine', () => {
  const merchantId = new Types.ObjectId();
  const rawPhone = '+923001234567';
  const encryptedPhone = encryptPhone(rawPhone);
  const customerPhoneHash = hashPhone(rawPhone);

  beforeEach(async () => {
    jest.restoreAllMocks();
  });

  const createTestParcel = async (overrides: Record<string, any> = {}): Promise<IShipment> => {
    return (await Shipment.create({
      merchantId,
      carrier: 'POSTEX',
      destinationStationCode: 'KHI-01',
      trackingNumber: `TRK-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      status: 'RESOLVED_RESCHEDULED',
      ndrAttempt: 1,
      orderValueCOD: 3500,
      customerPhone: encryptedPhone,
      customerPhoneHash,
      rescheduledDate: new Date(),
      customerCoordinates: { lat: 24.8607, lng: 67.0011 },
      needsManifest: true,
      ...overrides,
    })) as any;
  };

  describe('Pure PDF 1.4 Binary Generator (generateRunSheetPdfBuffer)', () => {
    it('generates compliant PDF 1.4 binary artifact with correct header and trailer', () => {
      const meta: ManifestMetadata = {
        carrier: 'POSTEX',
        stationCode: 'KHI-01',
        dateKey: '2026-10-22',
        totalParcels: 1,
        totalCOD: 3500,
      };

      const parcels: ManifestParcelRow[] = [
        {
          trackingNumber: 'PXT-998811',
          carrier: 'POSTEX',
          stationCode: 'KHI-01',
          status: 'RESOLVED_RESCHEDULED',
          customerPhonePlain: '+923001234567',
          customerPhoneMasked: '+92300***4567',
          rescheduledDate: '2026-10-25',
          orderValueCOD: 3500,
          coordinates: { lat: 24.8607, lng: 67.0011 },
        },
      ];

      const pdfBuffer = generateRunSheetPdfBuffer(meta, parcels);

      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(100);

      // Verify PDF 1.4 Magic Header
      const pdfText = pdfBuffer.toString('binary');
      expect(pdfText.startsWith('%PDF-1.4')).toBe(true);

      // Verify Trailer & EOF Marker
      expect(pdfText.includes('xref')).toBe(true);
      expect(pdfText.includes('trailer')).toBe(true);
      expect(pdfText.endsWith('%%EOF\n') || pdfText.endsWith('%%EOF')).toBe(true);
    });
  });

  describe('RFC-4180 Formula-Sanitized CSV Generator (generateRunSheetCsvBuffer)', () => {
    it('generates RFC-4180 CSV and neutralizes spreadsheet formula injection (B3-BUG-03)', () => {
      const meta: ManifestMetadata = {
        carrier: 'TRAX',
        stationCode: 'LHE-02',
        dateKey: '2026-10-22',
        totalParcels: 2,
        totalCOD: 7000,
      };

      const parcels: ManifestParcelRow[] = [
        {
          trackingNumber: '=CMD|\' /C calc\'!A0', // Dangerous formula injection attempt
          carrier: 'TRAX',
          stationCode: 'LHE-02',
          status: 'RESOLVED_RESCHEDULED',
          customerPhonePlain: '+923001234567', // Plus sign trigger
          customerPhoneMasked: '+92300***4567',
          rescheduledDate: '2026-10-25',
          orderValueCOD: 5000,
          coordinates: { lat: 24.8607, lng: 67.0011 },
        },
        {
          trackingNumber: '@SUM(1+1)', // At-sign trigger
          carrier: 'TRAX',
          stationCode: 'LHE-02',
          status: 'RESOLVED_RESCHEDULED',
          customerPhonePlain: '-923001234567', // Minus sign trigger
          customerPhoneMasked: '-92300***4567',
          rescheduledDate: '2026-10-26',
          orderValueCOD: 2000,
        },
      ];

      const csvBuffer = generateRunSheetCsvBuffer(meta, parcels);
      const csvString = csvBuffer.toString('utf8');

      expect(csvString).toContain('Tracking Number');

      // Verify formula injection characters are escaped by prepending single quote
      expect(csvString).toContain('"\'=CMD|\' /C calc\'!A0"');
      expect(csvString).toContain('"\'@SUM(1+1)"');
      expect(csvString).toContain('"\'+923001234567"');
    });
  });

  describe('Tier 3 WhatsApp Station Manager Escalation Link', () => {
    it('generates valid wa.me link with encoded message and Google Maps coordinates pin', () => {
      const link = buildWhatsAppEscalationLink(
        {
          trackingNumber: 'TRK-554433',
          carrier: 'LEOPARDS',
          destinationStationCode: 'LHE-01',
          orderValueCOD: 4200,
          rescheduledDate: '2026-10-25',
          customerPhonePlain: '+923001122334',
          customerCoordinates: { lat: 31.5204, lng: 74.3587 },
        },
        '03009876543',
      );

      expect(link.startsWith('https://wa.me/03009876543?text=')).toBe(true);

      const urlObj = new URL(link);
      const text = urlObj.searchParams.get('text');
      expect(text).toContain('TRK-554433');
      expect(text).toContain('4200');
      expect(text).toContain('https://www.google.com/maps?q=31.520400,74.358700');
      expect(text).toContain('LEOPARDS');
    });

    it('falls back to default wa.me format when manager phone is not provided', () => {
      const link = buildWhatsAppEscalationLink({
        trackingNumber: 'TRK-112233',
        carrier: 'TCS',
        orderValueCOD: 1500,
      });

      expect(link.startsWith('https://wa.me/?text=')).toBe(true);
    });
  });

  describe('Automated 07:30 PKT Manifest Worker (compileAndSendManifests)', () => {
    it('compiles pending parcels into ManifestBatch grouped by carrier & station, clears needsManifest flag', async () => {
      // Create station contact in directory
      await CarrierStation.create({
        merchantId,
        carrier: 'POSTEX',
        stationCode: 'KHI-01',
        stationName: 'Karachi Central Hub',
        managerEmail: 'hub@postex.pk',
        managerWhatsAppPhone: '+923001112233',
        isActive: true,
      });

      // Create 2 parcels for POSTEX KHI-01 and 1 parcel for TRAX LHE-01
      const p1 = await createTestParcel({ carrier: 'POSTEX', destinationStationCode: 'KHI-01', orderValueCOD: 2000 });
      const p2 = await createTestParcel({ carrier: 'POSTEX', destinationStationCode: 'KHI-01', orderValueCOD: 3000 });
      const p3 = await createTestParcel({ carrier: 'TRAX', destinationStationCode: 'LHE-01', orderValueCOD: 1500 });

      // Run Compilation
      const result = await compileAndSendManifests({ merchantId });

      expect(result.batches.length).toBe(2);
      expect(result.totalParcelsManifested).toBe(3);

      // Verify ManifestBatch records created
      const postexBatch = await ManifestBatch.findOne({
        merchantId,
        carrier: 'POSTEX',
        stationCode: 'KHI-01',
      });

      expect(postexBatch).toBeDefined();
      expect(postexBatch?.parcelCount).toBe(2);
      expect(postexBatch?.totalCOD).toBe(5000);
      expect(postexBatch?.status).toBe('SENT');
      expect(postexBatch?.recipientEmail).toBe('hub@postex.pk');

      const traxBatch = await ManifestBatch.findOne({
        merchantId,
        carrier: 'TRAX',
        stationCode: 'LHE-01',
      });

      expect(traxBatch).toBeDefined();
      expect(traxBatch?.parcelCount).toBe(1);
      expect(traxBatch?.totalCOD).toBe(1500);

      // Verify Shipments updated: needsManifest is cleared and lastManifestedAt set
      const reloadedP1 = await Shipment.findById(p1._id);
      expect(reloadedP1?.needsManifest).toBe(false);
      expect(reloadedP1?.lastManifestedAt).toBeDefined();

      const reloadedP2 = await Shipment.findById(p2._id);
      expect(reloadedP2?.needsManifest).toBe(false);

      const reloadedP3 = await Shipment.findById(p3._id);
      expect(reloadedP3?.needsManifest).toBe(false);

      // Second immediate run should find 0 pending parcels (Idempotency B3-RC-04)
      const secondRun = await compileAndSendManifests({ merchantId });
      expect(secondRun.batches.length).toBe(0);
      expect(secondRun.totalParcelsManifested).toBe(0);
    });
  });
});
