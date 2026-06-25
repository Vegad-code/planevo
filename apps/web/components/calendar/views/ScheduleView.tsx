'use client';

import { useMemo } from 'react';
import {
  format,
  isToday,
  isTomorrow,
  isYesterday,
  startOfDay,
  addDays,
  compareAsc,
} from 'date-fns';
import type { CalendarEvent } from '@/types/calendar';
import { getEventColor } from '@/lib/calendar/eventColors';
import { getSourceLabel } from '@/lib/calendar/layoutEngine';
import { cn } from '@/lib/utils';

interface ScheduleViewProps {
  events: CalendarEvent[];
  selectedDate: Date;
  timeFormat: '12h' | '24h';
  onEventClick: (event: CalendarEvent) => void;
}

function formatDayHeader(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEE, MMM d');
}

function formatEventTime(
  event: CalendarEvent,
  use12h: boolean
): string {
  if (event.is_all_day) return 'All day';
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  const fmt = use12h ? 'h:mm a' : 'HH:mm';
  return `${format(start, fmt)} – ${format(end, fmt)}`;
}

export default function ScheduleView({
  events,
  selectedDate,
  timeFormat,
  onEventClick,
}: ScheduleViewProps) {
  const use12h = timeFormat === '12h';

  const groupedDays = useMemo(() => {
    const rangeStart = startOfDay(selectedDate);
    const rangeEnd = addDays(rangeStart, 30);
    const filtered = events
      .filter((e) => !e.is_deleted)
      .filter((e) => {
        const start = new Date(e.start_time);
        return start >= rangeStart && start < rangeEnd;
      })
      .sort((a, b) => compareAsc(new Date(a.start_time), new Date(b.start_time)));

    const groups = new Map<string, { date: Date; events: CalendarEvent[] }>();
    for (const ev of filtered) {
      const day = startOfDay(new Date(ev.start_time));
      const key = day.toISOString();
      if (!groups.has(key)) {
        groups.set(key, { date: day, events: [] });
      }
      groups.get(key)!.events.push(ev);
    }

    return Array.from(groups.values()).sort((a, b) =>
      compareAsc(a.date, b.date)
    );
  }, [events, selectedDate]);

  if (groupedDays.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-0 p-8">
        <p className="text-sm text-[var(--color-ink-faint)]">
          No upcoming events in the next 30 days.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-behavior-contain">
      {groupedDays.map(({ date, events: dayEvents }) => (
        <section key={date.toISOString()} className="mb-2">
          <div className="sticky top-0 z-10 bg-[var(--color-paper)]/95 backdrop-blur-sm px-4 py-3 border-b border-[var(--color-line)]">
            <h3
              className={cn(
                'text-sm font-semibold',
                isToday(date) ? 'text-[var(--color-honey-deep)]' : 'text-[var(--color-ink)]'
              )}
            >
              {formatDayHeader(date)}
            </h3>
          </div>
          <div className="flex flex-col">
            {dayEvents.map((ev) => {
              const colors = getEventColor(ev);
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onEventClick(ev)}
                  className="flex items-stretch gap-3 px-4 py-3 text-left hover:bg-[var(--color-cream-2)]/50 transition-colors border-b border-[var(--color-line)]/50 last:border-b-0"
                >
                  <div
                    className="w-1 shrink-0 rounded-full self-stretch min-h-[40px]"
                    style={{ backgroundColor: colors.bg }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-ink)] truncate">
                      {ev.title}
                    </p>
                    <p className="text-xs text-[var(--color-ink-faint)] mt-0.5">
                      {formatEventTime(ev, use12h)}
                    </p>
                  </div>
                  {ev.source !== 'manual' && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-ink-faint)] self-center shrink-0">
                      {getSourceLabel(ev.source)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
