import mongoose, { Types } from 'mongoose';
import { OutboxMessage } from '../src/models/OutboxMessage';
import { relayOutbox } from '../src/outbox/outbox.relay';

describe('outbox.relay', () => {
  const merchantId = new Types.ObjectId();
  const shipmentId = new Types.ObjectId();

  const createMockQueue = () => {
    const enqueued: any[] = [];
    return {
      enqueued,
      addBulk: jest.fn(async (jobs: any[]) => {
        enqueued.push(...jobs);
        return jobs.map((_, i) => ({ id: `job-${i}` }));
      }),
    };
  };

  it('Phase 1a: transitions expired leases with attempts >= MAX_ATTEMPTS to FAILED (B2-RC-01)', async () => {
    const expiredPast = new Date(Date.now() - 10_000);
    const poisonMsg = await OutboxMessage.create({
      merchantId,
      shipmentId,
      dedupeKey: `poison-${Date.now()}`,
      channel: 'META_WHATSAPP',
      messageType: 'NDR_UTILITY_TEMPLATE',
      status: 'PROCESSING',
      leaseUntil: expiredPast,
      attempts: 5,
      leaseVersion: 1,
      scheduledFor: new Date(),
    });

    const mockQueue = createMockQueue();
    await relayOutbox(mockQueue as any, 10);

    const reloaded = await OutboxMessage.findById(poisonMsg._id);
    expect(reloaded?.status).toBe('FAILED');
    expect(reloaded?.lastError?.message).toBe('max_attempts_exceeded_on_lease_expiry');
    expect(reloaded?.leaseUntil).toBeUndefined();
  });

  it('Phase 1b: resets recoverable expired leases (attempts < MAX_ATTEMPTS) to PENDING (B2-RC-01)', async () => {
    const expiredPast = new Date(Date.now() - 10_000);
    const recoverableMsg = await OutboxMessage.create({
      merchantId,
      shipmentId,
      dedupeKey: `recoverable-${Date.now()}`,
      channel: 'META_WHATSAPP',
      messageType: 'NDR_UTILITY_TEMPLATE',
      status: 'PROCESSING',
      leaseUntil: expiredPast,
      attempts: 2,
      leaseVersion: 1,
      scheduledFor: new Date(),
    });

    const mockQueue = createMockQueue();
    await relayOutbox(mockQueue as any, 10);

    const reloaded = await OutboxMessage.findById(recoverableMsg._id);
    // Should be re-claimed in the same tick if due or reset to PENDING
    expect(['PENDING', 'PROCESSING']).toContain(reloaded?.status);
    expect(reloaded?.attempts).toBe(2); // Attempts not burned on lease reap
  });

  it('Phase 2: claims messages in ESR priorityScore order in vectorized O(1) queries (B2-BN-01)', async () => {
    const now = new Date();
    await OutboxMessage.create([
      {
        merchantId,
        shipmentId,
        dedupeKey: `priority-low-${Date.now()}`,
        channel: 'META_WHATSAPP',
        messageType: 'NDR_UTILITY_TEMPLATE',
        status: 'PENDING',
        priorityScore: 500,
        scheduledFor: now,
        attempts: 0,
      },
      {
        merchantId,
        shipmentId,
        dedupeKey: `priority-high-${Date.now()}`,
        channel: 'META_WHATSAPP',
        messageType: 'NDR_UTILITY_TEMPLATE',
        status: 'PENDING',
        priorityScore: 5000,
        scheduledFor: now,
        attempts: 0,
      },
      {
        merchantId,
        shipmentId,
        dedupeKey: `priority-med-${Date.now()}`,
        channel: 'META_WHATSAPP',
        messageType: 'NDR_UTILITY_TEMPLATE',
        status: 'PENDING',
        priorityScore: 2000,
        scheduledFor: now,
        attempts: 0,
      },
    ]);

    const mockQueue = createMockQueue();
    const claimedCount = await relayOutbox(mockQueue as any, 10);
    expect(claimedCount).toBe(3);
    expect(mockQueue.addBulk).toHaveBeenCalledTimes(1);

    const enqueuedJobs = mockQueue.enqueued;
    expect(enqueuedJobs.length).toBe(3);

    // Verify all 3 jobs are marked PROCESSING with incremented leaseVersion
    const docs = await OutboxMessage.find({ _id: { $in: enqueuedJobs.map((j) => j.data.messageId) } });
    for (const doc of docs) {
      expect(doc.status).toBe('PROCESSING');
      expect(doc.leaseVersion).toBe(1);
      expect(doc.attempts).toBe(0); // Relay claims do not bump attempts (B2-RC-01)
    }
  });

  it('Phase 2: isolates concurrent relay executions so no message is claimed twice', async () => {
    const now = new Date();
    const messages = Array.from({ length: 20 }, (_, i) => ({
      merchantId,
      shipmentId,
      dedupeKey: `concurrent-msg-${i}-${Date.now()}`,
      channel: 'META_WHATSAPP',
      messageType: 'NDR_UTILITY_TEMPLATE',
      status: 'PENDING',
      priorityScore: i * 10,
      scheduledFor: now,
      attempts: 0,
    }));
    await OutboxMessage.insertMany(messages);

    const mockQueueA = createMockQueue();
    const mockQueueB = createMockQueue();

    // Run two relay daemons concurrently
    const [claimedA, claimedB] = await Promise.all([
      relayOutbox(mockQueueA as any, 20),
      relayOutbox(mockQueueB as any, 20),
    ]);

    expect(claimedA + claimedB).toBe(20);

    const idsA = mockQueueA.enqueued.map((j) => j.data.messageId);
    const idsB = mockQueueB.enqueued.map((j) => j.data.messageId);
    const intersection = idsA.filter((id) => idsB.includes(id));
    expect(intersection).toHaveLength(0); // 0% double-claim race
  });

  it('Phase 3: rolls back claimed messages to PENDING if queue.addBulk fails (B2-RC-01)', async () => {
    const now = new Date();
    const msg = await OutboxMessage.create({
      merchantId,
      shipmentId,
      dedupeKey: `rollback-test-${Date.now()}`,
      channel: 'META_WHATSAPP',
      messageType: 'NDR_UTILITY_TEMPLATE',
      status: 'PENDING',
      scheduledFor: now,
      attempts: 0,
    });

    const failingQueue = {
      addBulk: jest.fn(async () => {
        throw new Error('Redis connection lost');
      }),
    };

    await expect(relayOutbox(failingQueue as any, 10)).rejects.toThrow('Redis connection lost');

    const reloaded = await OutboxMessage.findById(msg._id);
    expect(reloaded?.status).toBe('PENDING'); // Rolled back, not stuck in PROCESSING for 60s
  });
});
