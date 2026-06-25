'use client';

import type { Task } from '@/types/tasks';
import type { CalendarEvent } from '@/types/calendar';
import type { CanvasAssignmentPreview } from '@/lib/dashboard/home-preview';
import type { DashboardMode, ParsedScheduleBlock, WorkItem } from '@/lib/dashboard/types';
import { TodayPreviewCard } from './TodayPreviewCard';
import { ComingUpPreviewCard } from './ComingUpPreviewCard';

interface DashboardHomePreviewProps {
  mode: DashboardMode;
  selectedDate: Date;
  tasks: Task[];
  parsedSchedule: ParsedScheduleBlock[] | null;
  weekEvents: CalendarEvent[];
  canvasAssignments: CanvasAssignmentPreview[];
  workItems: WorkItem[];
  onViewTask: (task: Task) => void;
  onViewEvent: (event: CalendarEvent) => void;
  onToggleComplete: (taskId: string, completed: boolean) => void;
}

export function DashboardHomePreview({
  mode,
  selectedDate,
  tasks,
  parsedSchedule,
  weekEvents,
  canvasAssignments,
  workItems,
  onViewTask,
  onViewEvent,
  onToggleComplete,
}: DashboardHomePreviewProps) {
  if (mode === 'onboarding') return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-6">
      <TodayPreviewCard
        selectedDate={selectedDate}
        tasks={tasks}
        parsedSchedule={parsedSchedule}
        weekEvents={weekEvents}
        mode={mode}
        onViewTask={onViewTask}
        onToggleComplete={onToggleComplete}
      />
      <ComingUpPreviewCard
        tasks={tasks}
        weekEvents={weekEvents}
        canvasAssignments={canvasAssignments}
        workItems={workItems}
        onViewTask={onViewTask}
        onViewEvent={onViewEvent}
      />
    </div>
  );
}
