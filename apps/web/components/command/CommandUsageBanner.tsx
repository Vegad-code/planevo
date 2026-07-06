'use client';

/**
 * A single quiet line shown only when the user has actually hit an AI cap
 * (§26.1: no permanent banners). Manual typing always still works, so the tone is
 * matter-of-fact, not a wall (§38 copy). A contextual upgrade link, not a modal.
 */
export function CommandUsageBanner({
  message,
  resetAt,
  onUpgrade,
}: {
  message: string;
  resetAt?: string;
  onUpgrade?: () => void;
}) {
  const resetLabel = resetAt
    ? new Date(resetAt).toLocaleString(undefined, {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-[var(--color-surface-muted)] px-3 py-2 text-[13px] text-[var(--color-ink-soft)]">
      <span>{message}</span>
      {resetLabel && <span className="text-[var(--color-ink-faint)]">Resets {resetLabel}.</span>}
      {onUpgrade && (
        <button
          type="button"
          onClick={onUpgrade}
          className="font-medium text-[var(--color-accent-warm)] underline-offset-2 hover:underline"
        >
          See plans
        </button>
      )}
    </div>
  );
}
