'use client';

import Link from 'next/link';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/types/calendar';
import type { Task } from '@/types/tasks';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

interface DashboardMonthCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  visibleMonth: Date;
  onVisibleMonthChange: (month: Date) => void;
  events: CalendarEvent[];
  tasks: Task[];
  loading?: boolean;
}

function hasEventOnDay(day: Date, events: CalendarEvent[]): boolean {
  return events.some((e) => isSameDay(new Date(e.start_time), day));
}

function hasTaskDueOnDay(day: Date, tasks: Task[]): boolean {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;
  return tasks.some((t) => {
    if (!t.due_date) return false;
    const due = new Date(t.due_date).getTime();
    return due >= dayStart && due <= dayEnd;
  });
}

export function DashboardMonthCalendar({
  selectedDate,
  onSelectDate,
  visibleMonth,
  onVisibleMonthChange,
  events,
  tasks,
  loading = false,
}: DashboardMonthCalendarProps) {
  const monthStart = startOfMonth(visibleMonth);
  const monthEnd = endOfMonth(visibleMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <GlassPanel variant="card" className="p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onVisibleMonthChange(subMonths(visibleMonth, 1))}
            aria-label="Previous month"
            className="p-1.5 rounded-full text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] hover:bg-[var(--color-line)]/40 transition-colors"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <h3 className="font-serif text-lg text-[var(--color-ink)]">
            {format(visibleMonth, 'MMMM')}
          </h3>
          <button
            type="button"
            onClick={() => onVisibleMonthChange(addMonths(visibleMonth, 1))}
            aria-label="Next month"
            className="p-1.5 rounded-full text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] hover:bg-[var(--color-line)]/40 transition-colors"
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
        <span className="font-mono text-xs text-[var(--color-ink-faint)]">
          {format(visibleMonth, 'yyyy')}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={`${label}-${i}`}
            className="flex h-6 items-center justify-center font-mono text-[9px] tracking-wider uppercase text-[var(--color-ink-faint)]"
          >
            {label}
          </div>
        ))}
      </div>

      <div
        className={cn(
          'grid grid-cols-7 gap-1 transition-opacity duration-300',
          loading && 'opacity-60',
        )}
      >
        {days.map((day) => {
          const inMonth = isSameMonth(day, visibleMonth);
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);
          const hasEvent = hasEventOnDay(day, events);
          const hasTask = hasTaskDueOnDay(day, tasks);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDate(startOfDay(day))}
              disabled={!inMonth}
              aria-label={format(day, 'EEEE, MMMM d, yyyy')}
              aria-pressed={selected}
              className={cn(
                'relative flex h-8 w-full flex-col items-center justify-center rounded-full text-[11px] transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-warm)]/50',
                !inMonth && 'invisible pointer-events-none',
                inMonth && !selected && 'text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]',
                inMonth && selected && 'bg-[var(--color-accent-warm)] text-[var(--color-accent-cream)] font-semibold shadow-sm',
                inMonth && !selected && today && 'ring-1 ring-[var(--color-accent-warm)] text-[var(--color-ink)]',
                inMonth && !selected && hasEvent && !today && 'ring-1 ring-[var(--color-accent-warm)]/50 text-[var(--color-ink)]',
              )}
            >
              {format(day, 'd')}
              {inMonth && hasTask && !selected && (
                <span className="absolute bottom-0.5 size-1 rounded-full bg-[var(--color-accent-warm)]/70" />
              )}
            </button>
          );
        })}
      </div>

      <Link
        href="/dashboard/calendar"
        className="mt-4 text-center font-mono text-[10px] tracking-wider uppercase text-[var(--color-ink-faint)] hover:text-[var(--color-accent-warm)] transition-colors"
      >
        Open calendar
      </Link>
    </GlassPanel>
  );
}
