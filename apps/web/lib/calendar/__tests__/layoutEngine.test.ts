import { describe, it, expect } from 'vitest';
import {
  timeToPixel,
  pixelToTime,
  durationToHeight,
  eventsOverlap,
  computeDayLayout,
  generateHourLabels,
  getSourceColor,
  getSourceLabel,
} from '../layoutEngine';
import type { CalendarEvent } from '@/types/calendar';

const HOUR_HEIGHT = 72;

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: overrides.id ?? 'evt-1',
    user_id: 'user-1',
    title: overrides.title ?? 'Test Event',
    start_time: overrides.start_time ?? '2025-07-01T09:00:00Z',
    end_time: overrides.end_time ?? '2025-07-01T10:00:00Z',
    is_all_day: false,
    source: overrides.source ?? 'manual',
    is_completed: false,
    is_deleted: false,
    created_at: '2025-07-01T00:00:00Z',
    updated_at: '2025-07-01T00:00:00Z',
    ...overrides,
  };
}

describe('eventsOverlap', () => {
  it('should return true if events overlap', () => {
    const a = {
      start_time: '2026-05-26T10:00:00Z',
      end_time: '2026-05-26T11:00:00Z',
    } as CalendarEvent;
    
    const b = {
      start_time: '2026-05-26T10:30:00Z',
      end_time: '2026-05-26T11:30:00Z',
    } as CalendarEvent;

    expect(eventsOverlap(a, b)).toBe(true);
  });

  it('should return false if one event ends exactly when another starts', () => {
    const a = {
      start_time: '2026-05-26T10:00:00Z',
      end_time: '2026-05-26T11:00:00Z',
    } as CalendarEvent;
    
    const b = {
      start_time: '2026-05-26T11:00:00Z',
      end_time: '2026-05-26T12:00:00Z',
    } as CalendarEvent;

    expect(eventsOverlap(a, b)).toBe(false);
  });

  it('should return true if one event is completely contained within another', () => {
    const a = {
      start_time: '2026-05-26T09:00:00Z',
      end_time: '2026-05-26T12:00:00Z',
    } as CalendarEvent;
    
    const b = {
      start_time: '2026-05-26T10:00:00Z',
      end_time: '2026-05-26T11:00:00Z',
    } as CalendarEvent;

    expect(eventsOverlap(a, b)).toBe(true);
    expect(eventsOverlap(b, a)).toBe(true);
  });

  it('should return false for completely disjoint events', () => {
    const a = {
      start_time: '2026-05-26T09:00:00Z',
      end_time: '2026-05-26T10:00:00Z',
    } as CalendarEvent;
    
    const b = {
      start_time: '2026-05-26T11:00:00Z',
      end_time: '2026-05-26T12:00:00Z',
    } as CalendarEvent;

    expect(eventsOverlap(a, b)).toBe(false);
  });

  it('is symmetric', () => {
    const a = makeEvent({ start_time: '2025-07-01T09:00:00', end_time: '2025-07-01T10:00:00' });
    const b = makeEvent({ start_time: '2025-07-01T09:30:00', end_time: '2025-07-01T10:30:00' });
    expect(eventsOverlap(a, b)).toBe(eventsOverlap(b, a));
  });
});

describe('timeToPixel', () => {
  it('returns 0 for the day start hour', () => {
    const d = new Date('2025-07-01T06:00:00');
    expect(timeToPixel(d, 6)).toBe(0);
  });

  it('returns HOUR_HEIGHT for one hour past start', () => {
    const d = new Date('2025-07-01T07:00:00');
    expect(timeToPixel(d, 6)).toBe(HOUR_HEIGHT);
  });

  it('handles 30-minute offsets', () => {
    const d = new Date('2025-07-01T06:30:00');
    expect(timeToPixel(d, 6)).toBe(HOUR_HEIGHT / 2);
  });

  it('accepts ISO string input', () => {
    const iso = new Date('2025-07-01T08:00:00').toISOString();
    const localDate = new Date(iso);
    const expected = (localDate.getHours() + localDate.getMinutes() / 60 - 6) * HOUR_HEIGHT;
    expect(timeToPixel(iso, 6)).toBe(expected);
  });

  it('can return negative values for times before day start', () => {
    const d = new Date('2025-07-01T05:00:00');
    expect(timeToPixel(d, 6)).toBeLessThan(0);
  });
});

describe('pixelToTime', () => {
  it('returns the day start hour at 0px', () => {
    const ref = new Date('2025-07-01T12:00:00');
    const result = pixelToTime(0, 6, ref);
    expect(result.getHours()).toBe(6);
    expect(result.getMinutes()).toBe(0);
  });

  it('returns one hour later at HOUR_HEIGHT px', () => {
    const ref = new Date('2025-07-01T12:00:00');
    const result = pixelToTime(HOUR_HEIGHT, 6, ref);
    expect(result.getHours()).toBe(7);
    expect(result.getMinutes()).toBe(0);
  });

  it('snaps to 15-minute intervals', () => {
    const ref = new Date('2025-07-01T12:00:00');
    const px = (7 / 60) * HOUR_HEIGHT;
    const result = pixelToTime(px, 6, ref);
    expect(result.getMinutes() % 15).toBe(0);
  });
});

describe('durationToHeight', () => {
  it('returns HOUR_HEIGHT for a 1-hour event', () => {
    expect(durationToHeight('2025-07-01T09:00:00', '2025-07-01T10:00:00')).toBe(HOUR_HEIGHT);
  });

  it('clamps a 30-minute event to min card height (36px < 40px min)', () => {
    expect(durationToHeight('2025-07-01T09:00:00', '2025-07-01T09:30:00')).toBe(40);
  });

  it('enforces minimum card height of 40px for very short events', () => {
    expect(durationToHeight('2025-07-01T09:00:00', '2025-07-01T09:05:00')).toBe(40);
  });

  it('returns proportional height for multi-hour events', () => {
    expect(durationToHeight('2025-07-01T09:00:00', '2025-07-01T12:00:00')).toBe(HOUR_HEIGHT * 3);
  });
});

describe('computeDayLayout', () => {
  it('returns empty array for no events', () => {
    expect(computeDayLayout([], 6)).toEqual([]);
  });

  it('assigns single event to column 0 with totalColumns 1', () => {
    const events = [makeEvent()];
    const layout = computeDayLayout(events, 6);
    expect(layout).toHaveLength(1);
    expect(layout[0].column).toBe(0);
    expect(layout[0].totalColumns).toBe(1);
  });

  it('assigns two non-overlapping events to column 0', () => {
    const events = [
      makeEvent({ id: '1', start_time: '2025-07-01T09:00:00', end_time: '2025-07-01T10:00:00' }),
      makeEvent({ id: '2', start_time: '2025-07-01T11:00:00', end_time: '2025-07-01T12:00:00' }),
    ];
    const layout = computeDayLayout(events, 6);
    expect(layout).toHaveLength(2);
    expect(layout[0].column).toBe(0);
    expect(layout[1].column).toBe(0);
  });

  it('assigns overlapping events to different columns', () => {
    const events = [
      makeEvent({ id: '1', start_time: '2025-07-01T09:00:00', end_time: '2025-07-01T10:00:00' }),
      makeEvent({ id: '2', start_time: '2025-07-01T09:30:00', end_time: '2025-07-01T10:30:00' }),
    ];
    const layout = computeDayLayout(events, 6);
    expect(layout).toHaveLength(2);
    const columns = layout.map((e) => e.column);
    expect(columns).toContain(0);
    expect(columns).toContain(1);
    expect(layout[0].totalColumns).toBe(2);
    expect(layout[1].totalColumns).toBe(2);
  });

  it('computes top and height for each event', () => {
    const events = [
      makeEvent({ start_time: '2025-07-01T09:00:00', end_time: '2025-07-01T10:00:00' }),
    ];
    const layout = computeDayLayout(events, 6);
    expect(layout[0].height).toBe(HOUR_HEIGHT);
    expect(layout[0].top).toBeDefined();
  });

  it('handles three overlapping events', () => {
    const events = [
      makeEvent({ id: '1', start_time: '2025-07-01T09:00:00', end_time: '2025-07-01T10:30:00' }),
      makeEvent({ id: '2', start_time: '2025-07-01T09:15:00', end_time: '2025-07-01T10:15:00' }),
      makeEvent({ id: '3', start_time: '2025-07-01T09:30:00', end_time: '2025-07-01T10:00:00' }),
    ];
    const layout = computeDayLayout(events, 6);
    expect(layout).toHaveLength(3);
    const maxCol = Math.max(...layout.map((e) => e.totalColumns));
    expect(maxCol).toBeGreaterThanOrEqual(2);
  });
});

describe('generateHourLabels', () => {
  it('generates correct number of labels', () => {
    const labels = generateHourLabels(6, 22, '12h');
    expect(labels).toHaveLength(17);
  });

  it('formats 12h labels correctly', () => {
    const labels = generateHourLabels(0, 23, '12h');
    expect(labels[0].label).toBe('12 AM');
    expect(labels[6].label).toBe('6 AM');
    expect(labels[12].label).toBe('12 PM');
    expect(labels[13].label).toBe('1 PM');
  });

  it('formats 24h labels correctly', () => {
    const labels = generateHourLabels(0, 23, '24h');
    expect(labels[0].label).toBe('00:00');
    expect(labels[6].label).toBe('06:00');
    expect(labels[13].label).toBe('13:00');
  });

  it('calculates correct top positions', () => {
    const labels = generateHourLabels(6, 8, '12h');
    expect(labels[0].top).toBe(0);
    expect(labels[1].top).toBe(HOUR_HEIGHT);
    expect(labels[2].top).toBe(HOUR_HEIGHT * 2);
  });
});

describe('getSourceColor', () => {
  it('returns correct CSS variable for known sources', () => {
    expect(getSourceColor('manual')).toBe('var(--color-manual)');
    expect(getSourceColor('google_calendar')).toBe('var(--color-google)');
    expect(getSourceColor('canvas')).toBe('var(--color-canvas)');
    expect(getSourceColor('schedule')).toBe('var(--color-bruno)');
  });

  it('returns default color for unknown sources', () => {
    expect(getSourceColor('unknown' as CalendarEvent['source'])).toBe('var(--color-manual)');
  });
});

describe('getSourceLabel', () => {
  it('returns correct labels for known sources', () => {
    expect(getSourceLabel('manual')).toBe('Manual');
    expect(getSourceLabel('google_calendar')).toBe('Google');
    expect(getSourceLabel('canvas')).toBe('Canvas');
    expect(getSourceLabel('schedule')).toBe('Bruno');
    expect(getSourceLabel('rollover')).toBe('Rolled Over');
  });

  it('returns the raw source string for unknown sources', () => {
    expect(getSourceLabel('unknown' as CalendarEvent['source'])).toBe('unknown');
  });
});
