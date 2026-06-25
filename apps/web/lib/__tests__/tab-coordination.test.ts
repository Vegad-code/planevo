import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetTabIdForTests,
  readCachedJson,
  releaseTabLock,
  setSessionFlag,
  hasSessionFlag,
  tryAcquireTabLock,
  writeCachedJson,
} from '@/lib/tab-coordination';

describe('tab-coordination', () => {
  beforeEach(() => {
    __resetTabIdForTests('tab-a');
    localStorage.clear();
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-21T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    __resetTabIdForTests();
  });

  it('stores and reads session flags', () => {
    expect(hasSessionFlag('planevo-test-flag')).toBe(false);
    setSessionFlag('planevo-test-flag');
    expect(hasSessionFlag('planevo-test-flag')).toBe(true);
  });

  it('writes and reads cached JSON within TTL', () => {
    writeCachedJson('planevo-test-cache', { insight: 'hello' });
    expect(readCachedJson<{ insight: string }>('planevo-test-cache', 60_000)).toEqual({
      insight: 'hello',
    });
  });

  it('expires cached JSON after TTL', () => {
    writeCachedJson('planevo-test-cache', { insight: 'stale' });
    vi.advanceTimersByTime(61_000);
    expect(readCachedJson('planevo-test-cache', 60_000)).toBeNull();
  });

  it('grants lock to first tab and blocks second tab within TTL', () => {
    expect(tryAcquireTabLock('planevo-test-lock', 5 * 60_000)).toBe(true);

    __resetTabIdForTests('tab-b');
    expect(tryAcquireTabLock('planevo-test-lock', 5 * 60_000)).toBe(false);
  });

  it('allows another tab to acquire lock after TTL expires', () => {
    expect(tryAcquireTabLock('planevo-test-lock', 5 * 60_000)).toBe(true);

    vi.advanceTimersByTime(5 * 60_000 + 1);

    __resetTabIdForTests('tab-b');
    expect(tryAcquireTabLock('planevo-test-lock', 5 * 60_000)).toBe(true);
  });

  it('releases lock only for owning tab', () => {
    expect(tryAcquireTabLock('planevo-test-lock', 5 * 60_000)).toBe(true);
    releaseTabLock('planevo-test-lock');

    __resetTabIdForTests('tab-b');
    expect(tryAcquireTabLock('planevo-test-lock', 5 * 60_000)).toBe(true);
  });
});
