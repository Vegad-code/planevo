'use client';

import { addDays, format, isSameDay, startOfDay } from 'date-fns';

interface WeekStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  eventDates?: Date[];
}

export function WeekStrip({ selectedDate, onSelectDate, eventDates = [] }: WeekStripProps) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - today.getDay()));

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-none">
      {days.map((day) => {
        const isSelected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, today);
        const hasEvents = eventDates.some((d) => isSameDay(d, day));

        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onSelectDate(day)}
            className={`flex flex-col items-center min-w-[52px] px-3 py-2.5 rounded-2xl border transition-all cursor-pointer ${
              isSelected
                ? 'bg-(--color-ink) text-(--color-paper) border-(--color-ink)'
                : 'bg-(--color-paper) text-(--color-ink-soft) border-line hover:border-line-strong'
            }`}
          >
            <span className="font-mono text-[10px] tracking-wider uppercase">
              {format(day, 'EEE')}
            </span>
            <span
              className={`font-serif text-lg leading-none mt-1 ${isSelected ? 'text-(--color-paper)' : 'text-(--color-ink)'}`}
            >
              {format(day, 'd')}
            </span>
            {hasEvents && !isSelected && (
              <span className="size-1.5 rounded-full bg-(--color-honey) mt-1.5" />
            )}
            {isToday && isSelected && (
              <span className="font-mono text-[8px] mt-1 tracking-wider opacity-70">TODAY</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
