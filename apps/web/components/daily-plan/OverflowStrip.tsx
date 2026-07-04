'use client';

import { WarningCircle } from '@phosphor-icons/react';
import { SmoothSurface } from './SmoothSurface';

interface OverflowStripProps {
  count: number;
  onReview: () => void;
}

export function OverflowStrip({ count, onReview }: OverflowStripProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <SmoothSurface
      cornerRadius={24}
      cornerSmoothing={0.88}
      className="mt-4 border border-line bg-[var(--color-surface-raised)]"
    >
      <div className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center">
        <p className="m-0 flex items-center gap-2 text-[14px] text-[var(--color-ink-soft)]">
          <WarningCircle
            weight="bold"
            className="h-4 w-4 shrink-0 text-[var(--color-honey-deep)]"
          />
          <span className="font-medium text-ink">{count}</span> item
          {count === 1 ? '' : 's'} didn&apos;t fit today.
        </p>
        <button
          type="button"
          onClick={onReview}
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-line-strong bg-transparent px-4 text-sm font-semibold text-ink transition hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
        >
          Review with Bruno
        </button>
      </div>
    </SmoothSurface>
  );
}
