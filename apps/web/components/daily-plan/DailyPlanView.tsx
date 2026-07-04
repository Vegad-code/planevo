'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Sparkle, Stack, WarningCircle } from '@phosphor-icons/react';
import type { DayPlanPageData } from '@/lib/plan/get-day-plan-data';
import type { DayPlanBlock, DayPlanSnapshot } from '@/lib/plan/day-plan';
import type { SourceListItem } from '@/lib/plan/source-items';
import {
  acceptDailyPlanAction,
  blockFeedbackAction,
  regenerateDailyPlanAction,
} from '@/lib/plan/actions';
import {
  dispatchPlanevoCalendarEventsChanged,
  dispatchPlanevoTasksChanged,
} from '@/lib/client/planevo-events';
import {
  useBruno,
  useRegisterBrunoContext,
} from '@/components/bruno/BrunoProvider';
import { PlanHeader } from './PlanHeader';
import { DailyPlanTabs, type DailyPlanTabId } from './DailyPlanTabs';
import { SmoothSurface } from './SmoothSurface';

interface DailyPlanViewProps {
  initialData: DayPlanPageData;
}

type BlockOptimisticAction =
  | { type: 'accept'; blockId: string }
  | { type: 'reject'; blockId: string }
  | { type: 'accept_all' };

function applyBlockOptimistic(
  blocks: DayPlanBlock[],
  action: BlockOptimisticAction,
): DayPlanBlock[] {
  switch (action.type) {
    case 'accept_all':
      return blocks.map((b) =>
        b.isAiSuggested && b.status === 'pending'
          ? { ...b, status: 'accepted' }
          : b,
      );
    case 'accept':
      return blocks.map((b) =>
        b.id === action.blockId ? { ...b, status: 'accepted' } : b,
      );
    case 'reject':
      return blocks.map((b) =>
        b.id === action.blockId ? { ...b, status: 'rejected' } : b,
      );
    default: {
      const _exhaustive: never = action;
      return blocks;
    }
  }
}

function rebuildSnapshot(
  blocks: DayPlanBlock[],
  base: DayPlanSnapshot,
): DayPlanSnapshot {
  const pendingCount = blocks.filter(
    (b) => b.isAiSuggested && b.status === 'pending',
  ).length;
  const acceptedCount = blocks.filter(
    (b) =>
      b.isAiSuggested && (b.status === 'accepted' || b.status === 'confirmed'),
  ).length;

  return {
    ...base,
    blocks,
    pendingCount,
    acceptedCount,
  };
}

function truncateContextText(
  value: string | null | undefined,
  maxLength = 120,
) {
  if (!value) return null;
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function summarizeBlockForBruno(block: DayPlanBlock) {
  return {
    id: block.id,
    title: truncateContextText(block.title, 90),
    time: block.time,
    duration: block.duration,
    type: block.type,
    status: block.status,
    isAiSuggested: block.isAiSuggested,
    isFixed: block.isFixed,
    linkedTaskId: block.linkedTaskId,
    source: block.source,
    confidence: block.confidence,
    confidenceFactors: block.confidenceFactors.slice(0, 4),
    sourceIds: block.sourceIds.slice(0, 4),
  };
}

function summarizeBlocksForBruno(blocks: DayPlanBlock[]) {
  return {
    count: blocks.length,
    pendingCount: blocks.filter(
      (block) => block.isAiSuggested && block.status === 'pending',
    ).length,
    acceptedCount: blocks.filter(
      (block) =>
        block.isAiSuggested &&
        (block.status === 'accepted' || block.status === 'confirmed'),
    ).length,
    visible: blocks.slice(0, 8).map(summarizeBlockForBruno),
  };
}

function summarizeSourceItemForBruno(item: SourceListItem | null) {
  if (!item) return null;
  return {
    id: item.id,
    provider: item.provider,
    title: truncateContextText(item.title, 120),
    dueAt: item.dueAt,
    startAt: item.startAt,
    endAt: item.endAt,
    meta: truncateContextText(item.meta, 80),
  };
}

type SourceInfluenceRow = DayPlanPageData['sourceInfluence'][number];

function sourceInfluenceLabel(source: SourceInfluenceRow['source']): string {
  switch (source) {
    case 'google_calendar':
      return 'Calendar';
    case 'canvas':
      return 'Canvas';
    case 'notion':
      return 'Notion';
    case 'slack':
      return 'Slack';
    case 'linear':
      return 'Linear';
    default:
      return 'Tasks';
  }
}

function buildAutomationSummary(rows: SourceInfluenceRow[]): string {
  const activeSources = rows
    .filter((row) => row.totalCandidates > 0)
    .sort((a, b) => b.totalCandidates - a.totalCandidates)
    .slice(0, 3)
    .map((row) => sourceInfluenceLabel(row.source));

  if (activeSources.length === 0) {
    return 'Bruno is watching your connected work sources and will keep this plan current.';
  }

  return `Bruno assembled this from ${activeSources.join(', ')} and your open tasks.`;
}

function AutomationSummary({
  rows,
  overflowCount,
  pendingCount,
  isBuilding,
  onOverflowReview,
  onAdjust,
}: {
  rows: SourceInfluenceRow[];
  overflowCount: number;
  pendingCount: number;
  isBuilding: boolean;
  onOverflowReview: () => void;
  onAdjust: () => void;
}) {
  const activeRows = rows
    .filter((row) => row.totalCandidates > 0)
    .sort((a, b) => b.totalCandidates - a.totalCandidates)
    .slice(0, 4);

  return (
    <SmoothSurface
      cornerRadius={24}
      cornerSmoothing={0.88}
      className="mb-5 border border-line bg-[var(--color-surface-raised)] shadow-[0_18px_50px_rgba(26,20,13,0.07)]"
    >
      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-honey-soft)] text-[var(--color-honey-deep)] dark:bg-[var(--color-surface-muted)] dark:text-[var(--color-honey)]">
            {isBuilding ? (
              <Sparkle weight="fill" className="h-4 w-4" />
            ) : (
              <Stack weight="bold" className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0">
            <p className="m-0 text-[15px] font-semibold leading-6 text-ink">
              {buildAutomationSummary(rows)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {activeRows.length > 0 ? (
                activeRows.map((row) => (
                  <span
                    key={row.source}
                    className="inline-flex min-h-8 items-center rounded-full border border-line bg-[var(--color-surface-muted)] px-3 text-xs font-medium text-[var(--color-ink-soft)]"
                  >
                    {sourceInfluenceLabel(row.source)} {row.plannedCount}/
                    {row.totalCandidates}
                  </span>
                ))
              ) : (
                <span className="inline-flex min-h-8 items-center rounded-full border border-line bg-[var(--color-surface-muted)] px-3 text-xs font-medium text-[var(--color-ink-soft)]">
                  Awaiting source sync
                </span>
              )}
              {pendingCount > 0 && (
                <span className="inline-flex min-h-8 items-center rounded-full border border-line bg-[var(--color-surface-muted)] px-3 text-xs font-medium text-[var(--color-ink-soft)]">
                  {pendingCount} pending review
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {overflowCount > 0 && (
            <button
              type="button"
              onClick={onOverflowReview}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line-strong bg-transparent px-4 text-sm font-semibold text-ink transition hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            >
              <WarningCircle weight="bold" className="h-4 w-4" />
              Review {overflowCount} open
            </button>
          )}
          <button
            type="button"
            onClick={onAdjust}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-paper transition hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          >
            <Sparkle weight="fill" className="h-4 w-4" />
            Tune plan
          </button>
        </div>
      </div>
    </SmoothSurface>
  );
}

export function DailyPlanView({ initialData }: DailyPlanViewProps) {
  const router = useRouter();
  const { openBruno } = useBruno();
  const [isPending, startTransition] = useTransition();
  const [pendingBlockIds, setPendingBlockIds] = useState<Set<string>>(
    new Set(),
  );
  const [acceptAllPending, setAcceptAllPending] = useState(false);
  const [activeTab, setActiveTab] = useState<DailyPlanTabId>('plan');
  const [selectedItem, setSelectedItem] = useState<SourceListItem | null>(null);

  const [optimisticBlocks, setOptimisticBlocks] = useOptimistic(
    initialData.snapshot.blocks,
    applyBlockOptimistic,
  );

  const optimisticSnapshot = useMemo(
    () => rebuildSnapshot(optimisticBlocks, initialData.snapshot),
    [optimisticBlocks, initialData.snapshot],
  );

  const firstFocusBlock = optimisticSnapshot.blocks.find(
    (b) => b.isAiSuggested && b.type === 'focus',
  );

  const brunoPayload = useMemo(
    () => ({
      activeTab,
      selectedItem: summarizeSourceItemForBruno(selectedItem),
      plan: summarizeBlocksForBruno(optimisticSnapshot.blocks),
      overflowCount: initialData.overflowCount,
      overflowItems: initialData.overflowItems.slice(0, 8).map((item) => ({
        id: item.candidateId,
        source: item.source,
        title: truncateContextText(item.title, 100),
        reason: truncateContextText(item.reason, 120),
      })),
      capacity: initialData.capacity,
      sourceInfluence: initialData.sourceInfluence,
      brunoMessage: truncateContextText(initialData.brunoMessage, 220),
    }),
    [
      activeTab,
      selectedItem,
      optimisticSnapshot.blocks,
      initialData.overflowCount,
      initialData.overflowItems,
      initialData.capacity,
      initialData.sourceInfluence,
      initialData.brunoMessage,
    ],
  );

  useRegisterBrunoContext({
    source: 'daily-plan',
    page: '/dashboard/daily-plan',
    label: 'Daily Plan',
    payload: brunoPayload,
  });

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  // Refresh when Bruno (or any other surface) mutates tasks or calendar
  // events, so executed actions appear without a manual reload.
  useEffect(() => {
    const handleExternalChange = () => refresh();
    window.addEventListener(
      'planevo:calendar-events-changed',
      handleExternalChange,
    );
    window.addEventListener('planevo:tasks-changed', handleExternalChange);
    return () => {
      window.removeEventListener(
        'planevo:calendar-events-changed',
        handleExternalChange,
      );
      window.removeEventListener('planevo:tasks-changed', handleExternalChange);
    };
  }, [refresh]);

  const handleAcceptAll = useCallback(async () => {
    setAcceptAllPending(true);
    startTransition(() => {
      setOptimisticBlocks({ type: 'accept_all' });
    });

    const result = await acceptDailyPlanAction();
    setAcceptAllPending(false);

    if (!result.success) {
      toast.error(result.error);
      refresh();
      return;
    }

    toast.success(
      result.data.accepted > 0
        ? `Locked in ${result.data.accepted} block${result.data.accepted === 1 ? '' : 's'}.`
        : 'Plan is already confirmed.',
    );
    dispatchPlanevoCalendarEventsChanged();
    dispatchPlanevoTasksChanged();
    refresh();
  }, [refresh, setOptimisticBlocks]);

  const handleBlockFeedback = useCallback(
    async (blockId: string, action: 'accept' | 'wrong_time') => {
      setPendingBlockIds((prev) => new Set(prev).add(blockId));
      startTransition(() => {
        setOptimisticBlocks({
          type: action === 'accept' ? 'accept' : 'reject',
          blockId,
        });
      });

      const result = await blockFeedbackAction({ blockId, action });
      setPendingBlockIds((prev) => {
        const next = new Set(prev);
        next.delete(blockId);
        return next;
      });

      if (!result.success) {
        toast.error(result.error);
        refresh();
        return;
      }

      toast.success(
        action === 'accept'
          ? 'Block confirmed.'
          : 'Got it. Bruno will adjust next time.',
      );
      dispatchPlanevoCalendarEventsChanged();
      refresh();
    },
    [refresh, setOptimisticBlocks],
  );

  const handleRegenerate = useCallback(async () => {
    setAcceptAllPending(true);
    const result = await regenerateDailyPlanAction();
    setAcceptAllPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(result.data.message || 'Plan regenerated.');
    dispatchPlanevoCalendarEventsChanged();
    dispatchPlanevoTasksChanged();
    refresh();
  }, [refresh]);

  const handleStartBlock = useCallback(
    (block: DayPlanBlock) => {
      if (block.linkedTaskId) {
        router.push(`/dashboard/deep-work?taskId=${block.linkedTaskId}`);
        return;
      }
      router.push('/dashboard/deep-work');
    },
    [router],
  );

  const handleAdjust = useCallback(() => {
    openBruno({
      source: 'daily-plan',
      page: '/dashboard/daily-plan',
      label: 'Daily Plan',
      payload: {
        prompt: "Help me adjust today's plan. Here is my current schedule.",
        plan: summarizeBlocksForBruno(optimisticSnapshot.blocks),
        activeTab,
        selectedItem: summarizeSourceItemForBruno(selectedItem),
      },
    });
  }, [openBruno, optimisticSnapshot.blocks, activeTab, selectedItem]);

  const handleOverflowReview = useCallback(() => {
    openBruno({
      source: 'daily-plan',
      page: '/dashboard/daily-plan',
      label: 'Daily Plan - Overflow',
      payload: {
        prompt: `${initialData.overflowCount} items didn't fit in today's plan. Help me decide what to move to tomorrow or reschedule.`,
        activeTab,
      },
    });
  }, [openBruno, initialData.overflowCount, activeTab]);

  const handleAskBrunoAboutItem = useCallback(
    (item: SourceListItem) => {
      const dueLine = item.dueAt
        ? ` Due ${format(new Date(item.dueAt), 'MMM d, h:mm a')}.`
        : item.startAt
          ? ` Scheduled ${format(new Date(item.startAt), 'MMM d, h:mm a')}.`
          : '';

      openBruno({
        source: 'daily-plan',
        page: '/dashboard/daily-plan',
        label: 'Daily Plan',
        payload: {
          prompt: `Help me with this item: "${item.title}".${dueLine}`,
          activeTab,
          selectedItem: summarizeSourceItemForBruno(item),
          plan: summarizeBlocksForBruno(optimisticSnapshot.blocks),
        },
      });
    },
    [openBruno, activeTab, optimisticSnapshot.blocks],
  );

  const blockProcessing = useCallback(
    (blockId: string) => pendingBlockIds.has(blockId),
    [pendingBlockIds],
  );

  const busy = acceptAllPending || isPending;

  return (
    <div className="animate-fade-in pb-20">
      <PlanHeader
        userName={initialData.userName}
        brunoMessage={initialData.brunoMessage}
        isBuilding={initialData.isBuilding}
        hasPlan={initialData.hasPlan}
        pendingCount={optimisticSnapshot.pendingCount}
        capacity={initialData.capacity}
        onStartFirstBlock={() =>
          firstFocusBlock && handleStartBlock(firstFocusBlock)
        }
        onAcceptAll={handleAcceptAll}
        onAdjust={handleAdjust}
        onRegenerate={handleRegenerate}
        processing={busy}
        firstBlockTitle={firstFocusBlock?.title}
      />

      <AutomationSummary
        rows={initialData.sourceInfluence}
        overflowCount={initialData.overflowCount}
        pendingCount={optimisticSnapshot.pendingCount}
        isBuilding={initialData.isBuilding}
        onOverflowReview={handleOverflowReview}
        onAdjust={handleAdjust}
      />

      <DailyPlanTabs
        snapshot={optimisticSnapshot}
        sources={initialData.sources}
        overflowCount={initialData.overflowCount}
        processing={busy}
        blockProcessing={blockProcessing}
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        selectedItem={selectedItem}
        onSelectedItemChange={setSelectedItem}
        onBlockAccept={(id) => handleBlockFeedback(id, 'accept')}
        onBlockReject={(id) => handleBlockFeedback(id, 'wrong_time')}
        onBlockStart={handleStartBlock}
        onOverflowReview={handleOverflowReview}
        onAskBrunoAboutItem={handleAskBrunoAboutItem}
      />
    </div>
  );
}
