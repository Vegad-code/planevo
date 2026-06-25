import { addMinutes, isSameDay, setHours, setMinutes, startOfDay } from 'date-fns';
import type { CalendarEvent } from '@/types/calendar';

interface FindNextFreeSlotOptions {
  date: Date;
  events: CalendarEvent[];
  durationMinutes: number;
  dayStartHour: number;
  dayEndHour: number;
}

export function findNextFreeSlot({
  date,
  events,
  durationMinutes,
  dayStartHour,
  dayEndHour,
}: FindNextFreeSlotOptions): Date | null {
  const dayEvents = events
    .filter((e) => isSameDay(new Date(e.start_time), date))
    .map((e) => ({
      start: new Date(e.start_time),
      end: new Date(e.end_time),
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const dayStart = setMinutes(setHours(startOfDay(date), dayStartHour), 0);
  const dayEnd = setMinutes(setHours(startOfDay(date), dayEndHour), 0);
  const now = new Date();

  let cursor =
    isSameDay(date, now) && now > dayStart && now < dayEnd
      ? new Date(now.getTime() + 15 * 60 * 1000)
      : dayStart;

  while (cursor < dayEnd) {
    const slotEnd = addMinutes(cursor, durationMinutes);
    if (slotEnd > dayEnd) break;

    const overlaps = dayEvents.some(
      (e) => cursor < e.end && slotEnd > e.start
    );

    if (!overlaps) return cursor;

    const blocking = dayEvents.find((e) => cursor < e.end && slotEnd > e.start);
    cursor = blocking ? new Date(blocking.end) : addMinutes(cursor, 15);
  }

  return null;
}
