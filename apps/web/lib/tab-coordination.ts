interface TabLockPayload {
  ts: number;
  tabId: string;
}

interface CachedEntry<T> {
  value: T;
  cachedAt: number;
}

let tabId: string | null = null;

function getTabId(): string {
  if (!tabId) {
    tabId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `tab-${Date.now()}-${Math.random()}`;
  }
  return tabId;
}

/** @internal Test-only reset for tab identity. */
export function __resetTabIdForTests(id?: string): void {
  tabId = id ?? null;
}

export function isDocumentVisible(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'visible';
}

export function hasSessionFlag(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function setSessionFlag(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, '1');
  } catch {
    // Storage may be disabled or full.
  }
}

export function readCachedJson<T>(key: string, ttlMs: number): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedEntry<T>;
    if (Date.now() - entry.cachedAt > ttlMs) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}

export function writeCachedJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CachedEntry<T> = { value, cachedAt: Date.now() };
    window.sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Storage may be disabled or full.
  }
}

export function tryAcquireTabLock(lockKey: string, ttlMs: number): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const now = Date.now();
    const raw = window.localStorage.getItem(lockKey);
    if (raw) {
      const existing = JSON.parse(raw) as TabLockPayload;
      if (now - existing.ts < ttlMs && existing.tabId !== getTabId()) {
        return false;
      }
    }
    const payload: TabLockPayload = { ts: now, tabId: getTabId() };
    window.localStorage.setItem(lockKey, JSON.stringify(payload));
    return true;
  } catch {
    return true;
  }
}

export function releaseTabLock(lockKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(lockKey);
    if (!raw) return;
    const existing = JSON.parse(raw) as TabLockPayload;
    if (existing.tabId === getTabId()) {
      window.localStorage.removeItem(lockKey);
    }
  } catch {
    // Ignore parse or storage errors.
  }
}

export const DASHBOARD_SHELL_SESSION_FLAG = 'planevo-dashboard-shell-ready';
export const DASHBOARD_INSIGHT_CACHE_KEY = 'planevo-dashboard-insight';
export const GOOGLE_AUTO_SYNC_LOCK_KEY = 'planevo-google-auto-sync';
