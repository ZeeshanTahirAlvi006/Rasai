import { SendGovernor } from '../src/outbox/sendGovernor';

describe('SendGovernor', () => {
  let governor: SendGovernor;

  beforeEach(async () => {
    // 5 msgs/sec with burst capacity of 5 for deterministic rate testing
    governor = new SendGovernor(5, 5);
    await governor.resetForTests();
  });

  it('allows send permits when channel is healthy and within token capacity', async () => {
    const permit = await governor.acquirePermit('META_WHATSAPP', 'hash_123');
    expect(permit.allowed).toBe(true);
    expect(permit.retryAfterMs).toBe(0);
    expect(permit.reason).toBeUndefined();
  });

  it('blocks permits when channel is paused (e.g. Meta 131048 Spam Pause)', async () => {
    const pauseDuration = 2000;
    const resumeAt = await governor.pause('META_WHATSAPP', pauseDuration);
    expect(resumeAt.getTime()).toBeGreaterThan(Date.now());
    expect(await governor.isPaused('META_WHATSAPP')).toBe(true);

    const permit = await governor.acquirePermit('META_WHATSAPP', 'hash_123');
    expect(permit.allowed).toBe(false);
    expect(permit.reason).toBe('CHANNEL_PAUSED');
    expect(permit.retryAfterMs).toBeGreaterThan(0);
  });

  it('blocks permits for a specific recipient when throttled (e.g. Meta 131056 Pair Limit)', async () => {
    const phoneHash = 'recipient_hash_999';
    await governor.recordRecipientThrottle('META_WHATSAPP', phoneHash, 1500);

    // Specific recipient is throttled
    const throttledPermit = await governor.acquirePermit('META_WHATSAPP', phoneHash);
    expect(throttledPermit.allowed).toBe(false);
    expect(throttledPermit.reason).toBe('RECIPIENT_THROTTLED');
    expect(throttledPermit.retryAfterMs).toBeGreaterThan(0);

    // Other recipients on the same channel are still allowed
    const otherPermit = await governor.acquirePermit('META_WHATSAPP', 'recipient_hash_888');
    expect(otherPermit.allowed).toBe(true);
  });

  it('enforces token-bucket rate limiting when burst capacity is exceeded', async () => {
    // Drain all 5 burst tokens
    for (let i = 0; i < 5; i++) {
      const p = await governor.acquirePermit('META_WHATSAPP');
      expect(p.allowed).toBe(true);
    }

    // 6th call should be rate-limited
    const rateLimited = await governor.acquirePermit('META_WHATSAPP');
    expect(rateLimited.allowed).toBe(false);
    expect(rateLimited.reason).toBe('RATE_LIMITED');
    expect(rateLimited.retryAfterMs).toBeGreaterThan(0);
  });
});
