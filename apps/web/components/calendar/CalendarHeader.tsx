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
      className="flex w-full flex-col items-center gap-1 py-2 cursor-pointer"
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">
        {format(date, 'EEE')}
      </span>
      <span
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors',
          today && selected
            ? 'bg-[var(--color-honey)] text-[var(--color-ink)] ring-2 ring-[var(--color-honey-deep)]'
            : today
              ? 'bg-[var(--color-honey)]/20 text-[var(--color-ink)] ring-2 ring-[var(--color-honey)]'
              : selected
                ? 'bg-[var(--color-ink)] text-[var(--color-cream)]'
                : 'text-[var(--color-ink)] hover:bg-[var(--color-cream-2)]',
        )}
      >
        {format(date, 'd')}
      </span>
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
