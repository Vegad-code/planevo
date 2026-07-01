import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CALENDAR_NAV_STORAGE_KEY,
  readStoredCalendarNav,
  writeStoredCalendarNav,
  hasStoredCalendarNav,
} from '../navigation-state';

describe('calendar navigation state', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal('sessionStorage', {
      getItem(key: string) {
        return store[key] ?? null;
      },
      setItem(key: string, value: string) {
        store[key] = value;
      },
      removeItem(key: string) {
        delete store[key];
      },
      clear() {
        store = {};
      },
    });
    sessionStorage.clear();
  });

  it('returns null when nothing is stored', () => {
    expect(readStoredCalendarNav()).toBeNull();
    expect(hasStoredCalendarNav()).toBe(false);
  });

  it('round-trips selected date, view, and backlog state', () => {
    writeStoredCalendarNav({
      selectedDate: '2026-07-02T15:00:00.000Z',
      activeView: 'day',
      backlogOpen: true,
    });

    expect(hasStoredCalendarNav()).toBe(true);
    expect(readStoredCalendarNav()).toEqual({
      selectedDate: '2026-07-02T15:00:00.000Z',
      activeView: 'day',
      backlogOpen: true,
    });
  });

  it('rejects invalid stored payloads', () => {
    sessionStorage.setItem(
      CALENDAR_NAV_STORAGE_KEY,
      JSON.stringify({ selectedDate: 'not-a-date', activeView: 'day' })
    );
    expect(readStoredCalendarNav()).toBeNull();
  });
});
