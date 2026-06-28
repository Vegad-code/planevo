'use client';

import { useCallback, useState } from 'react';
import type { DayPlanSnapshot } from '@/lib/plan/day-plan';
import type { DayPlanSourcesData, SourceListItem } from '@/lib/plan/source-items';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { DayTimeline } from './DayTimeline';
import { OverflowStrip } from './OverflowStrip';
import { SourceTabPanel } from './sources/SourceTabPanel';
import { SourceItemDetailSheet } from './sources/SourceItemDetailSheet';
import type { DayPlanBlock } from '@/lib/plan/day-plan';

export type DailyPlanTabId =
  | 'plan'
  | 'canvas'
  | 'calendar'
  | 'notion'
  | 'slack'
  | 'linear';

interface DailyPlanTabsProps {
  snapshot: DayPlanSnapshot;
  sources: DayPlanSourcesData;
  overflowCount: number;
  processing: boolean;
  blockProcessing?: (blockId: string) => boolean;
  activeTab: DailyPlanTabId;
  onActiveTabChange: (tab: DailyPlanTabId) => void;
  selectedItem: SourceListItem | null;
  onSelectedItemChange: (item: SourceListItem | null) => void;
  onBlockAccept: (blockId: string) => void;
  onBlockReject: (blockId: string) => void;
  onBlockStart: (block: DayPlanBlock) => void;
  onOverflowReview: () => void;
  onAskBrunoAboutItem: (item: SourceListItem) => void;
}

interface TabConfig {
  id: DailyPlanTabId;
  label: string;
  count?: number;
  connected?: boolean;
}

function tabLabel(config: TabConfig): string {
  if (config.count && config.count > 0) {
    return `${config.label} · ${config.count}`;
  }
  return config.label;
}

export function DailyPlanTabs({
  snapshot,
  sources,
  overflowCount,
  processing,
  blockProcessing,
  activeTab,
  onActiveTabChange,
  selectedItem,
  onSelectedItemChange,
  onBlockAccept,
  onBlockReject,
  onBlockStart,
  onOverflowReview,
  onAskBrunoAboutItem,
}: DailyPlanTabsProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  const tabs: TabConfig[] = [
    { id: 'plan', label: 'Your Plan' },
    {
      id: 'canvas',
      label: 'Canvas',
      count: sources.canvas.length,
      connected: sources.connections.canvas,
    },
    {
      id: 'calendar',
      label: 'Calendar',
      count: sources.calendar.length,
      connected: sources.connections.google,
    },
    {
      id: 'notion',
      label: 'Notion',
      count: sources.notion.length,
      connected: sources.connections.notion,
    },
    {
      id: 'slack',
      label: 'Slack',
      count: sources.slack.length,
      connected: sources.connections.slack,
    },
    {
      id: 'linear',
      label: 'Linear',
      count: sources.linear.length,
      connected: sources.connections.linear,
    },
  ];

  const handleSelectItem = useCallback(
    (item: SourceListItem) => {
      onSelectedItemChange(item);
      setDetailOpen(true);
    },
    [onSelectedItemChange]
  );

  const handleDetailOpenChange = useCallback(
    (open: boolean) => {
      setDetailOpen(open);
      if (!open) {
        onSelectedItemChange(null);
      }
    },
    [onSelectedItemChange]
  );

  const handleAskBruno = useCallback(
    (item: SourceListItem) => {
      setDetailOpen(false);
      onSelectedItemChange(null);
      onAskBrunoAboutItem(item);
    },
    [onAskBrunoAboutItem, onSelectedItemChange]
  );

  return (
    <>
      <Tabs
        value={activeTab}
        onValueChange={(value) => onActiveTabChange(value as DailyPlanTabId)}
        className="w-full"
      >
        <div className="overflow-x-auto -mx-1 px-1 pb-1 scrollbar-none">
          <TabsList className="inline-flex h-auto w-max min-w-full justify-start gap-1 p-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  'shrink-0 px-3 py-2 text-[13px]',
                  tab.id !== 'plan' &&
                    tab.connected &&
                    tab.count &&
                    tab.count > 0 &&
                    'data-[state=inactive]:text-ink'
                )}
              >
                {tabLabel(tab)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="plan" className="mt-6 focus-visible:outline-none">
          <DayTimeline
            snapshot={snapshot}
            onBlockAccept={onBlockAccept}
            onBlockReject={onBlockReject}
            onBlockStart={onBlockStart}
            processing={processing}
            blockProcessing={blockProcessing}
          />
          <OverflowStrip count={overflowCount} onReview={onOverflowReview} />
        </TabsContent>

        <TabsContent value="canvas" className="mt-6 focus-visible:outline-none">
          <SourceTabPanel
            provider="canvas"
            connected={sources.connections.canvas}
            items={sources.canvas}
            onSelectItem={handleSelectItem}
          />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6 focus-visible:outline-none">
          <SourceTabPanel
            provider="google_calendar"
            connected={sources.connections.google}
            items={sources.calendar}
            onSelectItem={handleSelectItem}
          />
        </TabsContent>

        <TabsContent value="notion" className="mt-6 focus-visible:outline-none">
          <SourceTabPanel
            provider="notion"
            connected={sources.connections.notion}
            items={sources.notion}
            onSelectItem={handleSelectItem}
          />
        </TabsContent>

        <TabsContent value="slack" className="mt-6 focus-visible:outline-none">
          <SourceTabPanel
            provider="slack"
            connected={sources.connections.slack}
            items={sources.slack}
            onSelectItem={handleSelectItem}
          />
        </TabsContent>

        <TabsContent value="linear" className="mt-6 focus-visible:outline-none">
          <SourceTabPanel
            provider="linear"
            connected={sources.connections.linear}
            items={sources.linear}
            onSelectItem={handleSelectItem}
          />
        </TabsContent>
      </Tabs>

      <SourceItemDetailSheet
        item={selectedItem}
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
        onAskBruno={handleAskBruno}
      />
    </>
  );
}
