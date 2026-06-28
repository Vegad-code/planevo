import type { Tables } from '@/types/database';
import { PRO_PROVIDER_LABELS } from '@/lib/integrations/types';

export type SourceProvider =
  | 'canvas'
  | 'google_calendar'
  | 'notion'
  | 'slack'
  | 'linear';

export interface SourceListItem {
  id: string;
  provider: SourceProvider;
  title: string;
  description: string | null;
  dueAt: string | null;
  startAt: string | null;
  endAt: string | null;
  url: string | null;
  meta?: string;
}

export interface DayPlanSourceConnections {
  canvas: boolean;
  google: boolean;
  notion: boolean;
  slack: boolean;
  linear: boolean;
}

export interface DayPlanSourcesData {
  connections: DayPlanSourceConnections;
  canvas: SourceListItem[];
  calendar: SourceListItem[];
  notion: SourceListItem[];
  slack: SourceListItem[];
  linear: SourceListItem[];
}

export const SOURCE_PROVIDER_LABELS: Record<SourceProvider, string> = {
  canvas: 'Canvas',
  google_calendar: 'Google Calendar',
  notion: PRO_PROVIDER_LABELS.notion,
  slack: PRO_PROVIDER_LABELS.slack,
  linear: PRO_PROVIDER_LABELS.linear,
};

const DONE_SOURCE_STATUSES = new Set([
  'done',
  'completed',
  'complete',
  'closed',
  'cancelled',
  'canceled',
  'archived',
]);

interface SourceItemRow {
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
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function isOpenSourceItem(item: SourceItemRow): boolean {
  if (item.completed) return false;
  const status = String(item.status ?? '').toLowerCase();
  return !DONE_SOURCE_STATUSES.has(status);
}

function extractCanvasMeta(raw: unknown): string | undefined {
  const data = asRecord(raw);
  if (!data) return undefined;
  return (
    asString(data.course_name) ??
    (data.course_id ? `Course ${data.course_id}` : undefined)
  );
}

function extractSlackMeta(raw: unknown): string | undefined {
  const data = asRecord(raw);
  if (!data) return undefined;
  const channel = data.channel;
  if (typeof channel === 'object' && channel !== null) {
    return asString((channel as Record<string, unknown>).name) ?? undefined;
  }
  return asString(data.channel_name) ?? asString(data.channel) ?? undefined;
}

function extractWorkMeta(item: SourceItemRow): string | undefined {
  if (item.provider === 'linear') {
    const parts = [item.status, item.priority].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : undefined;
  }
  if (item.provider === 'notion') {
    return item.status ?? item.item_type ?? undefined;
  }
  if (item.provider === 'slack') {
    return extractSlackMeta(item.raw_data);
  }
  return undefined;
}

export function mapSourceItemRow(item: SourceItemRow): SourceListItem | null {
  const provider = item.provider as SourceProvider;
  if (
    provider !== 'canvas' &&
    provider !== 'notion' &&
    provider !== 'slack' &&
    provider !== 'linear'
  ) {
    return null;
  }

  return {
    id: item.id,
    provider,
    title: item.title,
    description: item.description,
    dueAt: item.due_date,
    startAt: null,
    endAt: null,
    url: item.url,
    meta:
      provider === 'canvas'
        ? extractCanvasMeta(item.raw_data)
        : extractWorkMeta(item),
  };
}

export function mapCanvasAssignmentRow(
  row: Pick<
    Tables<'canvas_assignments'>,
    'id' | 'name' | 'description' | 'due_at' | 'html_url' | 'course_name'
  >
): SourceListItem {
  return {
    id: row.id,
    provider: 'canvas',
    title: row.name,
    description: row.description,
    dueAt: row.due_at,
    startAt: null,
    endAt: null,
    url: row.html_url,
    meta: row.course_name ?? undefined,
  };
}

export function mapCalendarEventRow(
  row: Pick<
    Tables<'calendar_events'>,
    | 'id'
    | 'title'
    | 'description'
    | 'start_time'
    | 'end_time'
    | 'location'
    | 'metadata'
  >
): SourceListItem {
  const metadata = asRecord(row.metadata);
  const url =
    asString(metadata?.htmlUrl) ??
    asString(metadata?.html_url) ??
    (row.location?.startsWith('http') ? row.location : null);

  const locationMeta =
    row.location && !row.location.startsWith('http') ? row.location : undefined;

  return {
    id: row.id,
    provider: 'google_calendar',
    title: row.title,
    description: row.description,
    dueAt: null,
    startAt: row.start_time,
    endAt: row.end_time,
    url,
    meta: locationMeta,
  };
}

export function filterAndMapSourceItems(
  rows: SourceItemRow[],
  provider: Exclude<SourceProvider, 'google_calendar'>
): SourceListItem[] {
  return rows
    .filter((row) => row.provider === provider)
    .filter(isOpenSourceItem)
    .map(mapSourceItemRow)
    .filter((item): item is SourceListItem => item !== null);
}
