'use client';

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export type BrunoEditVersionNavProps = {
  activeIndex: number;
  totalVariants: number;
  disabled?: boolean;
  onSelect: (index: number) => void;
};

export function BrunoEditVersionNav({
  activeIndex,
  totalVariants,
  disabled = false,
  onSelect,
}: BrunoEditVersionNavProps) {
  if (totalVariants <= 1) return null;

  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < totalVariants - 1;

  return (
    <div className="mt-1.5 flex items-center justify-end gap-1 text-xs text-[var(--color-settings-text-muted)]">
      <button
        type="button"
        disabled={disabled || !canGoPrev}
        onClick={() => onSelect(activeIndex - 1)}
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-md transition-colors',
          canGoPrev && !disabled
            ? 'hover:bg-[var(--color-settings-card-hover)] hover:text-[var(--color-settings-text)]'
            : 'cursor-not-allowed opacity-40'
        )}
        aria-label="Previous edit version"
      >
        <CaretLeft size={12} weight="bold" />
      </button>
      <span className="min-w-[2.75rem] text-center tabular-nums">
        {activeIndex + 1} / {totalVariants}
      </span>
      <button
        type="button"
        disabled={disabled || !canGoNext}
        onClick={() => onSelect(activeIndex + 1)}
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-md transition-colors',
          canGoNext && !disabled
            ? 'hover:bg-[var(--color-settings-card-hover)] hover:text-[var(--color-settings-text)]'
            : 'cursor-not-allowed opacity-40'
        )}
        aria-label="Next edit version"
      >
        <CaretRight size={12} weight="bold" />
      </button>
    </div>
  );
}
