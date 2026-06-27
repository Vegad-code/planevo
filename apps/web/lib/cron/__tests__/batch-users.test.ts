import { describe, expect, it, vi } from 'vitest';

import { mapWithConcurrency } from '@/lib/cron/batch-users';

describe('mapWithConcurrency', () => {
  it('runs at most N workers in parallel', async () => {
    let active = 0;
    let maxActive = 0;

    await mapWithConcurrency([1, 2, 3, 4, 5], 2, async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
    });

    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it('processes every item', async () => {
    const worker = vi.fn(async () => undefined);
    await mapWithConcurrency(['a', 'b', 'c'], 3, worker);
    expect(worker).toHaveBeenCalledTimes(3);
  });
});
