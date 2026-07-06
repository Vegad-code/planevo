/**
 * Planevo Command — source item + calendar context helpers (Phase 7).
 *
 * Source of truth: docs/superpowers/plans/comprehensive.md §16.4 (reuse the
 * existing `integration_sources` + `source_items` pipeline — no new source
 * tables), §23 (source integrations, read-only).
 *
 * Everything here is read-only against the external pipelines
 * (`source_items`, `calendar_events`); the only writes are the
 * `responsibility_items` conversion row + its `responsibility_events` audit
 * event, scoped by `user_id` like every other Command helper.
 *
 * Source text (title/description/url) is UNTRUSTED external content: it is
 * only ever truncated here, never interpreted. Callers must render it as
 * plain text (never `dangerouslySetInnerHTML`) and must validate `url` with
 * `isSafeExternalUrl` before using it as a link target.
 */

import type { CommandDbClient } from './db';
import type { ResponsibilitySourceType } from './types';

const SNIPPET_MAX = 240;
const TITLE_MAX = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Providers whose `source_items` rows are relevant to Command (§23). Google
 * Calendar is a valid `source_items.provider` value in the schema but Command
 * reads calendar context straight from `calendar_events` instead
 * (`listRelevantCalendarEvents`) — never doubled up here.
 */
const SOURCE_ITEM_PROVIDERS = ['canvas', 'notion', 'slack', 'linear'] as const;
type SourceItemProvider = (typeof SOURCE_ITEM_PROVIDERS)[number];

const PROVIDER_LABEL: Record<SourceItemProvider, string> = {
  canvas: 'Canvas',
  notion: 'Notion',
  slack: 'Slack',
  linear: 'Linear',
};

/** Explicit 1:1 map (not a cast) so a new provider fails typecheck here rather than silently mis-labeling at runtime. */
const PROVIDER_SOURCE_TYPE: Record<SourceItemProvider, ResponsibilitySourceType> = {
  canvas: 'canvas',
  notion: 'notion',
  slack: 'slack',
  linear: 'linear',
};

function isSourceItemProvider(value: string): value is SourceItemProvider {
  return (SOURCE_ITEM_PROVIDERS as readonly string[]).includes(value);
}

function clampLimit(value: number | undefined, fallback: number, max: number): number {
  if (!value || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(Math.floor(value), max);
}

/** Plain-text truncation only. Never render the result as HTML. */
function truncate(text: string | null | undefined, max: number): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

/** True when `url` is a plain http(s) link safe to render as an anchor href. Source URLs are untrusted (§29) — never render `javascript:`/`data:` etc. */
export function isSafeExternalUrl(url: string | null | undefined): url is string {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

/**
 * YYYY-MM-DD day key for `instant` in `timezone`, used to compare calendar days
 * without pulling in a date library. Mirrors the technique in `lib/command/board.ts`.
 */
function zonedDateKey(instant: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(instant);
  } catch {
    return instant.toISOString().slice(0, 10);
  }
}

// ---------------------------------------------------------------------------
// Source items (Canvas / Notion / Slack / Linear)
// ---------------------------------------------------------------------------

export interface CommandSourceItem {
  id: string;
  provider: SourceItemProvider;
  sourceType: ResponsibilitySourceType;
  itemType: string;
  title: string;
  /** Human-readable provider label (e.g. "Canvas") — becomes `source_label` on conversion. */
  label: string;
  url: string | null;
  /** Truncated captured text. Plain text only — never render as HTML. */
  snippet: string | null;
  dueAt: string | null;
  /** True when a `responsibility_items` row already links this source item. */
  converted: boolean;
}

interface SourceItemRow {
  id: string;
  provider: string;
  item_type: string;
  title: string;
  description: string | null;
  url: string | null;
  due_date: string | null;
  completed: boolean | null;
}

export interface ListSourceItemsOptions {
  /** Max rows returned (default 20, hard cap 50). */
  limit?: number;
  /**
   * Include items already converted to a responsibility (default false — the
   * source panel only needs "add" candidates). The `converted` flag is still
   * computed either way.
   */
  includeConverted?: boolean;
}

/**
 * Recent `source_items` relevant to Command (§16.4 / §23) — Canvas, Notion,
 * Slack, Linear. Excludes soft-deleted and completed-at-source rows and, by
 * default, rows already converted to a `responsibility_items` row (checked via
 * `source_item_id`, never a stored "converted" column — that would drift).
 */
export async function listCommandSourceItems(
  client: CommandDbClient,
  userId: string,
  opts: ListSourceItemsOptions = {},
): Promise<CommandSourceItem[]> {
  const limit = clampLimit(opts.limit, 20, 50);

  const { data, error } = await client
    .from('source_items')
    .select('id, provider, item_type, title, description, url, due_date, completed')
    .eq('user_id', userId)
    .in('provider', [...SOURCE_ITEM_PROVIDERS])
    .is('deleted_at', null)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    // Overfetch a little — already-converted rows get filtered out below.
    .limit(limit * 2);
  if (error) throw error;

  const rows = (data as SourceItemRow[] | null ?? []).filter(
    (row) => row.completed !== true && isSourceItemProvider(row.provider),
  );
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const { data: linked, error: linkedError } = await client
    .from('responsibility_items')
    .select('source_item_id')
    .eq('user_id', userId)
    .in('source_item_id', ids);
  if (linkedError) throw linkedError;

  const convertedIds = new Set(
    (linked as { source_item_id: string | null }[] | null ?? [])
      .map((row) => row.source_item_id)
      .filter((id): id is string => id != null),
  );

  const items: CommandSourceItem[] = rows.map((row) => {
    const provider = row.provider as SourceItemProvider;
    return {
      id: row.id,
      provider,
      sourceType: PROVIDER_SOURCE_TYPE[provider],
      itemType: row.item_type,
      title: truncate(row.title, TITLE_MAX) ?? 'Untitled',
      label: PROVIDER_LABEL[provider],
      url: row.url,
      snippet: truncate(row.description, SNIPPET_MAX),
      dueAt: row.due_date,
      converted: convertedIds.has(row.id),
    };
  });

  const filtered = opts.includeConverted ? items : items.filter((item) => !item.converted);
  return filtered.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Calendar commitments
// ---------------------------------------------------------------------------

export interface CommandCalendarCommitment {
  id: string;
  title: string;
  startAt: string;
  endAt: string | null;
  isAllDay: boolean;
  location: string | null;
  /** True when a `responsibility_items` row already links this calendar event. */
  converted: boolean;
}

interface CalendarEventRow {
  id: string;
  title: string;
  location: string | null;
  start_time: string;
  end_time: string | null;
  is_all_day: boolean | null;
  status: string | null;
  is_deleted: boolean | null;
}

export interface ListCalendarEventsOptions {
  /** How many days ahead counts as "upcoming" (default 7, hard cap 30). */
  daysAhead?: number;
  /** Max rows returned (default 20, hard cap 50). */
  limit?: number;
}

/**
 * Today/upcoming `calendar_events` as read-only commitments (§23.1). Rejected
 * and soft-deleted events are excluded. Command never writes back to the
 * calendar from this helper — write-back stays confirmation-gated elsewhere.
 */
export async function listRelevantCalendarEvents(
  client: CommandDbClient,
  userId: string,
  now: Date,
  timezone: string,
  opts: ListCalendarEventsOptions = {},
): Promise<CommandCalendarCommitment[]> {
  const daysAhead = clampLimit(opts.daysAhead, 7, 30);
  const limit = clampLimit(opts.limit, 20, 50);

  // Wide UTC window (±1 day buffer) so no timezone offset can clip "today" —
  // the real boundary is applied afterward via zoned day keys, not raw Date math.
  const windowStart = new Date(now.getTime() - DAY_MS);
  const windowEnd = new Date(now.getTime() + (daysAhead + 1) * DAY_MS);

  const { data, error } = await client
    .from('calendar_events')
    .select('id, title, location, start_time, end_time, is_all_day, status, is_deleted')
    .eq('user_id', userId)
    .neq('status', 'rejected')
    .gte('start_time', windowStart.toISOString())
    .lte('start_time', windowEnd.toISOString())
    .order('start_time', { ascending: true })
    .limit(limit * 2);
  if (error) throw error;

  const todayKey = zonedDateKey(now, timezone);
  const endKey = zonedDateKey(new Date(now.getTime() + daysAhead * DAY_MS), timezone);

  const rows = (data as CalendarEventRow[] | null ?? []).filter((row) => {
    if (row.is_deleted) return false;
    const key = zonedDateKey(new Date(row.start_time), timezone);
    return key >= todayKey && key <= endKey;
  });
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const { data: linked, error: linkedError } = await client
    .from('responsibility_items')
    .select('calendar_event_id')
    .eq('user_id', userId)
    .in('calendar_event_id', ids);
  if (linkedError) throw linkedError;

  const convertedIds = new Set(
    (linked as { calendar_event_id: string | null }[] | null ?? [])
      .map((row) => row.calendar_event_id)
      .filter((id): id is string => id != null),
  );

  return rows.slice(0, limit).map((row) => ({
    id: row.id,
    title: truncate(row.title, TITLE_MAX) ?? 'Untitled event',
    startAt: row.start_time,
    endAt: row.end_time,
    isAllDay: row.is_all_day === true,
    location: truncate(row.location, 120),
    converted: convertedIds.has(row.id),
  }));
}

// ---------------------------------------------------------------------------
// Conversion (source item / calendar event -> responsibility_items)
// ---------------------------------------------------------------------------

export interface ConvertResult {
  itemId: string;
  /** True when an existing responsibility already linked this source — idempotent no-op. */
  alreadyConverted: boolean;
}

/**
 * Converts a `source_items` row into a `responsibility_items` row (§16.4).
 * Idempotent: if a responsibility already links this source item, returns the
 * existing id instead of creating a duplicate. Read-only against
 * `source_items` — nothing is written back to the integration pipeline.
 */
export async function convertSourceItemToResponsibility(
  client: CommandDbClient,
  userId: string,
  sourceItemId: string,
): Promise<ConvertResult> {
  const { data: existing, error: existingError } = await client
    .from('responsibility_items')
    .select('id')
    .eq('user_id', userId)
    .eq('source_item_id', sourceItemId)
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    return { itemId: (existing as { id: string }).id, alreadyConverted: true };
  }

  const { data: sourceRow, error: sourceError } = await client
    .from('source_items')
    .select('id, provider, item_type, title, description, url, due_date')
    .eq('user_id', userId)
    .eq('id', sourceItemId)
    .single();
  if (sourceError || !sourceRow) throw sourceError ?? new Error('Source item not found');

  const row = sourceRow as SourceItemRow;
  if (!isSourceItemProvider(row.provider)) {
    throw new Error(`Unsupported source provider: ${row.provider}`);
  }

  const insertRow = {
    user_id: userId,
    title: truncate(row.title, 160) ?? 'Untitled',
    description: truncate(row.description, SNIPPET_MAX),
    type: 'unknown',
    status: 'active',
    priority: 'normal',
    due_at: row.due_date,
    source_type: PROVIDER_SOURCE_TYPE[row.provider],
    source_label: PROVIDER_LABEL[row.provider],
    source_item_id: sourceItemId,
  };

  const { data: created, error: createError } = await client
    .from('responsibility_items')
    .insert(insertRow)
    .select('id')
    .single();
  if (createError || !created) throw createError ?? new Error('Failed to create responsibility');

  const itemId = (created as { id: string }).id;
  // Audit trail (best-effort; a failed audit insert must not fail the request).
  await client.from('responsibility_events').insert({
    user_id: userId,
    item_id: itemId,
    event_type: 'created',
    actor: 'user',
    after: insertRow,
  });

  return { itemId, alreadyConverted: false };
}

/**
 * Converts a `calendar_events` row into a `responsibility_items` row (§16.4,
 * §23.1). Idempotent like `convertSourceItemToResponsibility`. Read-only
 * against `calendar_events` — this never writes back to the calendar.
 */
export async function convertCalendarEventToResponsibility(
  client: CommandDbClient,
  userId: string,
  calendarEventId: string,
): Promise<ConvertResult> {
  const { data: existing, error: existingError } = await client
    .from('responsibility_items')
    .select('id')
    .eq('user_id', userId)
    .eq('calendar_event_id', calendarEventId)
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    return { itemId: (existing as { id: string }).id, alreadyConverted: true };
  }

  const { data: eventRow, error: eventError } = await client
    .from('calendar_events')
    .select('id, title, description, location, start_time, end_time, is_all_day')
    .eq('user_id', userId)
    .eq('id', calendarEventId)
    .single();
  if (eventError || !eventRow) throw eventError ?? new Error('Calendar event not found');

  const row = eventRow as {
    title: string;
    description: string | null;
    location: string | null;
    start_time: string;
    end_time: string | null;
    is_all_day: boolean | null;
  };

  const insertRow = {
    user_id: userId,
    title: truncate(row.title, 160) ?? 'Untitled event',
    description: truncate(row.description ?? row.location, SNIPPET_MAX),
    type: 'meeting',
    status: 'active',
    priority: 'normal',
    due_at: row.is_all_day ? null : row.start_time,
    start_at: row.start_time,
    end_at: row.end_time,
    source_type: 'calendar',
    source_label: 'Calendar',
    calendar_event_id: calendarEventId,
  };

  const { data: created, error: createError } = await client
    .from('responsibility_items')
    .insert(insertRow)
    .select('id')
    .single();
  if (createError || !created) throw createError ?? new Error('Failed to create responsibility');

  const itemId = (created as { id: string }).id;
  await client.from('responsibility_events').insert({
    user_id: userId,
    item_id: itemId,
    event_type: 'created',
    actor: 'user',
    after: insertRow,
  });

  return { itemId, alreadyConverted: false };
}
