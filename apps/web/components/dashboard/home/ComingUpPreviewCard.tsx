'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Task } from '@/types/tasks';
import type { CalendarEvent } from '@/types/calendar';
import type { WorkItem } from '@/lib/dashboard/types';
import type { CanvasAssignmentPreview } from '@/lib/dashboard/home-preview';
import { formatDueLabel, getComingUpItems } from '@/lib/dashboard/home-preview';
import { PreviewItemRow } from './PreviewItemRow';

interface ComingUpPreviewCardProps {
  tasks: Task[];
  weekEvents: CalendarEvent[];
  canvasAssignments: CanvasAssignmentPreview[];
  workItems: WorkItem[];
  onViewTask: (task: Task) => void;
  onViewEvent: (event: CalendarEvent) => void;
}

export function ComingUpPreviewCard({
  tasks,
  weekEvents,
  canvasAssignments,
  workItems,
  onViewTask,
  onViewEvent,
}: ComingUpPreviewCardProps) {
  const router = useRouter();

  const items = useMemo(
    () =>
      getComingUpItems({
        tasks,
        events: weekEvents,
        canvasAssignments,
        workItems,
        limit: 8,
      }),
    [tasks, weekEvents, canvasAssignments, workItems]
  );

  return (
    <div className="glass-card rounded-[22px] p-6 min-w-0 h-full flex flex-col">
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="font-mono text-[11px] text-(--color-ink-soft) tracking-[0.16em] mb-1.5">
            NEXT 7 DAYS
          </div>
          <div className="font-serif text-[22px] text-(--color-ink)">
            Coming <em>up.</em>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard/calendar')}
          className="font-mono text-[11px] tracking-wide text-(--color-honey-deep) hover:text-(--color-honey) cursor-pointer bg-transparent border-none"
        >
          Calendar &rarr;
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-8 text-center">
          <p className="font-serif text-lg text-(--color-ink-soft) m-0">
            Nothing else on the horizon this week.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((item) => (
            <PreviewItemRow
              key={item.id}
              item={item}
              metaLabel={formatDueLabel(item.date)}
              onPress={() => {
                switch (item.kind) {
                  case 'task':
                    onViewTask(item.raw as Task);
                    break;
                  case 'event':
                    onViewEvent(item.raw as CalendarEvent);
                    break;
                  case 'canvas': {
                    const canvas = item.raw as CanvasAssignmentPreview;
                    if (canvas.html_url) {
                      window.open(canvas.html_url, '_blank', 'noopener,noreferrer');
                    }
                    break;
                  }
                  case 'work': {
                    const work = item.raw as WorkItem;
                    if (work.url) {
                      window.open(work.url, '_blank', 'noopener,noreferrer');
                    }
                    break;
                  }
                  default:
                    break;
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
