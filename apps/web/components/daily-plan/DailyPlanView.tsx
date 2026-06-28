'use client';

import { useCallback, useMemo, useOptimistic, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
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
import { useBruno, useRegisterBrunoContext } from '@/components/bruno/BrunoProvider';
import { PlanHeader } from './PlanHeader';
import { DailyPlanTabs, type DailyPlanTabId } from './DailyPlanTabs';

interface DailyPlanViewProps {
  initialData: DayPlanPageData;
}

type BlockOptimisticAction =
  | { type: 'accept'; blockId: string }
  | { type: 'reject'; blockId: string }
  | { type: 'accept_all' };

function applyBlockOptimistic(
  blocks: DayPlanBlock[],
  action: BlockOptimisticAction
): DayPlanBlock[] {
  switch (action.type) {
    case 'accept_all':
      return blocks.map((b) =>
        b.isAiSuggested && b.status === 'pending'
          ? { ...b, status: 'accepted' }
          : b
      );
    case 'accept':
      return blocks.map((b) =>
        b.id === action.blockId ? { ...b, status: 'accepted' } : b
      );
    case 'reject':
      return blocks.map((b) =>
        b.id === action.blockId ? { ...b, status: 'rejected' } : b
      );
    default: {
      const _exhaustive: never = action;
      return blocks;
    }
  }
}

function rebuildSnapshot(blocks: DayPlanBlock[], base: DayPlanSnapshot): DayPlanSnapshot {
  const pendingCount = blocks.filter(
    (b) => b.isAiSuggested && b.status === 'pending'
  ).length;
  const acceptedCount = blocks.filter(
    (b) => b.isAiSuggested && (b.status === 'accepted' || b.status === 'confirmed')
  ).length;

  return {
    ...base,
    blocks,
    pendingCount,
    acceptedCount,
  };
}

export function DailyPlanView({ initialData }: DailyPlanViewProps) {
  const router = useRouter();
  const { openBruno } = useBruno();
  const [isPending, startTransition] = useTransition();
  const [pendingBlockIds, setPendingBlockIds] = useState<Set<string>>(new Set());
  const [acceptAllPending, setAcceptAllPending] = useState(false);
  const [activeTab, setActiveTab] = useState<DailyPlanTabId>('plan');
  const [selectedItem, setSelectedItem] = useState<SourceListItem | null>(null);

  const [optimisticBlocks, setOptimisticBlocks] = useOptimistic(
    initialData.snapshot.blocks,
    applyBlockOptimistic
  );

  const optimisticSnapshot = useMemo(
    () => rebuildSnapshot(optimisticBlocks, initialData.snapshot),
    [optimisticBlocks, initialData.snapshot]
  );

  const firstFocusBlock = optimisticSnapshot.blocks.find(
    (b) => b.isAiSuggested && b.type === 'focus'
  );

  const brunoPayload = useMemo(
    () => ({
      activeTab,
      selectedItem,
      blocks: optimisticSnapshot.blocks,
      overflowCount: initialData.overflowCount,
      brunoMessage: initialData.brunoMessage,
    }),
    [
      activeTab,
      selectedItem,
      optimisticSnapshot.blocks,
      initialData.overflowCount,
      initialData.brunoMessage,
    ]
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
        : 'Plan is already confirmed.'
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
          : 'Got it — Bruno will adjust next time.'
      );
      dispatchPlanevoCalendarEventsChanged();
      refresh();
    },
    [refresh, setOptimisticBlocks]
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
    [router]
  );

  const handleAdjust = useCallback(() => {
    openBruno({
      source: 'daily-plan',
      page: '/dashboard/daily-plan',
      label: 'Daily Plan',
      payload: {
        prompt: "Help me adjust today's plan. Here is my current schedule.",
        blocks: optimisticSnapshot.blocks,
        activeTab,
        selectedItem,
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
          selectedItem: item,
          blocks: optimisticSnapshot.blocks,
        },
      });
    },
    [openBruno, activeTab, optimisticSnapshot.blocks]
  );

  const blockProcessing = useCallback(
    (blockId: string) => pendingBlockIds.has(blockId),
    [pendingBlockIds]
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
        onStartFirstBlock={() => firstFocusBlock && handleStartBlock(firstFocusBlock)}
        onAcceptAll={handleAcceptAll}
        onAdjust={handleAdjust}
        onRegenerate={handleRegenerate}
        processing={busy}
        firstBlockTitle={firstFocusBlock?.title}
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
