'use client';

import { cn } from '@/lib/utils';

export interface ParseChip {
  label: string;
  confidence?: number;
}

interface ParseChipsProps {
  chips: string[] | ParseChip[];
  className?: string;
}

function normalizeChips(chips: string[] | ParseChip[]): ParseChip[] {
  return chips.map((chip) =>
    typeof chip === 'string' ? { label: chip } : chip
  );
}

export function ParseChips({ chips, className }: ParseChipsProps) {
  const normalized = normalizeChips(chips);
  if (normalized.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {normalized.map((chip) => (
        <span
          key={chip.label}
          className={cn(
            'px-2 py-0.5 rounded-full text-xs bg-[var(--color-honey-soft)] text-[var(--color-honey-deep)] transition-opacity duration-200',
            chip.confidence !== undefined &&
              chip.confidence < 0.8 &&
              chip.confidence >= 0.5 &&
              'border border-dashed border-[var(--color-honey-deep)]/50'
          )}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}
