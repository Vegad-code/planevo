import type { Dispatch, SetStateAction } from 'react';
import type { ScheduleBlock } from '@/lib/ai/agentic-scheduler';
import type { CalendarEvent } from '@/types/calendar';
import type { Task } from '@/types/tasks';
import type { CanvasAssignmentPreview } from '@/lib/dashboard/home-preview';
import type { DailyMetric, MomentumStats } from '@/lib/stats';

export type DashboardMode = 'onboarding' | 'needs_plan' | 'active_day' | 'caught_up';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export interface DashboardConnections {
  canvasConnected: boolean;
  canvasDueCount: number;
  googleConnected: boolean;
  googleLastSyncedAt: string | null;
  googleSyncFrequency: string;
}

export interface WorkItem {
  id: string;
  provider: string;
  title: string | null;
  description?: string | null;
  due_date?: string | null;
  url?: string | null;
  completed?: boolean;
}

export interface ParsedScheduleBlock extends Omit<ScheduleBlock, 'startTime' | 'endTime'> {
  startTime: Date;
  endTime: Date;
}

export interface NextAction extends ParsedScheduleBlock {
  timingStatus: 'NOW' | 'UP NEXT';
}

export type AgendaItemType = 'task' | 'event' | 'work';

export interface AgendaItem {
  id: string;
  type: AgendaItemType;
  provider?: string;
  title: string;
  description?: string;
  date: Date;
  actionText: string;
  raw: Task | CalendarEvent | WorkItem;
}

export type PriorityAlertKind = 'overdue_task' | 'canvas_due' | 'stale_sync';

export interface PriorityAlert {
  id: string;
  kind: PriorityAlertKind;
  title: string;
  subtitle: string;
  href?: string;
  onClick?: () => void;
}

export interface SetupStep {
  id: string;
  label: string;
  completed: boolean;
  href: string;
}

export interface DashboardData {
  userName: string;
  timeOfDay: TimeOfDay;
  tasks: Task[];
  workItems: WorkItem[];
  canvasAssignments: CanvasAssignmentPreview[];
  schedule: ScheduleBlock[] | null;
  thisWeekEvents: CalendarEvent[];
  insight: string;
  insightLoading: boolean;
  connections: DashboardConnections;
  momentumStats: MomentumStats;
  dailyMetrics: DailyMetric[];
  loading: boolean;
  parsedSchedule: ParsedScheduleBlock[] | null;
  nextAction: NextAction | null;
  upNextBlocks: ParsedScheduleBlock[];
  upcomingAgenda: AgendaItem[];
  openTasks: Task[];
  unscheduledTasks: Task[];
  mode: DashboardMode;
  priorityAlerts: PriorityAlert[];
  setupSteps: SetupStep[];
  setThisWeekEvents: Dispatch<SetStateAction<CalendarEvent[]>>;
  setTasks: Dispatch<SetStateAction<Task[]>>;
  refresh: () => Promise<void>;
}
