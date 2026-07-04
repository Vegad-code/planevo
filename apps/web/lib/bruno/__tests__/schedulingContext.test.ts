import { describe, expect, it } from 'vitest';
import {
  calendarDayBounds,
  resolveBrunoReferenceDate,
  resolveBrunoTimeZone,
} from '@/lib/bruno/schedulingContext';

describe('resolveBrunoTimeZone', () => {
  it('prefers the browser timezone over profile UTC', () => {
    expect(
      resolveBrunoTimeZone({
        clientTimeZone: 'America/Los_Angeles',
        profilePreferences: { timezone: 'UTC' },
      })
    ).toBe('America/Los_Angeles');
  });

  it('falls back to profile timezone when client timezone is missing', () => {
    expect(
      resolveBrunoTimeZone({
        profilePreferences: { timezone: 'America/New_York' },
      })
    ).toBe('America/New_York');
  });
});

describe('resolveBrunoReferenceDate', () => {
  it('anchors month view to the first of the visible month', () => {
    const result = resolveBrunoReferenceDate({
      localTime: '6/30/2026, 9:00:00 AM',
      pageContext: {
        source: 'calendar',
        page: '/dashboard/calendar',
        label: 'Calendar - July 2026',
        payload: {
          activeView: 'month',
          selectedDate: '2026-07-30T12:00:00.000Z',
          monthStart: '2026-07-01T07:00:00.000Z',
        },
      },
    });
    expect(result.toISOString()).toBe('2026-07-01T07:00:00.000Z');
  });

  it('anchors week view to the visible week start', () => {
    const weekStart = '2026-06-28T07:00:00.000Z';
    const result = resolveBrunoReferenceDate({
      pageContext: {
        source: 'calendar',
        page: '/dashboard/calendar',
        label: 'Calendar - Week of Jun 28',
        payload: {
          activeView: 'week',
          selectedDate: '2026-07-02T12:00:00.000Z',
          weekStart,
        },
      },
    });
    expect(result.toISOString()).toBe(weekStart);
  });
});

describe('calendarDayBounds', () => {
  it('includes evening events that cross UTC midnight for US timezones', () => {
    const { start, end } = calendarDayBounds(
      { year: 2026, month: 7, day: 2 },
      'America/Los_Angeles'
    );
    const eveningEventStart = '2026-07-03T02:00:00.000Z'; // Jul 2 7pm PDT
    expect(eveningEventStart >= start).toBe(true);
    expect(eveningEventStart < end).toBe(true);
  });

  it('misses US-evening events when bounds are computed in UTC', () => {
    const { start, end } = calendarDayBounds(
      { year: 2026, month: 7, day: 2 },
      'UTC'
    );
    const eveningEventStart = '2026-07-03T02:00:00.000Z';
    expect(eveningEventStart >= start && eveningEventStart < end).toBe(false);
  });
});
