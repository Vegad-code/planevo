import { describe, it, expect } from 'vitest';
import {
  getEventColor,
  getContrastText,
  DEFAULT_EVENT_COLOR,
  EVENT_COLOR_PALETTE,
} from '../eventColors';
import type { CalendarEvent } from '@/types/calendar';

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'evt-1',
    user_id: 'user-1',
    title: 'Test',
    start_time: '2026-06-21T10:00:00Z',
    end_time: '2026-06-21T11:00:00Z',
    is_all_day: false,
    source: 'manual',
    is_completed: false,
    is_deleted: false,
    created_at: '2026-06-21T10:00:00Z',
    updated_at: '2026-06-21T10:00:00Z',
    ...overrides,
  };
}

describe('getEventColor', () => {
  it('uses user color when set', () => {
    const colors = getEventColor(makeEvent({ color: '#D50000' }));
    expect(colors.bg).toBe('#D50000');
  });

  it('falls back to source color without user color', () => {
    const colors = getEventColor(makeEvent({ source: 'google_calendar' }));
    expect(colors.bg).toBe('#5B8DCF');
  });

  it('uses deterministic palette for manual events without color', () => {
    const colors = getEventColor(makeEvent({ id: 'stable-id', color: undefined }));
    expect(EVENT_COLOR_PALETTE.some((c) => c.hex === colors.bg)).toBe(true);
  });
});

describe('getContrastText', () => {
  it('returns dark text on light backgrounds', () => {
    expect(getContrastText('#F6BF26')).toBe('#1A140D');
  });

  it('returns light text on dark backgrounds', () => {
    expect(getContrastText('#3F51B5')).toBe('#ffffff');
  });
});

describe('DEFAULT_EVENT_COLOR', () => {
  it('is peacock blue', () => {
    expect(DEFAULT_EVENT_COLOR).toBe('#039BE5');
  });
});
