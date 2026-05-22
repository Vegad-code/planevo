'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { MOTION } from '@/lib/calendar/motion';
import type { CalendarEvent } from '@/types/calendar';

interface MonthViewProps {
  date: Date;
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MonthView({ date, events, onDayClick }: MonthViewProps) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [date]);

  return (
    <motion.div
      key={date.toDateString()}
      {...MOTION.viewSwitch}
      className="flex flex-col h-full bg-[var(--color-paper)]"
    >
      {/* Weekday Header */}
      <div className="grid grid-cols-7 border-b border-[var(--color-line)]">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-ink-faint)]"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-5 md:grid-rows-6">
        {days.map((day, idx) => {
          const isCurrentMonth = isSameMonth(day, date);
          const isDayToday = isToday(day);

          // Get events for this day
          const dayEvents = events.filter((e) => {
            const eStart = new Date(e.start_time);
            return isSameDay(eStart, day);
          });

          // Sort day events by time
          dayEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`
                min-h-[100px] border-r border-b border-[var(--color-line)] p-2 cursor-pointer
                transition-colors hover:bg-[var(--color-cream-2)]/30
                ${!isCurrentMonth ? 'bg-[var(--color-cream-2)]/10 opacity-40' : ''}
                ${idx % 7 === 0 ? 'border-l border-[var(--color-line)]' : ''}
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`
                    w-7 h-7 flex items-center justify-center rounded-lg text-sm font-mono font-bold
                    ${isDayToday ? 'bg-[var(--color-ink)] text-[var(--color-cream)] shadow-sm' : 'text-[var(--color-ink)]'}
                  `}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Event indicators */}
              <div className="space-y-1 overflow-hidden h-[calc(100%-36px)]">
                {dayEvents.slice(0, 4).map((event) => (
                  <div
                    key={event.id}
                    className="text-[10px] truncate px-1.5 py-0.5 rounded bg-[var(--color-cream-2)]/50 text-[var(--color-ink-soft)] font-mono font-medium border border-[var(--color-line)]"
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 4 && (
                  <div className="text-[10px] font-mono font-medium text-[var(--color-ink-faint)] px-1">
                    +{dayEvents.length - 4} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
