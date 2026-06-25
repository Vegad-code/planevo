'use client';

import { useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  getYear,
  setMonth,
} from 'date-fns';
import type { CalendarEvent } from '@/types/calendar';
import { getEventColor } from '@/lib/calendar/eventColors';
import { WEEK_STARTS_ON } from '@/components/calendar/CalendarToolbar';
import { cn } from '@/lib/utils';

interface YearViewProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onMonthClick: (monthStart: Date) => void;
}

export default function YearView({
  events,
  selectedDate,
  onMonthClick,
}: YearViewProps) {
  const year = getYear(selectedDate);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      if (ev.is_deleted) continue;
      const key = format(new Date(ev.start_time), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => startOfMonth(setMonth(new Date(year, 0, 1), i))),
    [year]
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-behavior-contain p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {months.map((monthStart) => {
          const monthEnd = endOfMonth(monthStart);
          const calStart = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON });
          const calEnd = endOfWeek(monthEnd, { weekStartsOn: WEEK_STARTS_ON });
          const days = eachDayOfInterval({ start: calStart, end: calEnd });
          const isCurrentMonth =
            monthStart.getMonth() === new Date().getMonth() &&
            year === new Date().getFullYear();

          return (
            <button
              key={monthStart.toISOString()}
              type="button"
              onClick={() => onMonthClick(monthStart)}
              className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] p-3 text-left hover:border-[var(--color-honey)]/40 hover:shadow-sm transition-all"
            >
              <p
                className={cn(
                  'text-sm font-semibold mb-2',
                  isCurrentMonth ? 'text-[var(--color-honey-deep)]' : 'text-[var(--color-ink)]'
                )}
              >
                {format(monthStart, 'MMMM')}
              </p>
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <span
                    key={`${monthStart.getMonth()}-${d}-${i}`}
                    className="text-[9px] font-mono text-[var(--color-ink-faint)] text-center"
                  >
                    {d}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {days.map((day) => {
                  const inMonth = isSameMonth(day, monthStart);
                  const dayKey = format(day, 'yyyy-MM-dd');
                  const dayEvents = eventsByDay.get(dayKey) ?? [];
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={dayKey}
                      className={cn(
                        'flex flex-col items-center justify-start min-h-[22px] py-0.5',
                        !inMonth && 'opacity-30'
                      )}
                    >
                      <span
                        className={cn(
                          'text-[10px] leading-none w-5 h-5 flex items-center justify-center rounded-full',
                          isToday && inMonth
                            ? 'bg-[var(--color-honey)] text-white font-semibold'
                            : 'text-[var(--color-ink-muted)]'
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      {dayEvents.length > 0 && inMonth && (
                        <div className="flex gap-px mt-0.5 justify-center flex-wrap max-w-full">
                          {dayEvents.slice(0, 3).map((ev) => (
                            <span
                              key={ev.id}
                              className="w-1 h-1 rounded-full shrink-0"
                              style={{ backgroundColor: getEventColor(ev).bg }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
