'use client';

import { format, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

interface RbcHeaderProps {
  date: Date;
  label: string;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function RbcDayHeader({
  date,
  selectedDate,
  onDateChange,
}: RbcHeaderProps) {
  const selected = isSameDay(date, selectedDate);
  const today = isToday(date);

  const handleActivate = () => onDateChange(date);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleActivate();
        }
      }}
      className={cn(
        'flex w-full flex-col items-center gap-0.5 py-2 rounded-xl transition-all duration-200 mx-0.5 cursor-pointer',
        selected
          ? 'bg-[var(--color-ink)] text-[var(--color-cream)] shadow-sm'
          : today
            ? 'bg-[var(--color-ink-muted)]/10 text-[var(--color-ink)] hover:bg-[var(--color-ink-muted)]/20'
            : 'hover:bg-[var(--color-cream-2)] text-[var(--color-ink)]'
      )}
    >
      <span
        className={cn(
          'text-[10px] font-mono font-bold uppercase tracking-wider',
          selected ? 'text-[var(--color-cream)]/70' : 'text-[var(--color-ink-muted)]'
        )}
      >
        {format(date, 'EEE')}
      </span>
      <span
        className={cn(
          'text-base font-bold',
          selected ? 'text-[var(--color-cream)]' : 'text-[var(--color-ink)]'
        )}
      >
        {format(date, 'd')}
      </span>
      {today && !selected && (
        <div className="w-1 h-1 rounded-full bg-[var(--color-ink)] mt-0.5" />
      )}
    </div>
  );
}

export function createRbcHeaderComponent(
  selectedDate: Date,
  onDateChange: (date: Date) => void
) {
  return function CalendarRbcHeader({ date }: { date: Date; label: string }) {
    return (
      <RbcDayHeader
        date={date}
        label=""
        selectedDate={selectedDate}
        onDateChange={onDateChange}
      />
    );
  };
}
