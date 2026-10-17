import {
  acquireBulkLease,
  refreshBulkLease,
  releaseBulkLease,
  withMerchantBulkLease,
  _clearInMemorySemaphores,
} from '../src/utils/bulkSemaphore.js';

describe('bulkSemaphore (Multi-Tenant Leased Concurrency Guard)', () => {
  beforeEach(() => {
    _clearInMemorySemaphores();
  });

  it('allows up to maxConcurrent leases for a merchant and blocks excess', async () => {
    const merchantId = 'merchant-test-1';

    // 1st slot
    const acq1 = await acquireBulkLease(merchantId, 'chunk-1', 2, 30000);
    expect(acq1).toBe(true);

    // 2nd slot
    const acq2 = await acquireBulkLease(merchantId, 'chunk-2', 2, 30000);
    expect(acq2).toBe(true);

    // 3rd slot should be rejected
    const acq3 = await acquireBulkLease(merchantId, 'chunk-3', 2, 30000);
    expect(acq3).toBe(false);

    // Release chunk-1
    await releaseBulkLease(merchantId, 'chunk-1');

    // 3rd slot should now succeed
    const acq3Retry = await acquireBulkLease(merchantId, 'chunk-3', 2, 30000);
    expect(acq3Retry).toBe(true);
  });

  it('is re-entrant for the same chunkId and extends lease expiration', async () => {
    const merchantId = 'merchant-test-2';

    const acq1 = await acquireBulkLease(merchantId, 'chunk-A', 2, 30000);
    expect(acq1).toBe(true);

    // Same chunk acquires again (refresh/re-entrant)
    const acqAgain = await acquireBulkLease(merchantId, 'chunk-A', 2, 30000);
    expect(acqAgain).toBe(true);

    const refreshed = await refreshBulkLease(merchantId, 'chunk-A', 40000);
    expect(refreshed).toBe(true);
  });

  it('automatically evicts expired leases after timeout', async () => {
    const merchantId = 'merchant-test-3';

    // Acquire with short 50ms lease
    const acq1 = await acquireBulkLease(merchantId, 'chunk-short', 1, 50);
    expect(acq1).toBe(true);

    // Immediately blocked
    const acqBlocked = await acquireBulkLease(merchantId, 'chunk-next', 1, 30000);
    expect(acqBlocked).toBe(false);

    // Wait 60ms for lease to expire
    await new Promise((r) => setTimeout(r, 60));

    // Next chunk should now acquire successfully because chunk-short expired
    const acqAfterExpire = await acquireBulkLease(merchantId, 'chunk-next', 1, 30000);
    expect(acqAfterExpire).toBe(true);
  });

  it('manages lifecycle correctly via withMerchantBulkLease', async () => {
    const merchantId = 'merchant-test-4';
    let executed = false;

    const res = await withMerchantBulkLease(
      merchantId,
      'chunk-managed',
      async () => {
        executed = true;
        return 42;
      },
      { maxConcurrent: 1, leaseDurationMs: 10000, heartbeatIntervalMs: 5000 },
    );

    expect(res.acquired).toBe(true);
    if (res.acquired) {
      expect(res.result).toBe(42);
    }
    expect(executed).toBe(true);

    // Lease should be automatically released
    const nextAcq = await acquireBulkLease(merchantId, 'chunk-subsequent', 1, 10000);
    expect(nextAcq).toBe(true);
  });
});
