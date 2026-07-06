'use client';

/**
 * Loading state for the board. A subtle pulse on a few placeholder rows — NOT a
 * full-page shimmer (§26.1). Respects reduced motion via Tailwind's motion-safe.
 */
export function CommandBoardSkeleton() {
  return (
    <div className="mt-7 space-y-2" aria-hidden>
      <div className="mb-2 h-3 w-16 rounded bg-[var(--color-surface-muted)]" />
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-2 py-2"
        >
          <div className="h-[18px] w-[18px] flex-none rounded-full bg-[var(--color-surface-muted)] motion-safe:animate-pulse" />
          <div
            className="h-4 flex-1 rounded bg-[var(--color-surface-muted)] motion-safe:animate-pulse"
            style={{ maxWidth: `${70 - i * 8}%` }}
          />
          <div className="h-3 w-12 flex-none rounded bg-[var(--color-surface-muted)] motion-safe:animate-pulse" />
        </div>
      ))}
    </div>
  );
}
