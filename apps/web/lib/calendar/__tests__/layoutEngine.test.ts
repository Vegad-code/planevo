import { describe, it, expect } from 'vitest';
import { eventsOverlap } from '../layoutEngine';
import type { CalendarEvent } from '@/types/calendar';

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
});
