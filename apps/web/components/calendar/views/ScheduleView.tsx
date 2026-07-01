'use client';

import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import {
  format,
  isToday,
  startOfDay,
  endOfMonth,
  addMonths,
  compareAsc,
  startOfMonth,
} from 'date-fns';
import type { CalendarEvent } from '@/types/calendar';
import { getEventColor } from '@/lib/calendar/eventColors';
import { cn } from '@/lib/utils';

const SCHEDULE_WINDOW_MONTHS = 3;

export interface ScheduleViewHandle {
  scrollToToday: () => void;
}

interface ScheduleViewProps {
  events: CalendarEvent[];
  scheduleWindowStart: Date;
  timeFormat: '12h' | '24h';
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: Date) => void;
}

function formatScheduleDayLabel(date: Date): string {
  if (isToday(date)) {
    return `Today · ${format(date, 'd MMM, EEE')}`;
  }
  return format(date, 'd MMM, EEE');
}

function formatEventTime(event: CalendarEvent, use12h: boolean): string {
  if (event.is_all_day) return 'All day';
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  const fmt = use12h ? 'h:mm a' : 'HH:mm';
  return `${format(start, fmt)} – ${format(end, fmt)}`;
}

export function getScheduleWindowRange(scheduleWindowStart: Date): { start: Date; end: Date } {
  const today = startOfDay(new Date());
  const windowStart = startOfMonth(scheduleWindowStart);
  const start = windowStart < today ? today : windowStart;
  const end = endOfMonth(addMonths(scheduleWindowStart, SCHEDULE_WINDOW_MONTHS - 1));
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

const ScheduleView = forwardRef<ScheduleViewHandle, ScheduleViewProps>(function ScheduleView(
  {
    events,
    scheduleWindowStart,
    timeFormat,
    onEventClick,
    onDayClick,
  },
  ref
) {
  const use12h = timeFormat === '12h';
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todaySectionRef = useRef<HTMLElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      scrollToToday: () => {
        if (todaySectionRef.current) {
          todaySectionRef.current.scrollIntoView({ block: 'start', behavior: 'smooth' });
          return;
        }
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      },
    }),
    []
  );

  const groupedDays = useMemo(() => {
    const { start: rangeStart, end: rangeEnd } = getScheduleWindowRange(scheduleWindowStart);

    const filtered = events
      .filter((e) => !e.is_deleted)
      .filter((e) => {
        const start = new Date(e.start_time);
        return start >= rangeStart && start <= rangeEnd;
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
  }, [events, scheduleWindowStart]);

  if (groupedDays.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-0 p-8">
        <p className="text-sm text-[var(--color-ink-faint)]">
          No upcoming events in this period.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 min-h-0 overflow-y-auto overscroll-behavior-contain"
    >
      {groupedDays.map(({ date, events: dayEvents }) => (
        <section
          key={date.toISOString()}
          ref={isToday(date) ? todaySectionRef : undefined}
          className="border-b border-[var(--color-line)] last:border-b-0"
        >
          <button
            type="button"
            onClick={() => onDayClick(date)}
            className="sticky top-0 z-10 flex w-full items-center bg-[var(--color-paper)]/95 px-4 py-3 text-left backdrop-blur-sm hover:bg-[var(--color-cream-2)]/50 transition-colors"
          >
            <h3
              className={cn(
                'text-sm font-semibold',
                isToday(date) ? 'text-[var(--color-honey-deep)]' : 'text-[var(--color-ink)]'
              )}
            >
              {formatScheduleDayLabel(date)}
            </h3>
          </button>
          <div className="flex flex-col">
            {dayEvents.map((ev) => {
              const colors = getEventColor(ev);
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onEventClick(ev)}
                  className="flex items-center gap-4 px-4 py-3 text-left hover:bg-[var(--color-cream-2)]/50 transition-colors border-t border-[var(--color-line)]/40"
                >
                  <span className="w-[108px] shrink-0 text-xs text-[var(--color-ink-faint)] tabular-nums">
                    {formatEventTime(ev, use12h)}
                  </span>
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: colors.bg }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-ink)]">
                    {ev.title}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
});

export default ScheduleView;
