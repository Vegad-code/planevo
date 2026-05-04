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
      className="flex flex-col h-full bg-card"
    >
      {/* Weekday Header */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
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
                min-h-[100px] border-r border-b border-border p-2 cursor-pointer
                transition-colors hover:bg-surface-50
                ${!isCurrentMonth ? 'bg-surface-50/50 opacity-50' : ''}
                ${idx % 7 === 0 ? 'border-l-0' : ''}
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`
                    w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold
                    ${isDayToday ? 'bg-brand-500 text-white' : 'text-foreground'}
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
                    className="text-[10px] truncate px-1.5 py-0.5 rounded bg-surface-200 text-muted-foreground font-medium"
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 4 && (
                  <div className="text-[10px] font-medium text-muted-foreground px-1">
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
