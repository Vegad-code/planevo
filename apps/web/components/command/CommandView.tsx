'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useUserProfileOptional } from '@/components/providers/UserProfileProvider';
import type {
  CommandBoard as CommandBoardData,
  CommandBoardSummary,
  CommandIntakeResponse,
  ExtractedResponsibility,
  ResponsibilityItem,
} from '@/lib/command/types';
import { FEATURES } from '@/lib/featureFlags';
import { computeReentryDigest } from '@/lib/command/digest';
import { CommandCapture } from './CommandCapture';
import { CommandBoard } from './CommandBoard';
import { CommandPreviewPanel, type PreviewDraft } from './CommandPreviewPanel';
import { CommandEmptyState } from './CommandEmptyState';
import { CommandBoardSkeleton } from './CommandBoardSkeleton';
import { CommandUsageBanner } from './CommandUsageBanner';
import { CommandBrunoActions } from './CommandBrunoActions';
import { CommandSourcePanel } from './CommandSourcePanel';
import { CommandSchedulePanel } from './CommandSchedulePanel';

/** First-open-of-day detection for the re-entry digest (§9.5), tracked client-side. */
function isFirstOpenOfDay(now: Date): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const key = 'planevo:command:lastOpenDay';
    const today = now.toISOString().slice(0, 10);
    const last = window.localStorage.getItem(key);
    if (last === today) return false;
    window.localStorage.setItem(key, today);
    return true;
  } catch {
    return false;
  }
}

const EMPTY_BOARD: CommandBoardData = {
  now: [],
  today: [],
  dueSoon: [],
  onMyPlate: [],
  unsorted: [],
  waiting: [],
  done: [],
};

interface UsageNotice {
  message: string;
  resetAt?: string;
}

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function summarySentence(s: CommandBoardSummary): string {
  const parts: string[] = [];
  if (s.nowCount) parts.push(`${s.nowCount} for now`);
  if (s.todayCount) parts.push(`${s.todayCount} today`);
  if (s.dueSoonCount) parts.push(`${s.dueSoonCount} due soon`);
  if (s.unsortedCount) parts.push(`${s.unsortedCount} to review`);
  return parts.join(' · ');
}

export function CommandView() {
  const profile = useUserProfileOptional();
  const reduce = useReducedMotion();
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [],
  );

  const [board, setBoard] = useState<CommandBoardData>(EMPTY_BOARD);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [usageNotice, setUsageNotice] = useState<UsageNotice | null>(null);

  const [intakeRunId, setIntakeRunId] = useState<string | null>(null);
  const [previewSummary, setPreviewSummary] = useState('');
  const [drafts, setDrafts] = useState<PreviewDraft[] | null>(null);

  // Plan-my-day scheduling panel (§9.9), opened with the eligible unscheduled items.
  const [scheduleItemIds, setScheduleItemIds] = useState<string[] | null>(null);
  const [digest, setDigest] = useState<string | null>(null);

  // A stable "now" for a render pass keeps date labels consistent across rows.
  const nowRef = useRef(new Date());
  const now = nowRef.current;

  const loadBoard = useCallback(async () => {
    try {
      const res = await fetch(`/api/command/board?timezone=${encodeURIComponent(timezone)}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { board: CommandBoardData };
      setBoard(data.board ?? EMPTY_BOARD);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [timezone]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  // Morning re-entry digest (§9.5): a calm one-liner on the first open of the day.
  // The client-only variant reports the current plate; the richer "since last
  // visit" delta arrives once a server last_visit timestamp lands (Phase 12).
  useEffect(() => {
    if (loading || loadError) return;
    if (!isFirstOpenOfDay(new Date())) return;
    setDigest(
      computeReentryDigest({
        board,
        eventsSinceLastVisit: [],
        newlyUrgent: [],
        movedByRollover: [],
        isFirstOpenOfDay: true,
      }),
    );
    // Intentionally runs once after the first successful load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, loadError]);

  const summary: CommandBoardSummary = useMemo(
    () => ({
      nowCount: board.now.length,
      todayCount: board.today.length,
      dueSoonCount: board.dueSoon.length,
      unsortedCount: board.unsorted.length,
    }),
    [board],
  );

  const itemCount = useMemo(
    () => Object.values(board).reduce((sum, list) => sum + list.length, 0),
    [board],
  );

  const selectedItem = useMemo<ResponsibilityItem | null>(() => {
    if (!selectedId) return null;
    const lists: ResponsibilityItem[][] = Object.values(board);
    for (const list of lists) {
      const found = list.find((i) => i.id === selectedId);
      if (found) return found;
    }
    return null;
  }, [board, selectedId]);

  async function handleIntake(text: string) {
    setSubmitting(true);
    setUsageNotice(null);
    try {
      const res = await fetch('/api/command/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputMode: 'text',
          text,
          timezone,
          clientNow: new Date().toISOString(),
        }),
      });

      if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        setUsageNotice({
          message:
            body.message ??
            "You have used today's free cleanups. You can still add responsibilities manually.",
          resetAt: body.resetAt,
        });
        return;
      }
      if (!res.ok) throw new Error(String(res.status));

      const data = (await res.json()) as CommandIntakeResponse;
      setIntakeRunId(data.intakeRunId);
      setPreviewSummary(data.summary);
      setDrafts(data.previewItems.map((item) => ({ ...item, accepted: true })));
    } catch {
      setUsageNotice({
        message: 'Planevo could not read that just now. Try again, or add it manually.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  function updateDraft(index: number, patch: Partial<PreviewDraft>) {
    setDrafts((prev) =>
      prev ? prev.map((d, i) => (i === index ? { ...d, ...patch } : d)) : prev,
    );
  }

  async function confirmDrafts() {
    if (!intakeRunId || !drafts) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/command/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intakeRunId,
          timezone,
          items: drafts.map((d) => ({
            title: d.title,
            description: d.description,
            type: d.type,
            dueAt: d.dueAt,
            startAt: d.startAt,
            endAt: d.endAt,
            priority: d.priority,
            whyItMatters: d.whyItMatters,
            accepted: d.accepted,
          })),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { board: CommandBoardData };
      nowRef.current = new Date();
      setBoard(data.board ?? EMPTY_BOARD);
      discardPreview();
    } catch {
      // Keep the preview open so the user can retry; surface a gentle notice.
      setUsageNotice({ message: 'Could not save those. Try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  function discardPreview() {
    setDrafts(null);
    setIntakeRunId(null);
    setPreviewSummary('');
  }

  // Voice capture funnels into the SAME preview flow as text intake (§9.6).
  function handleVoicePreview(
    voiceIntakeRunId: string,
    summary: string,
    previewItems: ExtractedResponsibility[],
  ) {
    setUsageNotice(null);
    setIntakeRunId(voiceIntakeRunId);
    setPreviewSummary(summary);
    setDrafts(previewItems.map((item) => ({ ...item, accepted: true })));
  }

  // "Plan my day" eligibility: active, unscheduled responsibilities across the
  // actionable sections (§9.9 — items with no calendar block yet).
  const eligibleScheduleItemIds = useMemo(() => {
    const pools = [board.now, board.today, board.dueSoon, board.onMyPlate];
    return pools
      .flat()
      .filter((i) => i.status === 'active' && !i.calendarEventId)
      .map((i) => i.id);
  }, [board]);

  async function toggleDone(item: ResponsibilityItem) {
    const nextStatus = item.status === 'done' ? 'active' : 'done';
    // Optimistic: flip status locally, then reconcile from the server board.
    setBoard((prev) => reflagItem(prev, item.id, nextStatus));
    try {
      const res = await fetch(`/api/command/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error(String(res.status));
      await loadBoard();
    } catch {
      // Roll back on failure.
      setBoard((prev) => reflagItem(prev, item.id, item.status));
    }
  }

  const preview = drafts !== null;
  const scheduling = scheduleItemIds !== null;
  const dimBackground = preview || scheduling;
  const isEmpty = !loading && !loadError && itemCount === 0;
  const summaryText = summarySentence(summary);

  return (
    <div className="pt-8 sm:pt-10">
      {/* Arrival moment — typography and space only (§26.1). */}
      <header className="mb-5 flex items-start justify-between gap-3 px-2">
        <div className="min-w-0">
          <h1 className="font-[var(--font-serif)] text-[30px] leading-tight text-[var(--color-ink)] sm:text-[34px]">
            {greeting(now)}
            {profile?.userName ? `, ${profile.userName}` : ''}
          </h1>
          {digest && !isEmpty ? (
            <p className="mt-1 flex items-center gap-2 text-[14px] text-[var(--color-ink-soft)]">
              <span>{digest}</span>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setDigest(null)}
                className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink-soft)]"
              >
                ×
              </button>
            </p>
          ) : (
            summaryText && !isEmpty && (
              <p className="mt-1 text-[14px] text-[var(--color-ink-soft)]">{summaryText}</p>
            )
          )}
        </div>

        {/* Plan my day — header-level scheduling bridge action (§9.9). */}
        {FEATURES.COMMAND_SCHEDULE_BRIDGE &&
          !isEmpty &&
          !dimBackground &&
          eligibleScheduleItemIds.length > 0 && (
            <button
              type="button"
              onClick={() => setScheduleItemIds(eligibleScheduleItemIds)}
              className="flex-none rounded-full border border-[var(--glass-border)] bg-[var(--color-surface-raised)] px-3 py-1.5 text-[13px] font-medium text-[var(--color-ink-soft)] transition-colors hover:border-[var(--color-accent-warm)]/40 hover:text-[var(--color-ink)]"
            >
              Plan my day
            </button>
          )}
      </header>

      {/* Capture band — dominant when empty, a modest bar when populated. */}
      <div className={dimBackground ? 'pointer-events-none opacity-40 transition-opacity' : ''}>
        <CommandCapture
          variant={isEmpty ? 'hero' : 'bar'}
          submitting={submitting}
          onSubmit={handleIntake}
          onVoicePreview={handleVoicePreview}
          onVoiceError={(message) => setUsageNotice({ message })}
        />
      </div>

      {usageNotice && (
        <CommandUsageBanner
          message={usageNotice.message}
          resetAt={usageNotice.resetAt}
          onUpgrade={() => {
            window.location.href = '/pricing';
          }}
        />
      )}

      {/* Preview dominates when open. */}
      <AnimatePresence>
        {preview && drafts && (
          <motion.div
            key="preview"
            className="mt-4"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
          >
            <CommandPreviewPanel
              summary={previewSummary}
              drafts={drafts}
              now={now}
              submitting={submitting}
              onChange={updateDraft}
              onConfirm={confirmDrafts}
              onDiscard={discardPreview}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plan-my-day scheduling panel dominates when open (same pattern as preview). */}
      <AnimatePresence>
        {scheduling && scheduleItemIds && (
          <motion.div
            key="schedule"
            className="mt-4"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
          >
            <CommandSchedulePanel
              itemIds={scheduleItemIds}
              onScheduled={() => {
                setScheduleItemIds(null);
                void loadBoard();
              }}
              onClose={() => setScheduleItemIds(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board / empty / loading — dimmed while a panel is open. */}
      {!dimBackground && (
        <div>
          {loading && <CommandBoardSkeleton />}
          {loadError && (
            <p className="mt-8 px-2 text-[14px] text-[var(--color-ink-soft)]">
              Could not load your board. Refresh to try again — your responsibilities are safe.
            </p>
          )}
          {isEmpty && <CommandEmptyState />}

          {!loading && !loadError && itemCount > 0 && (
            <>
              <div className="mt-6">
                <CommandBrunoActions summary={summary} selectedItem={selectedItem} />
              </div>
              {FEATURES.COMMAND_SOURCE_SYNC && (
                <div className="mt-4">
                  <CommandSourcePanel onConverted={loadBoard} />
                </div>
              )}
              <CommandBoard
                board={board}
                now={now}
                selectedId={selectedId}
                onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))}
                onToggleDone={toggleDone}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Immutably move an item to a new lifecycle status within the board snapshot. */
function reflagItem(
  board: CommandBoardData,
  id: string,
  status: ResponsibilityItem['status'],
): CommandBoardData {
  const next: CommandBoardData = {
    now: [],
    today: [],
    dueSoon: [],
    onMyPlate: [],
    unsorted: [],
    waiting: [],
    done: [],
  };
  for (const [section, list] of Object.entries(board) as [
    keyof CommandBoardData,
    ResponsibilityItem[],
  ][]) {
    next[section] = list.map((i) => (i.id === id ? { ...i, status } : i));
  }
  return next;
}
