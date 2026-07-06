/**
 * Planevo Command — persistence helpers (§19 steps 6–13).
 *
 * All writes are scoped by `user_id`; audit rows are appended to
 * `responsibility_events` (§16.6). The board is computed deterministically from
 * stored items — never read from a stored section (§16.3, §21).
 */

import { computeBoardSections } from './board';
import type { CommandDbClient } from './db';
import type {
  CommandBoard,
  CommandInputMode,
  ExtractedResponsibility,
  ResponsibilityItem,
} from './types';

// Command tables are new and not yet in the generated Database type; persistence
// runs against the permissive client from ./db (single cast point).
type AnyClient = CommandDbClient;

interface ResponsibilityRow {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  urgency_score: number;
  confidence: number;
  due_at: string | null;
  start_at: string | null;
  end_at: string | null;
  timezone: string | null;
  recurrence_rule: string | null;
  source_type: string;
  source_label: string | null;
  source_item_id: string | null;
  calendar_event_id: string | null;
  task_id: string | null;
  intake_run_id: string | null;
  needs_review: boolean;
  review_reason: string | null;
  why_it_matters: string | null;
  metadata: Record<string, unknown> | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function rowToItem(row: ResponsibilityRow): ResponsibilityItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type as ResponsibilityItem['type'],
    status: row.status as ResponsibilityItem['status'],
    priority: row.priority as ResponsibilityItem['priority'],
    urgencyScore: row.urgency_score,
    confidence: Number(row.confidence),
    dueAt: row.due_at,
    startAt: row.start_at,
    endAt: row.end_at,
    timezone: row.timezone,
    recurrenceRule: row.recurrence_rule,
    sourceType: row.source_type as ResponsibilityItem['sourceType'],
    sourceLabel: row.source_label,
    sourceItemId: row.source_item_id,
    calendarEventId: row.calendar_event_id,
    taskId: row.task_id,
    intakeRunId: row.intake_run_id,
    needsReview: row.needs_review,
    reviewReason: row.review_reason,
    whyItMatters: row.why_it_matters,
    metadata: row.metadata ?? {},
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ITEM_COLUMNS =
  'id,title,description,type,status,priority,urgency_score,confidence,due_at,start_at,end_at,timezone,recurrence_rule,source_type,source_label,source_item_id,calendar_event_id,task_id,intake_run_id,needs_review,review_reason,why_it_matters,metadata,completed_at,created_at,updated_at';

export interface CreateIntakeRunInput {
  userId: string;
  inputMode: CommandInputMode;
  rawText: string | null;
  transcriptText?: string | null;
}

/** Create a `command_intake_runs` row and return its id (§16.2). */
export async function createIntakeRun(
  client: AnyClient,
  input: CreateIntakeRunInput,
): Promise<string> {
  const { data, error } = await client
    .from('command_intake_runs')
    .insert({
      user_id: input.userId,
      input_mode: input.inputMode,
      raw_text: input.rawText,
      transcript_text: input.transcriptText ?? null,
      status: 'pending',
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export interface FinalizeIntakeRunInput {
  status: 'previewed' | 'confirmed' | 'discarded' | 'failed';
  extractionModel?: string;
  inputTokens?: number;
  outputTokens?: number;
  audioSeconds?: number;
  estimatedCostUsd?: number;
  confidence?: number;
  errorMessage?: string | null;
}

/** Update an intake run after extraction / confirmation (§16.2). */
export async function updateIntakeRun(
  client: AnyClient,
  userId: string,
  intakeRunId: string,
  patch: FinalizeIntakeRunInput,
): Promise<void> {
  const { error } = await client
    .from('command_intake_runs')
    .update({
      status: patch.status,
      extraction_model: patch.extractionModel,
      input_tokens: patch.inputTokens,
      output_tokens: patch.outputTokens,
      audio_seconds: patch.audioSeconds,
      estimated_cost_usd: patch.estimatedCostUsd,
      confidence: patch.confidence,
      error_message: patch.errorMessage ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', intakeRunId)
    .eq('user_id', userId);
  if (error) throw error;
}

export interface ConfirmItemInput extends ExtractedResponsibility {
  accepted: boolean;
}

/**
 * Persist accepted items from a confirmed intake run and append `created` audit
 * events. Returns the new item ids. Verifies the intake run belongs to the user
 * before writing (§20.2).
 */
export async function persistConfirmedItems(
  client: AnyClient,
  userId: string,
  intakeRunId: string,
  items: ConfirmItemInput[],
): Promise<string[]> {
  const accepted = items.filter((i) => i.accepted && i.title.trim().length > 0);
  if (accepted.length === 0) return [];

  const { data: run, error: runError } = await client
    .from('command_intake_runs')
    .select('id,input_mode')
    .eq('id', intakeRunId)
    .eq('user_id', userId)
    .single();
  if (runError || !run) throw runError ?? new Error('Intake run not found');

  const sourceType =
    (run as { input_mode: string }).input_mode === 'voice' ? 'voice' :
    (run as { input_mode: string }).input_mode === 'paste' ? 'paste' : 'manual';

  const rows = accepted.map((item) => ({
    user_id: userId,
    title: item.title.trim().slice(0, 160),
    description: item.description,
    type: item.type,
    status: 'active',
    priority: item.priority,
    confidence: item.confidence,
    due_at: item.dueAt,
    start_at: item.startAt,
    end_at: item.endAt,
    timezone: item.timezone,
    recurrence_rule: item.recurrenceRule,
    source_type: sourceType,
    intake_run_id: intakeRunId,
    needs_review: item.needsReview,
    review_reason: item.reviewReason,
    why_it_matters: item.whyItMatters,
  }));

  const { data, error } = await client
    .from('responsibility_items')
    .insert(rows)
    .select('id');
  if (error) throw error;

  const ids = (data as { id: string }[]).map((r) => r.id);

  // Audit trail (best-effort; a failed audit insert must not fail the request).
  const events = ids.map((id, idx) => ({
    user_id: userId,
    item_id: id,
    event_type: 'created',
    actor: 'user',
    after: rows[idx],
  }));
  await client.from('responsibility_events').insert(events);

  return ids;
}

/** Load a user's active/board-relevant items and compute the board (§20.4). */
export async function loadBoard(
  client: AnyClient,
  userId: string,
  now: Date,
  timezone: string,
): Promise<{ items: ResponsibilityItem[]; board: CommandBoard }> {
  const { data, error } = await client
    .from('responsibility_items')
    .select(ITEM_COLUMNS)
    .eq('user_id', userId)
    .neq('status', 'archived')
    .neq('status', 'discarded')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const items = (data as ResponsibilityRow[] | null ?? []).map(rowToItem);
  return { items, board: computeBoardSections(items, now, timezone) };
}

export interface ItemPatch {
  title?: string;
  description?: string | null;
  type?: ResponsibilityItem['type'];
  status?: ResponsibilityItem['status'];
  priority?: ResponsibilityItem['priority'];
  dueAt?: string | null;
  whyItMatters?: string | null;
}

/** Patch a single item (ownership-checked) and append an `updated` audit event (§20.5). */
export async function patchItem(
  client: AnyClient,
  userId: string,
  itemId: string,
  patch: ItemPatch,
): Promise<ResponsibilityItem | null> {
  const { data: before, error: beforeError } = await client
    .from('responsibility_items')
    .select(ITEM_COLUMNS)
    .eq('id', itemId)
    .eq('user_id', userId)
    .single();
  if (beforeError || !before) return null;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) update.title = patch.title.trim().slice(0, 160);
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.type !== undefined) update.type = patch.type;
  if (patch.priority !== undefined) update.priority = patch.priority;
  if (patch.dueAt !== undefined) update.due_at = patch.dueAt;
  if (patch.whyItMatters !== undefined) update.why_it_matters = patch.whyItMatters;
  if (patch.status !== undefined) {
    update.status = patch.status;
    // Lifecycle integrity: only an explicit done sets completed_at (§16.9 rule 6).
    update.completed_at = patch.status === 'done' ? new Date().toISOString() : null;
  }

  const { data: after, error: updateError } = await client
    .from('responsibility_items')
    .update(update)
    .eq('id', itemId)
    .eq('user_id', userId)
    .select(ITEM_COLUMNS)
    .single();
  if (updateError || !after) return null;

  await client.from('responsibility_events').insert({
    user_id: userId,
    item_id: itemId,
    event_type: 'updated',
    actor: 'user',
    before,
    after,
  });

  return rowToItem(after as ResponsibilityRow);
}
