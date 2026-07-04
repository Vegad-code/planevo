import type {
  DailyPlanCandidateItem,
  DailyPlanPriority,
  DailyPlanSource,
} from './types';

type NativeTaskRow = {
  id: string;
  title: string;
  notes?: string | null;
  description?: string | null;
  due_date?: string | null;
  due_at?: string | null;
  estimated_minutes?: number | null;
  priority?: string | null;
  status?: string | null;
};

type SourceItemRow = {
  id: string;
  provider: string;
  title: string;
  description: string | null;
  due_date: string | null;
  url: string | null;
  raw_data: unknown;
  status?: string | null;
  completed?: boolean | null;
  priority?: string | null;
  item_type?: string | null;
};

type CanvasAssignmentRow = {
  id: string;
  name: string;
  description: string | null;
  due_at: string | null;
  html_url: string | null;
  course_name: string | null;
};

export interface NormalizeDailyPlanCandidatesInput {
  tasks: NativeTaskRow[];
  sourceItems: SourceItemRow[];
  canvasAssignments: CanvasAssignmentRow[];
  defaultDurationMinutes?: number;
}

const DONE_STATUSES = new Set([
  'done',
  'completed',
  'complete',
  'closed',
  'cancelled',
  'canceled',
  'archived',
]);

function positiveDuration(value: number | null | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  return fallback;
}

function normalizePriority(value: string | null | undefined): DailyPlanPriority {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'urgent') return 'urgent';
  if (normalized === 'high') return 'high';
  if (normalized === 'low') return 'low';
  return 'medium';
}

function isOpenSourceItem(item: SourceItemRow): boolean {
  if (item.completed) return false;
  const status = String(item.status ?? '').trim().toLowerCase();
  return !DONE_STATUSES.has(status);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function isSupportedProvider(provider: string): provider is DailyPlanSource {
  return (
    provider === 'canvas' ||
    provider === 'notion' ||
    provider === 'slack' ||
    provider === 'linear'
  );
}

function slackLooksActionable(title: string): boolean {
  return /(^|\s)@\w+/.test(title) || /\?/.test(title) || /\b(can you|please|today|asap|urgent)\b/i.test(title);
}

function signals(...values: Array<string | false | null | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value));
}

function mapTask(task: NativeTaskRow, defaultDurationMinutes: number): DailyPlanCandidateItem {
  const priority = normalizePriority(task.priority);
  const dueAt = task.due_date ?? task.due_at ?? null;

  return {
    id: `task:${task.id}`,
    rawSourceId: task.id,
    source: 'task',
    title: task.title,
    description: task.notes ?? task.description ?? null,
    dueAt,
    startAt: null,
    endAt: null,
    estimatedMinutes: positiveDuration(task.estimated_minutes, defaultDurationMinutes),
    priority,
    status: task.status ?? null,
    url: null,
    confidenceSignals: signals(
      'native_task',
      dueAt && 'due_date',
      priority !== 'medium' && `priority:${priority}`
    ),
  };
}

function mapCanvasAssignment(
  assignment: CanvasAssignmentRow,
  defaultDurationMinutes: number
): DailyPlanCandidateItem {
  return {
    id: `canvas:${assignment.id}`,
    rawSourceId: assignment.id,
    source: 'canvas',
    title: assignment.name,
    description: assignment.description,
    dueAt: assignment.due_at,
    startAt: null,
    endAt: null,
    estimatedMinutes: defaultDurationMinutes,
    priority: 'high',
    status: 'open',
    url: assignment.html_url,
    confidenceSignals: signals(
      'canvas_assignment',
      assignment.course_name && `course:${assignment.course_name}`,
      assignment.due_at && 'due_date',
      'priority:high'
    ),
  };
}

function mapSourceItem(
  item: SourceItemRow,
  defaultDurationMinutes: number
): DailyPlanCandidateItem | null {
  if (!isSupportedProvider(item.provider) || !isOpenSourceItem(item)) return null;

  const provider = item.provider;
  const raw = asRecord(item.raw_data);
  const dueAt = item.due_date;
  const sourceSignals = signals(
    provider === 'canvas' ? 'canvas_assignment' : 'work_integration',
    `provider:${provider}`,
    dueAt && 'due_date',
    item.item_type && `type:${item.item_type}`
  );

  let priority = normalizePriority(item.priority);
  if (provider === 'canvas' && priority === 'medium') {
    priority = 'high';
  }
  if (provider === 'slack') {
    priority = slackLooksActionable(item.title) ? 'medium' : 'low';
    if (slackLooksActionable(item.title)) sourceSignals.push('direct_ask');
    sourceSignals.push('communication');
  }

  const description =
    item.description ??
    asString(raw?.description) ??
    asString(raw?.text) ??
    null;

  return {
    id: `${provider}:${item.id}`,
    rawSourceId: item.id,
    source: provider,
    title: item.title,
    description,
    dueAt,
    startAt: null,
    endAt: null,
    estimatedMinutes: defaultDurationMinutes,
    priority,
    status: item.status ?? null,
    url: item.url,
    confidenceSignals: signals(
      ...sourceSignals,
      priority !== 'medium' && `priority:${priority}`
    ),
  };
}

export function normalizeDailyPlanCandidates({
  tasks,
  sourceItems,
  canvasAssignments,
  defaultDurationMinutes = 45,
}: NormalizeDailyPlanCandidatesInput): DailyPlanCandidateItem[] {
  const candidates: DailyPlanCandidateItem[] = [];

  candidates.push(...tasks.map((task) => mapTask(task, defaultDurationMinutes)));

  const mappedSourceItems = sourceItems
    .map((item) => mapSourceItem(item, defaultDurationMinutes))
    .filter((item): item is DailyPlanCandidateItem => item !== null);

  candidates.push(...mappedSourceItems);

  const hasCanvasSourceItems = mappedSourceItems.some((item) => item.source === 'canvas');
  if (!hasCanvasSourceItems) {
    candidates.push(
      ...canvasAssignments.map((assignment) =>
        mapCanvasAssignment(assignment, defaultDurationMinutes)
      )
    );
  }

  return candidates;
}
