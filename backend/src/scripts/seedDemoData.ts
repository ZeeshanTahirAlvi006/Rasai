// src/scripts/seedDemoData.ts
// Demo database seeding script for NDR application testing, QA, and local development.
import crypto from 'crypto';
import { Types } from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database';
import {
  Shipment,
  ShipmentEvent,
  CarrierStation,
  carrierHealthModel,
  MerchantWaTemplate,
  MerchantCarrierCredential,
  CprDispute,
  CdrRecord,
  ConversationSession,
  OutboxMessage,
  InboundWaMessage,
  ManifestBatch,
  ImportBatch,
  OpsAlert,
  userModel,
} from '../models';
import { encryptPhone, hashPhone, normalizePkPhone } from '../utils/phone';
import { computeEventKey } from '../utils/eventKey';
import { toEventHashBuffer } from '../shipmentEvent/ShipmentEvent.model';
import type { Carrier, Status, DisputeStatus, TrackingHealth, OutboxMessageType } from '../types';

export async function seedDemoData(): Promise<void> {
  const startTime = Date.now();
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🌱  NDR Demo Data Seeding Started');
  console.log('════════════════════════════════════════════════════════════════\n');

  await connectDatabase();

  // 1. Create or retrieve primary demo merchant account
  console.log('👤 Ensuring demo merchant user...');
  let merchant = await userModel.findOne({ email: 'demo@ndr-system.com' });
  if (!merchant) {
    merchant = new userModel({
      username: 'demomerchant',
      email: 'demo@ndr-system.com',
      password: 'Password123!',
      verified: true,
    });
    await merchant.save();
    console.log(`   ✅ Created merchant account: ${merchant.email} (ID: ${merchant._id})`);
  } else {
    merchant.verified = true;
    await merchant.save();
    console.log(`   ℹ️ Reusing existing merchant account: ${merchant.email} (ID: ${merchant._id})`);
  }

  const merchantId = merchant._id as Types.ObjectId;

  // Clean existing demo data for this merchant to ensure clean, idempotent re-seeding
  console.log('🧹 Purging prior demo records for merchant...');
  await Promise.all([
    Shipment.deleteMany({ merchantId }),
    ShipmentEvent.deleteMany({ merchantId }),
    CarrierStation.deleteMany({ merchantId }),
    MerchantCarrierCredential.deleteMany({ merchantId }),
    MerchantWaTemplate.deleteMany({ merchantId }),
    CprDispute.deleteMany({ merchantId }),
    CdrRecord.deleteMany({ merchantId }),
    ConversationSession.deleteMany({ merchantId }),
    OutboxMessage.deleteMany({ merchantId }),
    ManifestBatch.deleteMany({ merchantId }),
    ImportBatch.deleteMany({ merchantId }),
    OpsAlert.deleteMany({ dedupeScope: { $regex: /^demo:/ } }),
  ]);
  console.log('   ✅ Prior merchant records purged');

  // 2. Carrier Health (Global circuit breaker state)
  console.log('⚡ Seeding Carrier Health states...');
  const carriers: Carrier[] = ['POSTEX', 'TRAX', 'LEOPARDS', 'TCS'];
  for (const carrier of carriers) {
    const isLeopards = carrier === 'LEOPARDS';
    await carrierHealthModel.findOneAndUpdate(
      { carrier },
      {
        $set: {
          state: 'CLOSED',
          failureCount: isLeopards ? 1 : 0,
          tripCount: isLeopards ? 1 : 0,
          lastFailureAt: isLeopards ? new Date(Date.now() - 15 * 60 * 1000) : undefined,
          lastSuccessAt: new Date(Date.now() - 2 * 60 * 1000),
          lastErrorCode: isLeopards ? 'TIMEOUT_504' : undefined,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
  }
  console.log('   ✅ Carrier Health records synchronized (POSTEX, TRAX, LEOPARDS, TCS)');

  // 3. Merchant Carrier Credentials
  console.log('🔑 Seeding Merchant Carrier Credentials...');
  const creds = [
    { carrier: 'POSTEX', accountNumber: 'ACC-POSTEX-901' },
    { carrier: 'TRAX', accountNumber: 'ACC-TRAX-442' },
    { carrier: 'LEOPARDS', accountNumber: 'ACC-LEO-108' },
    { carrier: 'TCS', accountNumber: 'ACC-TCS-773' },
  ];
  for (const c of creds) {
    await MerchantCarrierCredential.create({
      merchantId,
      carrier: c.carrier,
      accountNumber: c.accountNumber,
      apiKeyEncrypted: Buffer.from(`demo-api-key-${c.carrier.toLowerCase()}`).toString('base64'),
      apiSecretEncrypted: Buffer.from(`demo-api-secret-${c.carrier.toLowerCase()}`).toString('base64'),
      webhookEnabled: true,
      simulationMode: false,
      isActive: true,
    });
  }
  console.log('   ✅ 4 Carrier Credentials configured');

  // 4. Carrier Stations (Hubs across Pakistan)
  console.log('🏢 Seeding Carrier Stations...');
  const stationDefs = [
    { carrier: 'POSTEX', stationCode: 'KHI-ST01', stationName: 'Karachi Korangi Hub', city: 'Karachi', managerEmail: 'ops.khi@postex.pk', managerWhatsAppPhone: '+923001122334' },
    { carrier: 'POSTEX', stationCode: 'LHR-ST02', stationName: 'Lahore Gulberg Hub', city: 'Lahore', managerEmail: 'ops.lhr@postex.pk', managerWhatsAppPhone: '+923002233445' },
    { carrier: 'POSTEX', stationCode: 'ISB-ST03', stationName: 'Islamabad I-9 Hub', city: 'Islamabad', managerEmail: 'ops.isb@postex.pk', managerWhatsAppPhone: '+923003344556' },
    { carrier: 'TRAX', stationCode: 'KHI-ST01', stationName: 'Trax Shahrah-e-Faisal Hub', city: 'Karachi', managerEmail: 'hub.khi@trax.pk', managerWhatsAppPhone: '+923211122334' },
    { carrier: 'TRAX', stationCode: 'LHR-ST02', stationName: 'Trax Thokar Hub', city: 'Lahore', managerEmail: 'hub.lhr@trax.pk', managerWhatsAppPhone: '+923212233445' },
    { carrier: 'TRAX', stationCode: 'FSD-ST04', stationName: 'Trax Canal Road Hub', city: 'Faisalabad', managerEmail: 'hub.fsd@trax.pk', managerWhatsAppPhone: '+923213344556' },
    { carrier: 'LEOPARDS', stationCode: 'KHI-ST01', stationName: 'Leopards Airport Hub', city: 'Karachi', managerEmail: 'ops.khi@leopardscourier.com', managerWhatsAppPhone: '+923331122334' },
    { carrier: 'LEOPARDS', stationCode: 'LHR-ST02', stationName: 'Leopards Ravi Hub', city: 'Lahore', managerEmail: 'ops.lhr@leopardscourier.com', managerWhatsAppPhone: '+923332233445' },
    { carrier: 'LEOPARDS', stationCode: 'PEW-ST05', stationName: 'Leopards Cantt Hub', city: 'Peshawar', managerEmail: 'ops.pew@leopardscourier.com', managerWhatsAppPhone: '+923333344556' },
    { carrier: 'TCS', stationCode: 'KHI-ST01', stationName: 'TCS Korangi Logistics Centre', city: 'Karachi', managerEmail: 'station.khi@tcs.com.pk', managerWhatsAppPhone: '+923451122334' },
    { carrier: 'TCS', stationCode: 'LHR-ST02', stationName: 'TCS Gulberg Express Centre', city: 'Lahore', managerEmail: 'station.lhr@tcs.com.pk', managerWhatsAppPhone: '+923452233445' },
    { carrier: 'TCS', stationCode: 'ISB-ST03', stationName: 'TCS Blue Area Centre', city: 'Islamabad', managerEmail: 'station.isb@tcs.com.pk', managerWhatsAppPhone: '+923453344556' },
  ];
  await CarrierStation.insertMany(
    stationDefs.map((s) => ({
      ...s,
      merchantId,
      isActive: true,
    }))
  );
  console.log(`   ✅ ${stationDefs.length} Carrier Stations added`);

  // 5. Merchant WhatsApp Templates
  console.log('💬 Seeding WhatsApp Templates...');
  const templates: Array<{ messageType: OutboxMessageType; templateName: string }> = [
    { messageType: 'NDR_UTILITY_TEMPLATE', templateName: 'ndr_delivery_reattempt_v1' },
    { messageType: 'RESCHEDULE_CONFIRMATION', templateName: 'ndr_reschedule_confirmed_v1' },
    { messageType: 'DELIVERY_CORRECTION', templateName: 'ndr_address_update_v1' },
    { messageType: 'RTO_NOTICE', templateName: 'ndr_rto_warning_v1' },
    { messageType: 'REATTEMPT_DISPATCH', templateName: 'ndr_reattempt_enroute_v1' },
  ];
  for (const t of templates) {
    await MerchantWaTemplate.create({
      merchantId,
      messageType: t.messageType,
      templateName: t.templateName,
      languageCode: 'en_US',
      headerType: 'NONE',
      parameterBindings: ['trackingNumber', 'orderValueCOD', 'carrier'],
      status: 'ACTIVE',
    });
  }
  console.log(`   ✅ ${templates.length} WhatsApp Templates registered`);

  // 6. Shipments & Shipment Events
  console.log('📦 Seeding Shipments & Audit Ledger Events...');
  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000);
  const daysAhead = (d: number) => new Date(now.getTime() + d * 86400 * 1000);

  interface ShipmentSeedDef {
    trackingNumber: string;
    carrier: Carrier;
    status: Status;
    ndrAttempt: number;
    orderValueCOD: number;
    phone: string;
    stationCode: string;
    needsManifest?: boolean;
    disputeStatus?: DisputeStatus;
    trackingHealth?: TrackingHealth;
    rescheduledDate?: Date;
    coordinates?: { lat: number; lng: number };
    events: Array<{
      status: string;
      remarks: string;
      hoursAgo: number;
      source: 'CARRIER_POLL' | 'CARRIER_WEBHOOK' | 'CUSTOMER';
    }>;
  }

  const shipmentData: ShipmentSeedDef[] = [
    {
      trackingNumber: 'POSTEX-882101',
      carrier: 'POSTEX',
      status: 'NDR_ACTIVE',
      ndrAttempt: 1,
      orderValueCOD: 4500,
      phone: '03001112233',
      stationCode: 'KHI-ST01',
      needsManifest: false,
      disputeStatus: 'NONE',
      trackingHealth: 'HEALTHY',
      events: [
        { status: 'BOOKED', remarks: 'Shipment created by merchant', hoursAgo: 48, source: 'CARRIER_POLL' },
        { status: 'IN_TRANSIT', remarks: 'Parcel arrived at Karachi Hub', hoursAgo: 24, source: 'CARRIER_POLL' },
        { status: 'OUT_FOR_DELIVERY', remarks: 'With courier rider Muhammad Ali', hoursAgo: 6, source: 'CARRIER_POLL' },
        { status: 'NDR_ACTIVE', remarks: 'Customer Phone Switched Off / No Answer', hoursAgo: 2, source: 'CARRIER_POLL' },
      ],
    },
    {
      trackingNumber: 'TRAX-449102',
      carrier: 'TRAX',
      status: 'NDR_ACTIVE',
      ndrAttempt: 2,
      orderValueCOD: 7800,
      phone: '03214445566',
      stationCode: 'LHR-ST02',
      needsManifest: false,
      disputeStatus: 'PENDING',
      trackingHealth: 'HEALTHY',
      events: [
        { status: 'BOOKED', remarks: 'Order booked', hoursAgo: 72, source: 'CARRIER_POLL' },
        { status: 'IN_TRANSIT', remarks: 'Dispatched to Lahore Station', hoursAgo: 48, source: 'CARRIER_POLL' },
        { status: 'OUT_FOR_DELIVERY', remarks: 'Out with rider Kamran', hoursAgo: 28, source: 'CARRIER_POLL' },
        { status: 'NDR_ACTIVE', remarks: 'Customer Not Available / Rescheduled Request', hoursAgo: 24, source: 'CARRIER_POLL' },
        { status: 'OUT_FOR_DELIVERY', remarks: 'Reattempt dispatch with courier', hoursAgo: 6, source: 'CARRIER_POLL' },
        { status: 'NDR_ACTIVE', remarks: 'Customer Refused - Demanded Open Box Inspection', hoursAgo: 1, source: 'CARRIER_POLL' },
      ],
    },
    {
      trackingNumber: 'LEO-552103',
      carrier: 'LEOPARDS',
      status: 'RESOLVED_RESCHEDULED',
      ndrAttempt: 1,
      orderValueCOD: 3200,
      phone: '03337778899',
      stationCode: 'ISB-ST03',
      needsManifest: true,
      rescheduledDate: daysAhead(2),
      disputeStatus: 'NONE',
      trackingHealth: 'HEALTHY',
      events: [
        { status: 'BOOKED', remarks: 'Booked in Leopards system', hoursAgo: 36, source: 'CARRIER_POLL' },
        { status: 'IN_TRANSIT', remarks: 'Arrived at Islamabad Blue Area hub', hoursAgo: 20, source: 'CARRIER_POLL' },
        { status: 'OUT_FOR_DELIVERY', remarks: 'Out for delivery', hoursAgo: 8, source: 'CARRIER_POLL' },
        { status: 'NDR_ACTIVE', remarks: 'Consignee unavailable at address', hoursAgo: 4, source: 'CARRIER_POLL' },
        { status: 'RESOLVED_RESCHEDULED', remarks: 'Customer requested reschedule to Nov 2 via WhatsApp', hoursAgo: 2, source: 'CUSTOMER' },
      ],
    },
    {
      trackingNumber: 'TCS-771104',
      carrier: 'TCS',
      status: 'RESOLVED_RESCHEDULED',
      ndrAttempt: 1,
      orderValueCOD: 12000,
      phone: '03456667788',
      stationCode: 'FSD-ST04',
      needsManifest: true,
      rescheduledDate: daysAhead(1),
      coordinates: { lat: 31.4187, lng: 73.0791 },
      disputeStatus: 'NONE',
      trackingHealth: 'HEALTHY',
      events: [
        { status: 'BOOKED', remarks: 'Parcel registered', hoursAgo: 30, source: 'CARRIER_POLL' },
        { status: 'IN_TRANSIT', remarks: 'In transit to Faisalabad', hoursAgo: 18, source: 'CARRIER_POLL' },
        { status: 'OUT_FOR_DELIVERY', remarks: 'Van dispatch route 4', hoursAgo: 9, source: 'CARRIER_POLL' },
        { status: 'NDR_ACTIVE', remarks: 'Door locked / No one answered', hoursAgo: 5, source: 'CARRIER_POLL' },
        { status: 'RESOLVED_RESCHEDULED', remarks: 'Confirmed delivery for tomorrow morning with GPS pin', hoursAgo: 3, source: 'CUSTOMER' },
      ],
    },
    {
      trackingNumber: 'POSTEX-993105',
      carrier: 'POSTEX',
      status: 'OUT_FOR_DELIVERY',
      ndrAttempt: 0,
      orderValueCOD: 5600,
      phone: '03012223344',
      stationCode: 'KHI-ST01',
      needsManifest: false,
      disputeStatus: 'NONE',
      trackingHealth: 'HEALTHY',
      events: [
        { status: 'BOOKED', remarks: 'Electronic manifest received', hoursAgo: 22, source: 'CARRIER_POLL' },
        { status: 'IN_TRANSIT', remarks: 'Sorted at Karachi South', hoursAgo: 10, source: 'CARRIER_POLL' },
        { status: 'OUT_FOR_DELIVERY', remarks: 'Assigned to rider Tariq Mehmood', hoursAgo: 4, source: 'CARRIER_POLL' },
      ],
    },
    {
      trackingNumber: 'TRAX-882106',
      carrier: 'TRAX',
      status: 'OUT_FOR_DELIVERY',
      ndrAttempt: 1,
      orderValueCOD: 8900,
      phone: '03123334455',
      stationCode: 'LHR-ST02',
      needsManifest: false,
      disputeStatus: 'NONE',
      trackingHealth: 'HEALTHY',
      events: [
        { status: 'BOOKED', remarks: 'Pickup completed', hoursAgo: 40, source: 'CARRIER_POLL' },
        { status: 'IN_TRANSIT', remarks: 'Linehaul transit', hoursAgo: 26, source: 'CARRIER_POLL' },
        { status: 'OUT_FOR_DELIVERY', remarks: 'First delivery attempt', hoursAgo: 18, source: 'CARRIER_POLL' },
        { status: 'NDR_ACTIVE', remarks: 'Customer requested evening delivery', hoursAgo: 14, source: 'CARRIER_POLL' },
        { status: 'OUT_FOR_DELIVERY', remarks: 'Re-dispatched for today', hoursAgo: 3, source: 'CARRIER_POLL' },
      ],
    },
    {
      trackingNumber: 'LEO-661107',
      carrier: 'LEOPARDS',
      status: 'IN_TRANSIT',
      ndrAttempt: 0,
      orderValueCOD: 2400,
      phone: '03225556677',
      stationCode: 'PEW-ST05',
      needsManifest: false,
      disputeStatus: 'NONE',
      trackingHealth: 'HEALTHY',
      events: [
        { status: 'BOOKED', remarks: 'Order booked by shipper', hoursAgo: 16, source: 'CARRIER_POLL' },
        { status: 'IN_TRANSIT', remarks: 'In transit to Peshawar sorting centre', hoursAgo: 8, source: 'CARRIER_POLL' },
      ],
    },
    {
      trackingNumber: 'TCS-334108',
      carrier: 'TCS',
      status: 'IN_TRANSIT',
      ndrAttempt: 0,
      orderValueCOD: 6100,
      phone: '03057778899',
      stationCode: 'KHI-ST01',
      needsManifest: false,
      disputeStatus: 'NONE',
      trackingHealth: 'HEALTHY',
      events: [
        { status: 'BOOKED', remarks: 'Booking confirmed', hoursAgo: 12, source: 'CARRIER_POLL' },
        { status: 'IN_TRANSIT', remarks: 'Bagged and in transit to Karachi Central', hoursAgo: 5, source: 'CARRIER_POLL' },
      ],
    },
    {
      trackingNumber: 'POSTEX-221109',
      carrier: 'POSTEX',
      status: 'DELIVERED',
      ndrAttempt: 0,
      orderValueCOD: 3950,
      phone: '03028889900',
      stationCode: 'LHR-ST02',
      needsManifest: false,
      disputeStatus: 'NONE',
      trackingHealth: 'HEALTHY',
      events: [
        { status: 'BOOKED', remarks: 'Order created', hoursAgo: 50, source: 'CARRIER_POLL' },
        { status: 'IN_TRANSIT', remarks: 'Linehaul arrived Lahore', hoursAgo: 30, source: 'CARRIER_POLL' },
        { status: 'OUT_FOR_DELIVERY', remarks: 'Out with delivery agent', hoursAgo: 12, source: 'CARRIER_POLL' },
        { status: 'DELIVERED', remarks: 'Delivered and cash collected PKR 3950', hoursAgo: 4, source: 'CARRIER_POLL' },
      ],
    },
    {
      trackingNumber: 'TRAX-119110',
      carrier: 'TRAX',
      status: 'DELIVERED',
      ndrAttempt: 1,
      orderValueCOD: 14200,
      phone: '03449990011',
      stationCode: 'ISB-ST03',
      needsManifest: false,
      disputeStatus: 'NONE',
      trackingHealth: 'HEALTHY',
      events: [
        { status: 'BOOKED', remarks: 'Order booked', hoursAgo: 60, source: 'CARRIER_POLL' },
        { status: 'IN_TRANSIT', remarks: 'Transit hub', hoursAgo: 42, source: 'CARRIER_POLL' },
        { status: 'OUT_FOR_DELIVERY', remarks: 'Rider on route', hoursAgo: 24, source: 'CARRIER_POLL' },
        { status: 'NDR_ACTIVE', remarks: 'Consignee requested office hours delivery', hoursAgo: 20, source: 'CARRIER_POLL' },
        { status: 'RESOLVED_RESCHEDULED', remarks: 'Rescheduled via WhatsApp', hoursAgo: 18, source: 'CUSTOMER' },
        { status: 'OUT_FOR_DELIVERY', remarks: 'Reattempt out for delivery', hoursAgo: 8, source: 'CARRIER_POLL' },
        { status: 'DELIVERED', remarks: 'Successfully delivered to consignee', hoursAgo: 2, source: 'CARRIER_POLL' },
      ],
    },
    {
      trackingNumber: 'LEO-443111',
      carrier: 'LEOPARDS',
      status: 'RTO_INITIATED',
      ndrAttempt: 3,
      orderValueCOD: 5100,
      phone: '03081112244',
      stationCode: 'KHI-ST01',
      needsManifest: false,
      disputeStatus: 'SUBMITTED',
      trackingHealth: 'DEGRADED',
      events: [
        { status: 'BOOKED', remarks: 'Consignment booked', hoursAgo: 90, source: 'CARRIER_POLL' },
        { status: 'IN_TRANSIT', remarks: 'Arrived KHI', hoursAgo: 70, source: 'CARRIER_POLL' },
        { status: 'OUT_FOR_DELIVERY', remarks: 'Attempt 1', hoursAgo: 50, source: 'CARRIER_POLL' },
        { status: 'NDR_ACTIVE', remarks: 'Customer unreachable', hoursAgo: 46, source: 'CARRIER_POLL' },
        { status: 'OUT_FOR_DELIVERY', remarks: 'Attempt 2', hoursAgo: 30, source: 'CARRIER_POLL' },
        { status: 'NDR_ACTIVE', remarks: 'Customer phone busy', hoursAgo: 26, source: 'CARRIER_POLL' },
        { status: 'OUT_FOR_DELIVERY', remarks: 'Attempt 3', hoursAgo: 14, source: 'CARRIER_POLL' },
        { status: 'NDR_ACTIVE', remarks: 'Fake NDR / Fake door locked report', hoursAgo: 10, source: 'CARRIER_POLL' },
        { status: 'RTO_INITIATED', remarks: 'Marked for return to origin after 3 attempts', hoursAgo: 6, source: 'CARRIER_POLL' },
      ],
    },
    {
      trackingNumber: 'TCS-991112',
      carrier: 'TCS',
      status: 'RTO_DELIVERED',
      ndrAttempt: 3,
      orderValueCOD: 4300,
      phone: '03152223355',
      stationCode: 'LHR-ST02',
      needsManifest: false,
      disputeStatus: 'SETTLED',
      trackingHealth: 'HEALTHY',
      events: [
        { status: 'BOOKED', remarks: 'Booking received', hoursAgo: 120, source: 'CARRIER_POLL' },
        { status: 'IN_TRANSIT', remarks: 'In transit', hoursAgo: 100, source: 'CARRIER_POLL' },
        { status: 'OUT_FOR_DELIVERY', remarks: 'Out for delivery', hoursAgo: 80, source: 'CARRIER_POLL' },
        { status: 'NDR_ACTIVE', remarks: 'No response from customer', hoursAgo: 75, source: 'CARRIER_POLL' },
        { status: 'RTO_INITIATED', remarks: 'RTO processed', hoursAgo: 48, source: 'CARRIER_POLL' },
        { status: 'RTO_DELIVERED', remarks: 'Returned to merchant warehouse', hoursAgo: 12, source: 'CARRIER_POLL' },
      ],
    },
    {
      trackingNumber: 'POSTEX-774113',
      carrier: 'POSTEX',
      status: 'CANCELLED',
      ndrAttempt: 1,
      orderValueCOD: 2800,
      phone: '03243334466',
      stationCode: 'FSD-ST04',
      needsManifest: false,
      disputeStatus: 'NONE',
      trackingHealth: 'HEALTHY',
      events: [
        { status: 'BOOKED', remarks: 'Order booked', hoursAgo: 28, source: 'CARRIER_POLL' },
        { status: 'IN_TRANSIT', remarks: 'Arrived hub', hoursAgo: 16, source: 'CARRIER_POLL' },
        { status: 'OUT_FOR_DELIVERY', remarks: 'Courier en route', hoursAgo: 8, source: 'CARRIER_POLL' },
        { status: 'NDR_ACTIVE', remarks: 'Consignee refused package', hoursAgo: 5, source: 'CARRIER_POLL' },
        { status: 'CANCELLED', remarks: 'Customer cancelled order directly via WhatsApp', hoursAgo: 3, source: 'CUSTOMER' },
      ],
    },
    {
      trackingNumber: 'TRAX-665114',
      carrier: 'TRAX',
      status: 'NDR_ACTIVE',
      ndrAttempt: 1,
      orderValueCOD: 9500,
      phone: '03064445577',
      stationCode: 'KHI-ST01',
      needsManifest: false,
      disputeStatus: 'NONE',
      trackingHealth: 'HEALTHY',
      coordinates: { lat: 24.8607, lng: 67.0011 },
      events: [
        { status: 'BOOKED', remarks: 'Booked in system', hoursAgo: 32, source: 'CARRIER_POLL' },
        { status: 'IN_TRANSIT', remarks: 'Transit Karachi Hub', hoursAgo: 18, source: 'CARRIER_POLL' },
        { status: 'OUT_FOR_DELIVERY', remarks: 'Courier assigned', hoursAgo: 7, source: 'CARRIER_POLL' },
        { status: 'NDR_ACTIVE', remarks: 'Consignee Address Incomplete / House Number Missing', hoursAgo: 3, source: 'CARRIER_POLL' },
      ],
    },
    {
      trackingNumber: 'LEO-887115',
      carrier: 'LEOPARDS',
      status: 'DELIVERED',
      ndrAttempt: 0,
      orderValueCOD: 7400,
      phone: '03315556688',
      stationCode: 'ISB-ST03',
      needsManifest: false,
      disputeStatus: 'NONE',
      trackingHealth: 'HEALTHY',
      events: [
        { status: 'BOOKED', remarks: 'Booked', hoursAgo: 45, source: 'CARRIER_POLL' },
        { status: 'IN_TRANSIT', remarks: 'Hub arrived', hoursAgo: 25, source: 'CARRIER_POLL' },
        { status: 'OUT_FOR_DELIVERY', remarks: 'Rider out', hoursAgo: 10, source: 'CARRIER_POLL' },
        { status: 'DELIVERED', remarks: 'Cash collected and signature captured', hoursAgo: 3, source: 'CARRIER_POLL' },
      ],
    },
    {
      trackingNumber: 'TCS-441116',
      carrier: 'TCS',
      status: 'NDR_ACTIVE',
      ndrAttempt: 2,
      orderValueCOD: 11500,
      phone: '03036667799',
      stationCode: 'LHR-ST02',
      needsManifest: false,
      disputeStatus: 'PENDING',
      trackingHealth: 'HEALTHY',
      events: [
        { status: 'BOOKED', remarks: 'Booked order', hoursAgo: 55, source: 'CARRIER_POLL' },
        { status: 'IN_TRANSIT', remarks: 'In transit', hoursAgo: 35, source: 'CARRIER_POLL' },
        { status: 'OUT_FOR_DELIVERY', remarks: 'Attempt 1', hoursAgo: 22, source: 'CARRIER_POLL' },
        { status: 'NDR_ACTIVE', remarks: 'Consignee Not Available at Given Address', hoursAgo: 18, source: 'CARRIER_POLL' },
        { status: 'OUT_FOR_DELIVERY', remarks: 'Attempt 2', hoursAgo: 6, source: 'CARRIER_POLL' },
        { status: 'NDR_ACTIVE', remarks: 'Customer Phone Switched Off', hoursAgo: 2, source: 'CARRIER_POLL' },
      ],
    },
  ];

  const seededShipments: any[] = [];
  const seededPhoneHashes: Record<string, string> = {};

  for (const item of shipmentData) {
    const e164 = normalizePkPhone(item.phone);
    const encPhone = encryptPhone(e164);
    const pHash = hashPhone(e164);
    seededPhoneHashes[item.trackingNumber] = pHash;

    const lastEvent = item.events[item.events.length - 1];
    const lastEventDate = hoursAgo(lastEvent.hoursAgo);

    const doc = await Shipment.create({
      merchantId,
      carrier: item.carrier,
      trackingNumber: item.trackingNumber,
      status: item.status,
      stateVersion: item.events.length,
      ndrAttempt: item.ndrAttempt,
      orderValueCOD: item.orderValueCOD,
      customerPhone: encPhone,
      customerPhoneHash: pHash,
      destinationStationCode: item.stationCode,
      needsManifest: Boolean(item.needsManifest),
      rescheduledDate: item.rescheduledDate,
      customerCoordinates: item.coordinates,
      disputeStatus: item.disputeStatus || 'NONE',
      trackingHealth: item.trackingHealth || 'HEALTHY',
      lastCarrierEventAt: lastEventDate,
      ndrTemplateDispatched: item.ndrAttempt > 0,
      lastPolledAt: hoursAgo(0.5),
    });
    seededShipments.push(doc);

    // Create Audit Ledger Events for this shipment
    for (const ev of item.events) {
      const occurred = hoursAgo(ev.hoursAgo);
      const evKey = computeEventKey({
        merchantId: merchantId.toString(),
        carrier: item.carrier,
        trackingNumber: item.trackingNumber,
        rawStatus: ev.status,
        rawRemarks: ev.remarks,
        occurredAt: occurred,
      });

      await ShipmentEvent.create({
        shipmentId: doc._id,
        merchantId,
        carrier: item.carrier,
        trackingNumber: item.trackingNumber,
        eventKey: evKey,
        eventHash: toEventHashBuffer(evKey),
        source: ev.source,
        rawStatus: ev.status,
        rawRemarks: ev.remarks,
        occurredAt: occurred,
        disposition: 'APPLIED',
        payload: {
          station: item.stationCode,
          note: ev.remarks,
        },
      });
    }
  }
  console.log(`   ✅ ${seededShipments.length} Shipments and associated ShipmentEvents created`);

  // 7. Interactive Conversation Sessions (WhatsApp bot threads)
  console.log('📱 Seeding WhatsApp Conversation Sessions...');
  const shipPostEx1 = seededShipments.find((s) => s.trackingNumber === 'POSTEX-882101');
  const shipTrax2 = seededShipments.find((s) => s.trackingNumber === 'TRAX-449102');
  const shipLeo3 = seededShipments.find((s) => s.trackingNumber === 'LEO-552103');
  const shipTrax14 = seededShipments.find((s) => s.trackingNumber === 'TRAX-665114');

  if (shipPostEx1) {
    await ConversationSession.create({
      merchantId,
      shipmentId: shipPostEx1._id,
      customerPhoneHash: seededPhoneHashes['POSTEX-882101'],
      state: 'AWAITING_DATE',
      stateVersion: 2,
      draft: { pendingAction: 'RESCHEDULE' },
      ndrAttempt: 1,
      templateWamid: 'wamid.HBgLMjA5NDU3NzEyMhUCABIYFDNBRDgzQzIwMTIxNkI4',
      messages: [
        {
          direction: 'OUTBOUND',
          text: 'Assalam-o-Alaikum! Aapka PostEx parcel #POSTEX-882101 deliver nahi ho saka (Customer unavailable). Kya aap kal delivery chahtay hain?',
          messageType: 'template',
          wamid: 'wamid.out.101',
          timestamp: hoursAgo(2),
        },
        {
          direction: 'INBOUND',
          text: 'Haan bhai, main kal office mein hounga, kal deliver kar dein please.',
          messageType: 'text',
          wamid: 'wamid.in.101',
          timestamp: hoursAgo(1.5),
        },
      ],
      windowExpiresAt: daysAhead(1),
      expiresAt: daysAhead(30),
    });
  }

  if (shipLeo3) {
    await ConversationSession.create({
      merchantId,
      shipmentId: shipLeo3._id,
      customerPhoneHash: seededPhoneHashes['LEO-552103'],
      state: 'DONE',
      stateVersion: 4,
      draft: { date: daysAhead(2), pendingAction: 'RESCHEDULE' },
      ndrAttempt: 1,
      templateWamid: 'wamid.leo.out.202',
      messages: [
        {
          direction: 'OUTBOUND',
          text: 'Muazzaz Sarif! Leopards parcel #LEO-552103 deliver nahi hua. Baraye meherbani reattempt date select karein.',
          messageType: 'template',
          wamid: 'wamid.out.201',
          timestamp: hoursAgo(4),
        },
        {
          direction: 'INBOUND',
          text: 'Reschedule for Nov 2',
          messageType: 'button',
          wamid: 'wamid.in.201',
          timestamp: hoursAgo(3),
        },
        {
          direction: 'OUTBOUND',
          text: 'Shukriya! Aapki delivery 2 November ke liye schedule kar di gayi hai. Rider morning mein deliver karega.',
          messageType: 'text',
          wamid: 'wamid.out.202',
          timestamp: hoursAgo(2.8),
        },
      ],
      windowExpiresAt: daysAhead(1),
      expiresAt: daysAhead(30),
    });
  }

  if (shipTrax14) {
    await ConversationSession.create({
      merchantId,
      shipmentId: shipTrax14._id,
      customerPhoneHash: seededPhoneHashes['TRAX-665114'],
      state: 'AWAITING_LOCATION',
      stateVersion: 2,
      draft: {
        pendingAction: 'RESCHEDULE',
        coordinates: { lat: 24.8607, lng: 67.0011 },
        correctionRecorded: true,
      },
      ndrAttempt: 1,
      templateWamid: 'wamid.trax.loc.301',
      messages: [
        {
          direction: 'OUTBOUND',
          text: 'Trax Logistics: Address incomplete for parcel #TRAX-665114. Baraye meherbani apna mukammal pata ya Google location pin share karein.',
          messageType: 'template',
          wamid: 'wamid.out.301',
          timestamp: hoursAgo(3),
        },
        {
          direction: 'INBOUND',
          text: 'House 45-B, Block 6, PECHS, Karachi near Nursery stop. Sending location pin.',
          messageType: 'location',
          wamid: 'wamid.in.301',
          timestamp: hoursAgo(2.2),
        },
      ],
      windowExpiresAt: daysAhead(1),
      expiresAt: daysAhead(30),
    });
  }
  console.log('   ✅ Active & historical WhatsApp Conversation Sessions seeded');

  // 8. Outbox Messages (Dispatches, notifications)
  console.log('📤 Seeding Outbox Messages...');
  const outboxEntries = [
    {
      shipment: shipPostEx1,
      channel: 'META_WHATSAPP',
      messageType: 'NDR_UTILITY_TEMPLATE',
      status: 'DISPATCHED',
      providerMessageId: 'wamid.HBgLMjA5NDU3NzEyMhUCABIYFDNBRDgzQzIwMTIxNkI4',
      scheduledFor: hoursAgo(2),
    },
    {
      shipment: shipTrax2,
      channel: 'META_WHATSAPP',
      messageType: 'NDR_UTILITY_TEMPLATE',
      status: 'DISPATCHED',
      providerMessageId: 'wamid.HBgLMjEyMzQ1Njc4OVICABIYFDIxQzAz',
      scheduledFor: hoursAgo(1),
    },
    {
      shipment: shipLeo3,
      channel: 'META_WHATSAPP',
      messageType: 'RESCHEDULE_CONFIRMATION',
      status: 'DISPATCHED',
      providerMessageId: 'wamid.HBgLMjQzNDU2Nzg5MhUCABIYFDdBQzEw',
      scheduledFor: hoursAgo(2.8),
    },
    {
      shipment: seededShipments.find((s) => s.trackingNumber === 'TCS-441116'),
      channel: 'META_WHATSAPP',
      messageType: 'NDR_UTILITY_TEMPLATE',
      status: 'PENDING',
      scheduledFor: now,
    },
  ];

  for (const ob of outboxEntries) {
    if (!ob.shipment) continue;
    await OutboxMessage.create({
      shipmentId: ob.shipment._id,
      merchantId,
      recipientPhone: ob.shipment.customerPhone,
      recipientPhoneHash: ob.shipment.customerPhoneHash,
      dedupeKey: `outbox:${ob.shipment._id}:${ob.messageType}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
      channel: ob.channel,
      messageType: ob.messageType,
      payload: {
        trackingNumber: ob.shipment.trackingNumber,
        carrier: ob.shipment.carrier,
        orderValueCOD: ob.shipment.orderValueCOD,
      },
      status: ob.status,
      scheduledFor: ob.scheduledFor,
      leaseVersion: 0,
      attempts: ob.status === 'DISPATCHED' ? 1 : 0,
      providerMessageId: ob.providerMessageId,
      priorityScore: 10,
    });
  }
  console.log(`   ✅ ${outboxEntries.length} Outbox Messages generated`);

  // 9. Call Detail Records (CDR) for CPR verification
  console.log('📞 Seeding Call Detail Records (CDR)...');
  const cdrRecords = [
    {
      callerPhone: '+923214445566',
      recipientPhoneHash: seededPhoneHashes['TRAX-449102'], // Trax rider ghost attempt
      callTimestamp: hoursAgo(1.2),
      durationSeconds: 3, // Suspicious 3-second call indicates courier spoofed attempt
      callStatus: 'ANSWERED',
    },
    {
      callerPhone: '+923081112244',
      recipientPhoneHash: seededPhoneHashes['LEO-443111'], // Leopards fake attempt
      callTimestamp: hoursAgo(10.5),
      durationSeconds: 0,
      callStatus: 'MISSED',
    },
    {
      callerPhone: '+923036667799',
      recipientPhoneHash: seededPhoneHashes['TCS-441116'], // TCS fake attempt
      callTimestamp: hoursAgo(2.1),
      durationSeconds: 0,
      callStatus: 'FAILED',
    },
    {
      callerPhone: '+923001112233',
      recipientPhoneHash: seededPhoneHashes['POSTEX-882101'], // Real answered call
      callTimestamp: hoursAgo(2.1),
      durationSeconds: 42,
      callStatus: 'ANSWERED',
    },
  ];

  for (const cdr of cdrRecords) {
    await CdrRecord.create({
      merchantId,
      fileHash: crypto.createHash('sha256').update(`cdr-file-${cdr.callerPhone}`).digest('hex'),
      callerPhone: cdr.callerPhone,
      recipientPhoneHash: cdr.recipientPhoneHash,
      callTimestamp: cdr.callTimestamp,
      durationSeconds: cdr.durationSeconds,
      callStatus: cdr.callStatus,
    });
  }
  console.log(`   ✅ ${cdrRecords.length} CDR call log entries seeded`);

  // 10. CPR Margin Defense Disputes
  console.log('⚖️ Seeding CPR Margin Defense Disputes...');
  const shipTrax2Doc = seededShipments.find((s) => s.trackingNumber === 'TRAX-449102');
  const shipLeo11Doc = seededShipments.find((s) => s.trackingNumber === 'LEO-443111');
  const shipTcs16Doc = seededShipments.find((s) => s.trackingNumber === 'TCS-441116');
  const shipTcs12Doc = seededShipments.find((s) => s.trackingNumber === 'TCS-991112');

  if (shipTrax2Doc) {
    await CprDispute.create({
      merchantId,
      shipmentId: shipTrax2Doc._id,
      carrier: 'TRAX',
      trackingNumber: shipTrax2Doc.trackingNumber,
      claimAmount: shipTrax2Doc.orderValueCOD,
      cprScore: 88,
      cprBand: 'STRONG',
      status: 'PENDING_REVIEW',
      stateVersion: 1,
      settlementCutoff: daysAhead(2),
      disputeRetractionRequested: false,
      breakdown: {
        noCallEvidence: { points: 30, maxPoints: 30, passed: true, details: 'CDR verification reveals courier call lasted only 3s (spoofed call).' },
        customerConfirmed: { points: 25, maxPoints: 25, passed: true, details: 'Customer stated on WhatsApp they were home and ready for pickup.' },
        addressContradicts: { points: 15, maxPoints: 20, passed: true, details: 'Address verified as accurate commercial building with reception.' },
        timingDiscrepancy: { points: 10, maxPoints: 15, passed: true, details: 'Scan was submitted outside courier operational delivery window.' },
        insideCutoff: { points: 8, maxPoints: 10, passed: true, details: 'Dispute submitted within 48h settlement cutoff window.' },
      },
      evidenceSnapshot: {
        ledgerEvents: [
          { eventKey: 'demo-ev-1', rawStatus: 'OUT_FOR_DELIVERY', disposition: 'APPLIED', occurredAt: hoursAgo(6) },
          { eventKey: 'demo-ev-2', rawStatus: 'NDR_ACTIVE', disposition: 'APPLIED', occurredAt: hoursAgo(1) },
        ],
        callLogMatches: [
          { callTimestamp: hoursAgo(1.2), durationSeconds: 3, callStatus: 'ANSWERED' },
        ],
      },
    });
  }

  if (shipLeo11Doc) {
    await CprDispute.create({
      merchantId,
      shipmentId: shipLeo11Doc._id,
      carrier: 'LEOPARDS',
      trackingNumber: shipLeo11Doc.trackingNumber,
      claimAmount: shipLeo11Doc.orderValueCOD,
      cprScore: 92,
      cprBand: 'STRONG',
      status: 'SUBMITTED',
      stateVersion: 2,
      settlementCutoff: daysAhead(1),
      disputeRetractionRequested: false,
      submittedAt: hoursAgo(4),
      breakdown: {
        noCallEvidence: { points: 30, maxPoints: 30, passed: true, details: 'Zero call records found matching customer mobile during courier shift.' },
        customerConfirmed: { points: 25, maxPoints: 25, passed: true, details: 'Customer confirmed no courier visit took place on attempt 3.' },
        addressContradicts: { points: 18, maxPoints: 20, passed: true, details: 'GPS pin confirms location was accessible.' },
        timingDiscrepancy: { points: 10, maxPoints: 15, passed: true, details: 'Scan reported 2 minutes after leaving dispatch station.' },
        insideCutoff: { points: 9, maxPoints: 10, passed: true, details: 'Claim initiated prior to RTO return completion.' },
      },
      evidenceSnapshot: {
        ledgerEvents: [
          { eventKey: 'demo-ev-leo-1', rawStatus: 'NDR_ACTIVE', disposition: 'APPLIED', occurredAt: hoursAgo(10) },
          { eventKey: 'demo-ev-leo-2', rawStatus: 'RTO_INITIATED', disposition: 'APPLIED', occurredAt: hoursAgo(6) },
        ],
        callLogMatches: [
          { callTimestamp: hoursAgo(10.5), durationSeconds: 0, callStatus: 'MISSED' },
        ],
      },
    });
  }

  if (shipTcs16Doc) {
    await CprDispute.create({
      merchantId,
      shipmentId: shipTcs16Doc._id,
      carrier: 'TCS',
      trackingNumber: shipTcs16Doc.trackingNumber,
      claimAmount: shipTcs16Doc.orderValueCOD,
      cprScore: 91,
      cprBand: 'STRONG',
      status: 'DRAFT',
      stateVersion: 1,
      settlementCutoff: daysAhead(3),
      disputeRetractionRequested: false,
      breakdown: {
        noCallEvidence: { points: 30, maxPoints: 30, passed: true, details: 'Customer CDR indicates 0 outbound calls from courier dispatch.' },
        customerConfirmed: { points: 24, maxPoints: 25, passed: true, details: 'Verified consignee active and responsive.' },
        addressContradicts: { points: 18, maxPoints: 20, passed: true, details: 'Address verified with landmark.' },
        timingDiscrepancy: { points: 10, maxPoints: 15, passed: true, details: 'Attempt recorded at 10:45 PM (outside SLA).' },
        insideCutoff: { points: 9, maxPoints: 10, passed: true, details: 'Well within standard claim window.' },
      },
      evidenceSnapshot: {
        ledgerEvents: [
          { eventKey: 'demo-ev-tcs-1', rawStatus: 'NDR_ACTIVE', disposition: 'APPLIED', occurredAt: hoursAgo(2) },
        ],
        callLogMatches: [
          { callTimestamp: hoursAgo(2.1), durationSeconds: 0, callStatus: 'FAILED' },
        ],
      },
    });
  }

  if (shipTcs12Doc) {
    await CprDispute.create({
      merchantId,
      shipmentId: shipTcs12Doc._id,
      carrier: 'TCS',
      trackingNumber: shipTcs12Doc.trackingNumber,
      claimAmount: shipTcs12Doc.orderValueCOD,
      cprScore: 72,
      cprBand: 'MEDIUM',
      status: 'SETTLED',
      stateVersion: 3,
      settlementCutoff: hoursAgo(24),
      disputeRetractionRequested: false,
      submittedAt: hoursAgo(48),
      settledAt: hoursAgo(6),
      settlementAmount: 4300,
      breakdown: {
        noCallEvidence: { points: 22, maxPoints: 30, passed: true, details: 'Call attempt was less than 5 seconds.' },
        customerConfirmed: { points: 20, maxPoints: 25, passed: true, details: 'Consignee confirmed courier non-delivery.' },
        addressContradicts: { points: 15, maxPoints: 20, passed: true, details: 'Standard residential address.' },
        timingDiscrepancy: { points: 8, maxPoints: 15, passed: true, details: 'Timing matched courier log discrepancy.' },
        insideCutoff: { points: 7, maxPoints: 10, passed: true, details: 'Within 7-day settlement SLA.' },
      },
      evidenceSnapshot: {
        ledgerEvents: [
          { eventKey: 'demo-ev-tcs-set', rawStatus: 'RTO_DELIVERED', disposition: 'APPLIED', occurredAt: hoursAgo(12) },
        ],
        callLogMatches: [],
      },
    });
  }
  console.log('   ✅ 4 CPR Margin Defense disputes created (STRONG, MEDIUM, SETTLED)');

  // 11. Manifest Batches (Station run-sheets)
  console.log('📋 Seeding Manifest Batches...');
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(now);
  await ManifestBatch.create({
    merchantId,
    carrier: 'POSTEX',
    dateKey: todayKey,
    stationCode: 'KHI-ST01',
    status: 'SENT',
    parcelCount: 2,
    shipmentIds: [shipPostEx1?._id, seededShipments.find((s) => s.trackingNumber === 'POSTEX-993105')?._id].filter(Boolean),
    totalCOD: 10100,
    recipientEmail: 'ops.khi@postex.pk',
    driveUrl: 'https://drive.google.com/open?id=demo_manifest_khi_postex',
    pdfStorageKey: `manifests/${todayKey}/khi-st01-postex.pdf`,
    csvStorageKey: `manifests/${todayKey}/khi-st01-postex.csv`,
    emailDelivered: true,
    sentAt: hoursAgo(5),
    runCount: 1,
  });

  await ManifestBatch.create({
    merchantId,
    carrier: 'TRAX',
    dateKey: todayKey,
    stationCode: 'LHR-ST02',
    status: 'STARTED',
    parcelCount: 2,
    shipmentIds: [shipTrax2?._id, seededShipments.find((s) => s.trackingNumber === 'TRAX-882106')?._id].filter(Boolean),
    totalCOD: 16700,
    recipientEmail: 'hub.lhr@trax.pk',
    runCount: 1,
  });
  console.log('   ✅ Manifest run-sheet batches created for Asia/Karachi today');

  // 12. Import Batches (Bulk CSV uploads)
  console.log('📂 Seeding Bulk Import Batches...');
  await ImportBatch.create({
    merchantId,
    carrier: 'POSTEX',
    filename: 'postex_daily_orders_oct31.csv',
    status: 'COMPLETED',
    totalChunks: 1,
    completedChunks: 1,
    failedChunks: 0,
    rowCount: 120,
    applied: 118,
    duplicates: 2,
    rejected: 0,
    noop: 0,
    unknownShipments: 0,
    completedAt: hoursAgo(8),
  });

  await ImportBatch.create({
    merchantId,
    carrier: 'TRAX',
    filename: 'trax_shipments_oct30.csv',
    status: 'COMPLETED',
    totalChunks: 1,
    completedChunks: 1,
    failedChunks: 0,
    rowCount: 85,
    applied: 84,
    duplicates: 1,
    rejected: 0,
    noop: 0,
    unknownShipments: 0,
    completedAt: hoursAgo(24),
  });
  console.log('   ✅ 2 Bulk Import Batches recorded');

  // 13. System Operational Alerts (OpsAlert)
  console.log('🚨 Seeding Operational Alerts...');
  const alertDefs = [
    {
      type: 'CARRIER_BREAKER_OPEN',
      severity: 'WARNING',
      source: 'carrierHealthPoller',
      dedupeScope: 'demo:breaker:leopards',
      details: {
        carrier: 'LEOPARDS',
        failureCount: 1,
        message: 'Transient HTTP 504 Gateway Timeout detected on Leopards tracking endpoint. Circuit breaker intact.',
      },
      resolved: false,
    },
    {
      type: 'DISPUTE_SETTLEMENT_CUTOFF_APPROACHING',
      severity: 'WARNING',
      source: 'cprEngine',
      dedupeScope: 'demo:cpr:cutoff',
      details: {
        trackingNumber: 'TRAX-449102',
        cutoff: daysAhead(2),
        claimAmount: 7800,
        message: 'Dispute TRAX-449102 requires merchant submission review before 48h settlement cutoff expires.',
      },
      resolved: false,
    },
    {
      type: 'OUTBOX_BACKLOG_WARNING',
      severity: 'INFO',
      source: 'outboxRelay',
      dedupeScope: 'demo:outbox:queue',
      details: {
        pendingCount: 1,
        channel: 'META_WHATSAPP',
        message: 'All scheduled WhatsApp templates dispatched successfully within rate limits.',
      },
      resolved: true,
    },
  ];

  for (const a of alertDefs) {
    await OpsAlert.create(a);
  }
  console.log(`   ✅ ${alertDefs.length} Operational Alerts generated`);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(`✨  Demo Data Seeding Successfully Completed in ${duration}s!`);
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`📧 Demo Merchant: demo@ndr-system.com`);
  console.log(`🔑 Password:      Password123!`);
  console.log(`📦 Shipments:     ${seededShipments.length} parcels across 4 carriers`);
  console.log(`⚖️ CPR Disputes:  4 margin defense disputes`);
  console.log(`💬 WhatsApp:      Real conversation transcripts & outbox events`);
  console.log('════════════════════════════════════════════════════════════════\n');
}

// Allow direct CLI invocation via `tsx src/scripts/seedDemoData.ts`
if (require.main === module || process.argv[1]?.includes('seedDemoData')) {
  seedDemoData()
    .then(async () => {
      await disconnectDatabase();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('\n💥 Critical seeding error:', err);
      try {
        await disconnectDatabase();
      } catch {
        // ignore
      }
      process.exit(1);
    });
}
