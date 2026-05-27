import { describe, it, expect } from 'vitest';
import { findGaps, type CalendarEvent } from '../calendar';

describe('findGaps', () => {
  it('should return a single gap if there are no events', () => {
    const dayStart = new Date('2026-05-26T09:00:00Z');
    const dayEnd = new Date('2026-05-26T17:00:00Z');
    const events: CalendarEvent[] = [];

    const gaps = findGaps(events, dayStart, dayEnd, []);

    expect(gaps.length).toBe(1);
    expect(gaps[0].start).toEqual(dayStart);
    expect(gaps[0].end).toEqual(dayEnd);
    expect(gaps[0].durationMinutes).toBe(8 * 60);
  });

  it('should find gaps between events', () => {
    const dayStart = new Date('2026-05-26T09:00:00Z');
    const dayEnd = new Date('2026-05-26T17:00:00Z');
    const events: CalendarEvent[] = [
      {
        id: '1',
        summary: 'Meeting 1',
        start: { dateTime: '2026-05-26T10:00:00Z' },
        end: { dateTime: '2026-05-26T11:00:00Z' },
      },
      {
        id: '2',
        summary: 'Meeting 2',
        start: { dateTime: '2026-05-26T13:00:00Z' },
        end: { dateTime: '2026-05-26T14:30:00Z' },
      },
    ];

    const gaps = findGaps(events, dayStart, dayEnd, []);

    expect(gaps.length).toBe(3);
    
    // Gap 1: 09:00 to 10:00
    expect(gaps[0].start).toEqual(dayStart);
    expect(gaps[0].end).toEqual(new Date('2026-05-26T10:00:00Z'));
    expect(gaps[0].durationMinutes).toBe(60);

    // Gap 2: 11:00 to 13:00
    expect(gaps[1].start).toEqual(new Date('2026-05-26T11:00:00Z'));
    expect(gaps[1].end).toEqual(new Date('2026-05-26T13:00:00Z'));
    expect(gaps[1].durationMinutes).toBe(120);

    // Gap 3: 14:30 to 17:00
    expect(gaps[2].start).toEqual(new Date('2026-05-26T14:30:00Z'));
    expect(gaps[2].end).toEqual(dayEnd);
    expect(gaps[2].durationMinutes).toBe(150);
  });

  it('should respect constraints', () => {
    const dayStart = new Date('2026-05-26T09:00:00Z');
    const dayEnd = new Date('2026-05-26T17:00:00Z');
    const events: CalendarEvent[] = [
      {
        id: '1',
        summary: 'Meeting 1',
        start: { dateTime: '2026-05-26T10:00:00Z' },
        end: { dateTime: '2026-05-26T11:00:00Z' },
      }
    ];
    const constraints = [
      {
        start: new Date('2026-05-26T12:00:00Z'),
        end: new Date('2026-05-26T13:00:00Z')
      }
    ];

    const gaps = findGaps(events, dayStart, dayEnd, constraints);

    expect(gaps.length).toBe(3);
    
    // Gap 1: 09:00 to 10:00
    expect(gaps[0].start).toEqual(dayStart);
    expect(gaps[0].end).toEqual(new Date('2026-05-26T10:00:00Z'));

    // Gap 2: 11:00 to 12:00 (due to constraint)
    expect(gaps[1].start).toEqual(new Date('2026-05-26T11:00:00Z'));
    expect(gaps[1].end).toEqual(new Date('2026-05-26T12:00:00Z'));

    // Gap 3: 13:00 to 17:00
    expect(gaps[2].start).toEqual(new Date('2026-05-26T13:00:00Z'));
    expect(gaps[2].end).toEqual(dayEnd);
  });

  it('should ignore gaps smaller than 15 minutes', () => {
    const dayStart = new Date('2026-05-26T09:00:00Z');
    const dayEnd = new Date('2026-05-26T10:00:00Z');
    const events: CalendarEvent[] = [
      {
        id: '1',
        summary: 'Meeting 1',
        start: { dateTime: '2026-05-26T09:10:00Z' },
        end: { dateTime: '2026-05-26T09:50:00Z' },
      }
    ];

    const gaps = findGaps(events, dayStart, dayEnd, []);

    // 09:00 to 09:10 is 10 mins (ignored)
    // 09:50 to 10:00 is 10 mins (ignored)
    expect(gaps.length).toBe(0);
  });
});
