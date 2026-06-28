'use client';

interface OverflowStripProps {
  count: number;
  onReview: () => void;
}

export function OverflowStrip({ count, onReview }: OverflowStripProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <div className="mt-6 rounded-2xl border border-line bg-(--color-cream-2)/50 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <p className="font-sans text-[14px] text-(--color-ink-soft) m-0">
        <span className="font-medium text-ink">{count}</span>
        {' '}
        item{count === 1 ? '' : 's'} didn&apos;t fit today.
      </p>
      <button
        type="button"
        onClick={onReview}
        className="font-mono text-[11px] tracking-wide text-(--color-honey-deep) hover:text-(--color-honey) cursor-pointer bg-transparent border-none p-0 whitespace-nowrap"
      >
        Review with Bruno &rarr;
      </button>
    </div>
  );
}
