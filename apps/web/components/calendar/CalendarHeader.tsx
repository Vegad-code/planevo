'use client';

import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
} from 'date-fns';

type CalendarView = 'day' | 'week' | 'month' | 'list';

interface CalendarHeaderProps {
  selectedDate: Date;
  activeView?: CalendarView;
  onDateChange: (date: Date) => void;
  onViewChange?: (view: CalendarView) => void;
}

export default function CalendarHeader({
  selectedDate,
  onDateChange,
}: CalendarHeaderProps) {
  // Date strip — horizontal mini-calendar for the current week starting on Monday
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div className="flex items-center gap-1.5 px-1 bg-[var(--color-paper)]">
      {weekDays.map((day) => {
        const selected = isSameDay(day, selectedDate);
        const today = isToday(day);

        return (
          <button
            key={day.toISOString()}
            onClick={() => onDateChange(day)}
            className={`
              flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all duration-200
              ${selected
                ? 'bg-[var(--color-ink)] text-[var(--color-cream)] shadow-sm'
                : today
                  ? 'bg-[var(--color-ink-muted)]/10 text-[var(--color-ink)] hover:bg-[var(--color-ink-muted)]/20'
                  : 'hover:bg-[var(--color-cream-2)] text-[var(--color-ink)]'
              }
            `}
          >
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${selected ? 'text-[var(--color-cream)]/70' : 'text-[var(--color-ink-muted)]'}`}>
              {format(day, 'EEE')}
            </span>
            <span className={`text-base font-bold ${selected ? 'text-[var(--color-cream)]' : 'text-[var(--color-ink)]'}`}>
              {format(day, 'd')}
            </span>

            {/* Activity dots placeholder */}
            <div className="flex gap-0.5 mt-0.5">
              {today && !selected && (
                <div className="w-1 h-1 rounded-full bg-[var(--color-ink)]" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
