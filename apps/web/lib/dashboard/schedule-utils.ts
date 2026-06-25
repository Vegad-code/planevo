import { endOfDay, isSameDay, startOfDay } from 'date-fns';
import type { CalendarEvent } from '@/types/calendar';
import type { ParsedScheduleBlock } from './types';

export function blocksForDate(
  date: Date,
  todayBlocks: ParsedScheduleBlock[] | null,
  weekEvents: CalendarEvent[]
): ParsedScheduleBlock[] {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  if (isSameDay(date, new Date()) && todayBlocks?.length) {
    return todayBlocks;
  }

  return weekEvents
    .filter((e) => {
      const start = new Date(e.start_time);
      return start >= dayStart && start <= dayEnd;
    })
    .map((e) => {
      const startTime = new Date(e.start_time);
      const endTime = e.end_time
        ? new Date(e.end_time)
        : new Date(startTime.getTime() + 30 * 60000);
      return {
        id: e.id,
        title: e.title,
        time: '',
        duration: Math.round((endTime.getTime() - startTime.getTime()) / 60000),
        type: e.energy_level === 'low' ? ('break' as const) : ('focus' as const),
        description: e.description || '',
        startTime,
        endTime,
      };
    })
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}
