'use client';

// COMMAND-INTEGRATION: CommandView.tsx should add a header-level "Plan my day"
// action next to the summary strip (§9.9), rendered only when
// `FEATURES.COMMAND_SCHEDULE_BRIDGE` is on. Clicking it should:
//   1. Collect itemIds for eligible items — active, unscheduled responsibilities
//      (i.e. items across board.now/today/dueSoon/onMyPlate whose
//      `calendarEventId` is null) — and open this panel with them.
//   2. Mount it the same way CommandPreviewPanel is mounted today: it should
//      dominate the screen while open (dim the capture band + board underneath,
//      same AnimatePresence wrapper pattern already used for the preview panel).
//
//   {showSchedulePanel && (
//     <CommandSchedulePanel
//       itemIds={eligibleItemIds}
//       onScheduled={() => { setShowSchedulePanel(false); void loadBoard(); }}
//       onClose={() => setShowSchedulePanel(false)}
//     />
//   )}
//
// This component is fully self-contained: it calls `/api/command/schedule`
// itself (propose on mount, confirm on click) and never needs board state
// passed in. CommandView only supplies itemIds and refreshes the board via
// `onScheduled` — no other CommandView wiring is required.

import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check } from '@phosphor-icons/react';
import { GlassPanel } from '@/components/ui/glass-panel';
import type { ProposedScheduleBlock } from '@/lib/command/schedule-bridge';

interface ProposalDraft extends ProposedScheduleBlock {
  accepted: boolean;
}

function formatBlockTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/**
 * Confirmable "Plan my day" proposal list (§9.9). Reuses the calm glass-panel
 * style of CommandPreviewPanel — a genuinely separate plane while open, so
 * glass is allowed (§26.1). Nothing is written to the calendar until the user
 * presses Confirm.
 */
export function CommandSchedulePanel({
  itemIds,
  onScheduled,
  onClose,
}: {
  itemIds: string[];
  onScheduled: () => void;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [],
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<ProposalDraft[]>([]);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function propose() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/command/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'propose',
            itemIds,
            timezone,
            clientNow: new Date().toISOString(),
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { proposals: ProposedScheduleBlock[] };
        if (!cancelled) {
          setDrafts(data.proposals.map((p) => ({ ...p, accepted: true })));
        }
      } catch {
        if (!cancelled) setError('Could not find time for these right now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (itemIds.length > 0) {
      void propose();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [itemIds, timezone]);

  function toggle(index: number) {
    setDrafts((prev) =>
      prev.map((d, i) => (i === index ? { ...d, accepted: !d.accepted } : d)),
    );
  }

  async function confirm() {
    const accepted = drafts.filter((d) => d.accepted);
    if (accepted.length === 0) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch('/api/command/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          timezone,
          blocks: accepted.map((d) => ({
            itemId: d.itemId,
            title: d.title,
            suggestedStart: d.suggestedStart,
            suggestedEnd: d.suggestedEnd,
          })),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      onScheduled();
    } catch {
      setError('Could not confirm the schedule. Try again.');
    } finally {
      setConfirming(false);
    }
  }

  const acceptedCount = drafts.filter((d) => d.accepted).length;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <GlassPanel variant="chrome" className="p-4 sm:p-5">
        <div className="mb-3">
          <h2 className="font-[var(--font-serif)] text-[20px] text-[var(--color-ink)]">
            Plan my day
          </h2>
          <p className="mt-0.5 text-[13px] text-[var(--color-ink-soft)]">
            Placed into real gaps in your calendar. Nothing is added until you confirm.
          </p>
        </div>

        {loading && (
          <p className="py-4 text-[13px] text-[var(--color-ink-faint)]">Finding open time…</p>
        )}

        {!loading && error && (
          <p className="py-4 text-[13px] text-[var(--color-ink-faint)]">{error}</p>
        )}

        {!loading && !error && drafts.length === 0 && (
          <p className="py-4 text-[13px] text-[var(--color-ink-faint)]">
            No open time fit these today.
          </p>
        )}

        {!loading && !error && drafts.length > 0 && (
          <ul className="divide-y divide-[var(--glass-border)]">
            {drafts.map((draft, index) => (
              <li key={draft.itemId} className="flex items-start gap-3 py-2.5">
                <button
                  type="button"
                  aria-label={draft.accepted ? 'Exclude block' : 'Include block'}
                  onClick={() => toggle(index)}
                  className={[
                    'mt-0.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-md border transition-colors',
                    draft.accepted
                      ? 'border-[var(--color-accent-warm)] bg-[var(--color-accent-warm)] text-white'
                      : 'border-[var(--color-ink-faint)] text-transparent',
                  ].join(' ')}
                >
                  <Check weight="bold" size={11} />
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={[
                      'text-[14px] leading-snug',
                      draft.accepted
                        ? 'text-[var(--color-ink)]'
                        : 'text-[var(--color-ink-faint)] line-through',
                    ].join(' ')}
                  >
                    {draft.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--color-ink-faint)]">
                    {formatBlockTime(draft.suggestedStart)} – {formatBlockTime(draft.suggestedEnd)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] text-[var(--color-ink-faint)] hover:text-[var(--color-ink-soft)]"
          >
            Close
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={confirming || loading || acceptedCount === 0}
            className="rounded-full bg-[var(--color-accent-warm)] px-4 py-2 text-[14px] font-medium text-white transition-opacity disabled:opacity-40"
          >
            {confirming ? 'Scheduling…' : `Confirm${acceptedCount > 0 ? ` (${acceptedCount})` : ''}`}
          </button>
        </div>
      </GlassPanel>
    </motion.div>
  );
}
