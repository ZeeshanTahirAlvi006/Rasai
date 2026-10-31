// src/outbox/outbox.service.ts
// Outbox service for transactional message staging, Meta WhatsApp dispatch, template management, and operational alerts.
import { Types } from 'mongoose';
import { AppError } from '../middleware/error';
import { OutboxMessage, type IOutboxMessage } from '../models/OutboxMessage';
import { MerchantWaTemplate, type IMerchantWaTemplate } from '../models/MerchantWaTemplate';
import { OpsAlert } from '../models/OpsAlert';
import { sendGovernor } from './sendGovernor';
import { processOutboxMessage } from './outbox.worker';
import { relayOutbox } from './outbox.relay';
import { getOutboxQueue } from './outbox.queue';
import { invalidateTemplateCache } from './metaClient';
import type { OutboxChannel, OutboxMessageType, OutboxStatus } from '../types';

export interface ListOutboxFilter {
  status?: OutboxStatus;
  messageType?: OutboxMessageType;
  channel?: OutboxChannel;
  shipmentId?: string;
  limit?: number;
  skip?: number;
}

export async function listOutboxMessagesService(
  merchantId: Types.ObjectId,
  filter: ListOutboxFilter = {},
) {
  const query: Record<string, any> = { merchantId };

  if (filter.status) {
    query.status = filter.status;
  }
  if (filter.messageType) {
    query.messageType = filter.messageType;
  }
  if (filter.channel) {
    query.channel = filter.channel;
  }
  if (filter.shipmentId && Types.ObjectId.isValid(filter.shipmentId)) {
    query.shipmentId = new Types.ObjectId(filter.shipmentId);
  }

  const limit = Math.min(Math.max(Number(filter.limit) || 25, 1), 100);
  const skip = Math.max(Number(filter.skip) || 0, 0);

  const [messages, total, countsByStatus] = await Promise.all([
    OutboxMessage.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('_id merchantId shipmentId channel messageType status attempts priorityScore scheduledFor dedupeKey providerMessageId lastError createdAt updatedAt')
      .populate('shipmentId', 'trackingNumber carrier status orderValueCOD')
      .lean()
      .exec(),
    OutboxMessage.countDocuments(query),
    OutboxMessage.aggregate([
      { $match: { merchantId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const summary = {
    PENDING: 0,
    PROCESSING: 0,
    DISPATCHED: 0,
    DISCARDED_STALE: 0,
    FAILED: 0,
  };
  countsByStatus.forEach((item: any) => {
    if (item._id in summary) {
      summary[item._id as keyof typeof summary] = item.count;
    }
  });

  return {
    success: true,
    status: 200,
    message: 'Outbox messages retrieved successfully',
    data: {
      messages,
      total,
      summary,
      limit,
      skip,
    },
  };
}

export async function getOutboxMessageDetailService(
  merchantId: Types.ObjectId,
  id: string,
) {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid outbox message ID', 'invalid_id');
  }

  const message = await OutboxMessage.findOne({
    _id: new Types.ObjectId(id),
    merchantId,
  })
    .select('_id merchantId shipmentId channel messageType status attempts priorityScore scheduledFor dedupeKey providerMessageId lastError payload createdAt updatedAt')
    .populate('shipmentId', 'trackingNumber carrier status orderValueCOD customerPhoneHash')
    .lean()
    .exec();

  if (!message) {
    throw new AppError(404, 'Outbox message not found', 'not_found');
  }

  return {
    success: true,
    status: 200,
    message: 'Outbox message detail retrieved',
    data: message,
  };
}

export async function triggerRelayTickService(batch = 50) {
  const queue = getOutboxQueue();
  const claimedCount = await relayOutbox(queue, batch);

  return {
    success: true,
    status: 200,
    message: `Outbox relay tick executed: claimed and enqueued ${claimedCount} messages`,
    data: {
      claimedCount,
      timestamp: new Date(),
    },
  };
}

export async function dispatchOutboxMessageService(
  merchantId: Types.ObjectId,
  id: string,
) {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid outbox message ID', 'invalid_id');
  }

  const message = await OutboxMessage.findOne({
    _id: new Types.ObjectId(id),
    merchantId,
  });

  if (!message) {
    throw new AppError(404, 'Outbox message not found', 'not_found');
  }

  // If in PENDING, claim it first
  if (message.status === 'PENDING') {
    message.status = 'PROCESSING';
    message.leaseUntil = new Date(Date.now() + 60_000);
    message.leaseVersion = (message.leaseVersion || 0) + 1;
    await message.save();
  }

  // Execute worker processing logic
  await processOutboxMessage(id, message.leaseVersion);

  const updated = await OutboxMessage.findById(id).lean().exec();

  return {
    success: true,
    status: 200,
    message: `Message dispatch processed; current status: ${updated?.status}`,
    data: updated,
  };
}

export async function getGovernorStatusService() {
  const channel: OutboxChannel = 'META_WHATSAPP';
  const isPaused = await sendGovernor.isPaused(channel);
  const resumeAt = await sendGovernor.resumeAt(channel);
  const permit = await sendGovernor.acquirePermit(channel);

  return {
    success: true,
    status: 200,
    message: 'Send governor status retrieved',
    data: {
      channel,
      isPaused,
      resumeAt: isPaused ? resumeAt : null,
      permitCheck: permit,
      timestamp: new Date(),
    },
  };
}

export async function pauseGovernorService(channel: OutboxChannel, durationMs: number) {
  const validDuration = Math.min(Math.max(Number(durationMs) || 600_000, 1000), 86_400_000);
  const resumeAt = await sendGovernor.pause(channel, validDuration);

  return {
    success: true,
    status: 200,
    message: `Send governor paused for channel ${channel} until ${resumeAt.toISOString()}`,
    data: {
      channel,
      isPaused: true,
      resumeAt,
      durationMs: validDuration,
    },
  };
}

export async function resumeGovernorService(channel: OutboxChannel) {
  await sendGovernor.resetForTests();

  return {
    success: true,
    status: 200,
    message: `Send governor resumed for channel ${channel}`,
    data: {
      channel,
      isPaused: false,
      resumedAt: new Date(),
    },
  };
}

export async function listMerchantTemplatesService(merchantId: Types.ObjectId) {
  const customTemplates = await MerchantWaTemplate.find({ merchantId })
    .select('_id merchantId messageType templateName languageCode headerType headerText parameterBindings status createdAt updatedAt')
    .lean()
    .exec();

  const systemDefaults: Array<{
    messageType: OutboxMessageType;
    templateName: string;
    languageCode: string;
    parameterBindings: string[];
    isCustom: boolean;
  }> = [
    {
      messageType: 'NDR_UTILITY_TEMPLATE',
      templateName: process.env.META_TEMPLATE_NDR_UTILITY || 'ndr_utility_v1',
      languageCode: 'en_US',
      parameterBindings: ['trackingNumber', 'orderValueCOD', 'carrier'],
      isCustom: false,
    },
    {
      messageType: 'RTO_NOTICE',
      templateName: process.env.META_TEMPLATE_RTO_NOTICE || 'ndr_rto_notice_v1',
      languageCode: 'en_US',
      parameterBindings: ['trackingNumber', 'orderValueCOD'],
      isCustom: false,
    },
    {
      messageType: 'DELIVERY_CORRECTION',
      templateName: process.env.META_TEMPLATE_DELIVERY_CORRECTION || 'ndr_delivery_correction_v1',
      languageCode: 'en_US',
      parameterBindings: ['trackingNumber'],
      isCustom: false,
    },
    {
      messageType: 'RESCHEDULE_CONFIRMATION',
      templateName: process.env.META_TEMPLATE_RESCHEDULE_CONFIRMATION || 'ndr_reschedule_confirmed_v1',
      languageCode: 'en_US',
      parameterBindings: ['trackingNumber', 'rescheduledDate'],
      isCustom: false,
    },
  ];

  const merged = systemDefaults.map((def) => {
    const custom = customTemplates.find((c) => c.messageType === def.messageType);
    if (custom) {
      return {
        ...def,
        ...custom,
        isCustom: true,
      };
    }
    return def;
  });

  return {
    success: true,
    status: 200,
    message: 'Templates catalog retrieved',
    data: merged,
  };
}

export async function upsertMerchantTemplateService(
  merchantId: Types.ObjectId,
  input: {
    messageType: OutboxMessageType;
    templateName: string;
    languageCode?: string;
    headerType?: 'NONE' | 'TEXT';
    headerText?: string;
    parameterBindings?: string[];
    status?: 'ACTIVE' | 'DISABLED';
  },
) {
  const updated = await MerchantWaTemplate.findOneAndUpdate(
    { merchantId, messageType: input.messageType },
    {
      $set: {
        templateName: input.templateName.trim(),
        languageCode: input.languageCode || 'en_US',
        headerType: input.headerType || 'NONE',
        headerText: input.headerText,
        parameterBindings: input.parameterBindings || ['trackingNumber'],
        status: input.status || 'ACTIVE',
        updatedAt: new Date(),
      },
    },
    { upsert: true, returnDocument: 'after' },
  );

  invalidateTemplateCache(String(merchantId));

  return {
    success: true,
    status: 200,
    message: `Template configured for ${input.messageType}`,
    data: updated,
  };
}

export async function listOpsAlertsService() {
  const alerts = await OpsAlert.find()
    .sort({ createdAt: -1 })
    .limit(50)
    .select('_id type severity dedupeScope details resolved createdAt updatedAt')
    .lean()
    .exec();

  return {
    success: true,
    status: 200,
    message: 'Ops alerts retrieved',
    data: alerts,
  };
}

export async function resolveOpsAlertService(id: string) {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid alert ID', 'invalid_id');
  }

  const updated = await OpsAlert.findByIdAndUpdate(
    id,
    { $set: { resolved: true, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );

  return {
    success: true,
    status: 200,
    message: 'Alert marked as resolved',
    data: updated,
  };
}
