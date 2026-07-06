import type { SupabaseClient } from '@supabase/supabase-js';
import {
  blocksToMarkdown,
  markdownToStructuredBlocks,
  BRUNO_SECTION_MAP,
  type BlockNoteBlock,
} from '@planevo/notes-core';
import * as Sentry from '@sentry/nextjs';
import type { Database, Json } from '@/types/database';
import { createNoteRecord, updateNoteRecord } from '@/lib/notes/noteService';
import { resolveTimeBlockTimes } from '@/lib/bruno/resolveTimeBlockTimes';
import { isValidProposalColor, resolveProposalColor } from '@/lib/bruno/proposalColors';
import {
  deleteEventFromGoogle,
  hasGoogleWriteScope,
  pushEventToGoogle,
  syncGoogleCalendar,
} from '@/lib/integrations/google-calendar';
import { generateDailyPlan } from '@/lib/ai/generate-daily-plan';
import { recordScheduleBlockFeedbackInMemory } from '@/lib/ai/memory';
import {
  coerceProposedActionInput,
  DESTRUCTIVE_ACTION_TYPES,
  NOTE_KIND_VALUES,
  proposedActionBaseSchema,
  type BrunoToolResult,
  type ProposedAction,
  sanitizeBrunoString,
} from '@/lib/bruno/tools/schemas';
import { FEATURES } from '@/lib/featureFlags';
import { commandDb } from '@/lib/command/db';
import {
  mirrorTaskToResponsibility,
  syncTaskCompletionToResponsibility,
} from '@/lib/command/tasks-bridge';

type Supabase = SupabaseClient<Database>;
type CalendarEventUpdate = Database['public']['Tables']['calendar_events']['Update'];
type SourceItemTaskUpdate = Database['public']['Tables']['source_items']['Update'];
type CalendarMutationRow = {
  id: string;
  title: string;
  start_time?: string | null;
  end_time?: string | null;
  external_id: string | null;
  source: string | null;
  metadata: Json | null;
  is_all_day?: boolean | null;
};
type SourceItemTaskRow = {
  id: string;
  external_id: string;
  title: string;
  due_date: string | null;
  deleted_at?: string | null;
};

export type ExecuteActionContext = {
  userId: string;
  supabase: Supabase;
  timeZone?: string;
  userPrompt?: string;
  mergedPayload?: Record<string, unknown>;
};

function humanError(message: string): BrunoToolResult {
  return { success: false, error: message };
}

function assertDestructiveConfirmation(action: ProposedAction): BrunoToolResult | null {
  if (!DESTRUCTIVE_ACTION_TYPES.has(action.type)) return null;
  if (action.requiresConfirmation !== true || action.riskLevel !== 'high') {
    return humanError('This action requires explicit confirmation before it can run.');
  }
  return null;
}

function getPayload(ctx: ExecuteActionContext, action: ProposedAction): Record<string, unknown> {
  return { ...(action.payload ?? {}), ...(ctx.mergedPayload ?? {}) };
}

function metadataRecord(metadata: Json | null | undefined): Record<string, unknown> {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

function googleCalendarIdentity(event: CalendarMutationRow): {
  eventId: string;
  calendarId?: string;
} | null {
  const metadata = metadataRecord(event.metadata);
  const metadataEventId =
    typeof metadata.google_event_id === 'string'
      ? metadata.google_event_id
      : null;
  const eventId =
    metadataEventId ||
    (event.source === 'google_calendar' && event.external_id
      ? event.external_id
      : null);

  if (!eventId) return null;

  const calendarId =
    typeof metadata.google_calendar_id === 'string'
      ? metadata.google_calendar_id
      : undefined;

  return { eventId, calendarId };
}

async function assertGoogleWriteAccessIfNeeded(
  event: CalendarMutationRow,
  ctx: ExecuteActionContext
): Promise<BrunoToolResult | null> {
  if (!googleCalendarIdentity(event)) return null;
  const canWrite = await hasGoogleWriteScope(ctx.userId);
  if (canWrite) return null;
  return humanError(
    'Google Calendar write permission is required to change this synced event. Reconnect Google Calendar with write access, then ask Bruno again.'
  );
}

function normalizedTitle(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/\s+/g, ' ').toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function findSourceItemTask(
  ctx: ExecuteActionContext,
  taskId: string
): Promise<SourceItemTaskRow | null> {
  if (looksLikeUuid(taskId)) {
    const { data, error } = await ctx.supabase
      .from('source_items')
      .select('id, external_id, title, due_date, deleted_at')
      .eq('id', taskId)
      .eq('user_id', ctx.userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      Sentry.captureException(error, {
        tags: { userId: ctx.userId, actionType: 'SOURCE_ITEM_LOOKUP_BY_ID' },
      });
      return null;
    }
    if (data) return data as SourceItemTaskRow;
  }

  const { data, error } = await ctx.supabase
    .from('source_items')
    .select('id, external_id, title, due_date, deleted_at')
    .eq('external_id', taskId)
    .eq('user_id', ctx.userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    Sentry.captureException(error, {
      tags: { userId: ctx.userId, actionType: 'SOURCE_ITEM_LOOKUP_BY_EXTERNAL_ID' },
    });
    return null;
  }

  return data as SourceItemTaskRow | null;
}

async function updateSourceItemTask(
  sourceItem: SourceItemTaskRow,
  updates: SourceItemTaskUpdate,
  ctx: ExecuteActionContext
): Promise<SourceItemTaskRow | null> {
  const { data, error } = await ctx.supabase
    .from('source_items')
    .update(updates)
    .eq('id', sourceItem.id)
    .eq('user_id', ctx.userId)
    .select('id, external_id, title, due_date, deleted_at')
    .maybeSingle();

  if (error || !data) {
    if (error) {
      Sentry.captureException(error, {
        tags: { userId: ctx.userId, actionType: 'SOURCE_ITEM_UPDATE' },
      });
    }
    return null;
  }

  return data as SourceItemTaskRow;
}

async function resolveUniqueCalendarEventId(
  action: ProposedAction,
  ctx: ExecuteActionContext,
  payload: Record<string, unknown>
): Promise<string | null> {
  const candidates = [
    normalizedTitle(payload.eventTitle),
    normalizedTitle(payload.taskTitle),
    normalizedTitle(action.title),
  ].filter((value): value is string => Boolean(value));
  const title = candidates[0];
  if (!title) return null;

  const { data, error } = await ctx.supabase
    .from('calendar_events')
    .select('id, title')
    .eq('user_id', ctx.userId)
    .eq('is_deleted', false)
    .ilike('title', title)
    .limit(10);

  if (error || !data) return null;

  const exactMatches = data.filter(
    (event) => normalizedTitle(event.title) === title
  );
  return exactMatches.length === 1 ? exactMatches[0].id : null;
}

function hasCalendarIdentitySignal(
  action: ProposedAction,
  payload: Record<string, unknown>
): boolean {
  return Boolean(
    (typeof payload.eventId === 'string' && payload.eventId.length > 0) ||
      (typeof payload.externalId === 'string' && payload.externalId.length > 0) ||
      (typeof payload.googleEventId === 'string' && payload.googleEventId.length > 0) ||
      normalizedTitle(payload.eventTitle) ||
      normalizedTitle(payload.taskTitle) ||
      normalizedTitle(action.title)
  );
}

const CALENDAR_MUTATION_COLUMNS =
  'id, title, start_time, end_time, external_id, source, metadata, is_all_day';

/**
 * Resolves the live calendar_events row a mutation should target.
 *
 * A proposal pins an internal `eventId` (UUID) at propose time, but that id can
 * become stale before execute (e.g. a Google resync recreates the row). To stay
 * resilient we fall back, in order, to the stable Google identity carried in the
 * proposal payload (`externalId` / `googleEventId`) and finally a unique title
 * match. Returns null only when nothing can be resolved.
 */
async function findCalendarEventForMutation(
  action: ProposedAction,
  ctx: ExecuteActionContext,
  payload: Record<string, unknown>,
  eventId: string | undefined
): Promise<CalendarMutationRow | null> {
  if (eventId) {
    const { data } = await ctx.supabase
      .from('calendar_events')
      .select(CALENDAR_MUTATION_COLUMNS)
      .eq('id', eventId)
      .eq('user_id', ctx.userId)
      .eq('is_deleted', false)
      .maybeSingle();
    if (data) return data as CalendarMutationRow;
  }

  const externalId =
    typeof payload.externalId === 'string' && payload.externalId.length > 0
      ? payload.externalId
      : typeof payload.googleEventId === 'string' && payload.googleEventId.length > 0
        ? payload.googleEventId
        : null;

  if (externalId) {
    const { data: byExternal } = await ctx.supabase
      .from('calendar_events')
      .select(CALENDAR_MUTATION_COLUMNS)
      .eq('user_id', ctx.userId)
      .eq('is_deleted', false)
      .eq('external_id', externalId)
      .limit(2);
    if (byExternal && byExternal.length === 1) return byExternal[0] as CalendarMutationRow;

    const { data: byMetadata } = await ctx.supabase
      .from('calendar_events')
      .select(CALENDAR_MUTATION_COLUMNS)
      .eq('user_id', ctx.userId)
      .eq('is_deleted', false)
      .eq('metadata->>google_event_id', externalId)
      .limit(2);
    if (byMetadata && byMetadata.length === 1) return byMetadata[0] as CalendarMutationRow;
  }

  const uniqueId = await resolveUniqueCalendarEventId(action, ctx, payload);
  if (uniqueId && uniqueId !== eventId) {
    const { data } = await ctx.supabase
      .from('calendar_events')
      .select(CALENDAR_MUTATION_COLUMNS)
      .eq('id', uniqueId)
      .eq('user_id', ctx.userId)
      .eq('is_deleted', false)
      .maybeSingle();
    if (data) return data as CalendarMutationRow;
  }

  return null;
}

async function executeCreateTask(action: ProposedAction, ctx: ExecuteActionContext): Promise<BrunoToolResult> {
  const payload = getPayload(ctx, action);
  const taskColor = isValidProposalColor(payload.color as string | undefined)
    ? (payload.color as string)
    : resolveProposalColor({
        color: payload.color as string | undefined,
        colorCategory: payload.colorCategory as string | undefined,
        title: (payload.taskTitle as string) || action.title,
        description: action.description,
      });

  const { data, error } = await ctx.supabase
    .from('tasks')
    .insert({
      user_id: ctx.userId,
      title: sanitizeBrunoString((payload.taskTitle as string) || action.title || 'Untitled Task', 500),
      description: payload.notes ? sanitizeBrunoString(String(payload.notes), 5000) : null,
      estimated_minutes: (payload.estimatedMinutes as number) || 30,
      due_date: (payload.dueDate as string) || null,
      priority: (payload.priority as 'low' | 'medium' | 'high') || 'medium',
      color: taskColor,
      status: 'todo',
      completed: false,
      is_ai_suggested: true,
      ai_confidence_score: 90,
      is_recurring: false,
      rescheduled_count: 0,
    })
    .select('id, title')
    .single();

  if (error) {
    Sentry.captureException(error, { tags: { userId: ctx.userId, actionType: 'CREATE_TASK' } });
    return humanError('Could not create the task. Please try again.');
  }

  // Command transition (§16.9): mirror the new task into responsibility_items.
  // Flag-guarded + fully isolated — a bridge failure never affects the task write.
  if (FEATURES.PLANEVO_COMMAND) {
    await mirrorTaskToResponsibility(commandDb(), ctx.userId, {
      id: data.id,
      title: (payload.taskTitle as string) || action.title || 'Untitled Task',
      description: payload.notes ? String(payload.notes) : null,
      due_date: (payload.dueDate as string) || null,
      estimated_minutes: (payload.estimatedMinutes as number) || null,
      priority: (payload.priority as 'low' | 'medium' | 'high') || 'medium',
      completed: false,
    }).catch(() => null);
  }

  return { success: true, data: { taskId: data.id, title: data.title } };
}

async function executeUpdateTask(action: ProposedAction, ctx: ExecuteActionContext): Promise<BrunoToolResult> {
  const payload = getPayload(ctx, action);
  const taskId = payload.taskId as string | undefined;
  if (!taskId) return humanError('Task ID is required to update a task.');

  const now = new Date().toISOString();
  const updates: Database['public']['Tables']['tasks']['Update'] = { updated_at: new Date().toISOString() };
  if (payload.taskTitle) updates.title = sanitizeBrunoString(String(payload.taskTitle), 500);
  if (payload.notes !== undefined) updates.description = sanitizeBrunoString(String(payload.notes), 5000);
  if (payload.priority) updates.priority = payload.priority as 'low' | 'medium' | 'high';
  if (payload.estimatedMinutes) updates.estimated_minutes = payload.estimatedMinutes as number;
  if (payload.dueDate !== undefined) updates.due_date = (payload.dueDate as string) || null;
  if (payload.status) {
    updates.status = payload.status as 'todo' | 'in_progress' | 'done' | 'missed';
  }

  const requestedCompleted =
    typeof payload.completed === 'boolean'
      ? payload.completed
      : payload.status === 'done'
        ? true
        : payload.status && payload.status !== 'done'
          ? false
          : undefined;

  if (requestedCompleted !== undefined) {
    updates.completed = requestedCompleted;
    updates.completed_at = requestedCompleted
      ? String(payload.completedAt ?? payload.completed_at ?? now)
      : null;
    if (!payload.status) {
      updates.status = requestedCompleted ? 'done' : 'todo';
    }
  }

  let data: {
    id: string;
    title: string;
    status: string | null;
    completed: boolean | null;
    completed_at: string | null;
  } | null = null;
  let error: unknown = null;

  if (looksLikeUuid(taskId)) {
    const result = await ctx.supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('user_id', ctx.userId)
      .is('deleted_at', null)
      .select('id, title, status, completed, completed_at')
      .maybeSingle();
    data = result.data;
    error = result.error;
  }

  if (error) return humanError('Task not found or could not be updated.');
  if (!data) {
    const sourceItem = await findSourceItemTask(ctx, taskId);
    if (!sourceItem) return humanError('Task not found or could not be updated.');

    const sourceUpdates: SourceItemTaskUpdate = { updated_at: now };
    if (payload.taskTitle) {
      sourceUpdates.title = sanitizeBrunoString(String(payload.taskTitle), 500);
    }
    if (payload.notes !== undefined) {
      sourceUpdates.description = payload.notes
        ? sanitizeBrunoString(String(payload.notes), 5000)
        : null;
    }
    if (payload.dueDate !== undefined) {
      sourceUpdates.due_date = (payload.dueDate as string) || null;
    }
    if (requestedCompleted !== undefined) {
      sourceUpdates.deleted_at = requestedCompleted
        ? String(payload.completedAt ?? payload.completed_at ?? now)
        : null;
    }

    const updatedSourceItem = await updateSourceItemTask(
      sourceItem,
      sourceUpdates,
      ctx
    );
    if (!updatedSourceItem) {
      return humanError('Imported task not found or could not be updated.');
    }

    return {
      success: true,
      data: {
        taskId: updatedSourceItem.id,
        sourceItemId: updatedSourceItem.id,
        externalId: updatedSourceItem.external_id,
        title: updatedSourceItem.title,
        dueDate: updatedSourceItem.due_date,
        completed: requestedCompleted ?? false,
        completedAt: requestedCompleted ? sourceUpdates.deleted_at : null,
        taskSource: 'source_item',
      },
    };
  }
  // Command transition (§16.9): propagate completion to the linked responsibility.
  // Flag-guarded + isolated; never affects the task update result.
  if (FEATURES.PLANEVO_COMMAND && requestedCompleted !== undefined) {
    await syncTaskCompletionToResponsibility(
      commandDb(),
      ctx.userId,
      data.id,
      requestedCompleted,
    ).catch(() => undefined);
  }

  return {
    success: true,
    data: {
      taskId: data.id,
      title: data.title,
      status: data.status,
      completed: data.completed,
      completedAt: data.completed_at,
    },
  };
}

async function executeRescheduleTask(action: ProposedAction, ctx: ExecuteActionContext): Promise<BrunoToolResult> {
  const payload = getPayload(ctx, action);
  const taskId = payload.taskId as string | undefined;
  if (!taskId) return humanError('Task ID is required to reschedule a task.');

  let existing: { id: string; rescheduled_count: number | null } | null = null;
  if (looksLikeUuid(taskId)) {
    const result = await ctx.supabase
      .from('tasks')
      .select('id, rescheduled_count')
      .eq('id', taskId)
      .eq('user_id', ctx.userId)
      .is('deleted_at', null)
      .maybeSingle();
    existing = result.data;
    if (result.error) return humanError('Task not found or access denied.');
  }

  if (!existing) {
    const sourceItem = await findSourceItemTask(ctx, taskId);
    if (!sourceItem) return humanError('Task not found or access denied.');

    const updatedSourceItem = await updateSourceItemTask(
      sourceItem,
      {
        due_date: (payload.dueDate as string) || null,
        updated_at: new Date().toISOString(),
      },
      ctx
    );
    if (!updatedSourceItem) return humanError('Could not reschedule the imported task.');

    return {
      success: true,
      data: {
        taskId: updatedSourceItem.id,
        sourceItemId: updatedSourceItem.id,
        externalId: updatedSourceItem.external_id,
        title: updatedSourceItem.title,
        dueDate: updatedSourceItem.due_date,
        taskSource: 'source_item',
      },
    };
  }

  const { data, error } = await ctx.supabase
    .from('tasks')
    .update({
      due_date: (payload.dueDate as string) || null,
      rescheduled_count: (existing.rescheduled_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('user_id', ctx.userId)
    .select('id, title, due_date')
    .maybeSingle();

  if (error || !data) return humanError('Could not reschedule the task.');
  return { success: true, data: { taskId: data.id, title: data.title, dueDate: data.due_date } };
}

async function executeDeleteTask(action: ProposedAction, ctx: ExecuteActionContext): Promise<BrunoToolResult> {
  const destructiveError = assertDestructiveConfirmation(action);
  if (destructiveError) return destructiveError;

  const taskId = getPayload(ctx, action).taskId as string | undefined;
  if (!taskId) return humanError('Task ID is required to delete a task.');

  const deletedAt = new Date().toISOString();
  let data: { id: string; title: string } | null = null;
  let error: unknown = null;

  if (looksLikeUuid(taskId)) {
    const result = await ctx.supabase
      .from('tasks')
      .update({ deleted_at: deletedAt, updated_at: deletedAt })
      .eq('id', taskId)
      .eq('user_id', ctx.userId)
      .is('deleted_at', null)
      .select('id, title')
      .maybeSingle();
    data = result.data;
    error = result.error;
  }

  if (error) return humanError('Task not found or could not be removed.');
  if (!data) {
    const sourceItem = await findSourceItemTask(ctx, taskId);
    if (!sourceItem) return humanError('Task not found or could not be removed.');

    const updatedSourceItem = await updateSourceItemTask(
      sourceItem,
      { deleted_at: deletedAt, updated_at: deletedAt },
      ctx
    );
    if (!updatedSourceItem) {
      return humanError('Imported task not found or could not be removed.');
    }

    return {
      success: true,
      data: {
        taskId: updatedSourceItem.id,
        sourceItemId: updatedSourceItem.id,
        externalId: updatedSourceItem.external_id,
        title: updatedSourceItem.title,
        taskSource: 'source_item',
      },
    };
  }
  return { success: true, data: { taskId: data.id, title: data.title } };
}

async function executeCreateTimeBlock(action: ProposedAction, ctx: ExecuteActionContext): Promise<BrunoToolResult> {
  const payload = getPayload(ctx, action);
  const eventColor = isValidProposalColor(payload.color as string | undefined)
    ? (payload.color as string)
    : resolveProposalColor({
        color: payload.color as string | undefined,
        colorCategory: payload.colorCategory as string | undefined,
        title: action.title,
        description: action.description,
      });

  let times: { startTime: string; endTime: string };
  try {
    times = resolveTimeBlockTimes(payload, {
      title: action.title,
      description: action.description,
      hintTexts: ctx.userPrompt ? [ctx.userPrompt] : [],
      timeZone: ctx.timeZone ?? 'UTC',
    });
  } catch (error) {
    return humanError(error instanceof Error ? error.message : 'Invalid event time.');
  }

  const { data: createdEvent, error } = await ctx.supabase
    .from('calendar_events')
    .insert({
      user_id: ctx.userId,
      title: sanitizeBrunoString(action.title || 'Untitled Event', 500),
      description: payload.notes ? sanitizeBrunoString(String(payload.notes), 5000) : action.description || null,
      location: payload.location ? sanitizeBrunoString(String(payload.location), 500) : null,
      start_time: times.startTime,
      end_time: times.endTime,
      is_all_day: false,
      source: 'schedule',
      color: eventColor,
      status: 'accepted',
      is_ai_suggested: true,
      is_deleted: false,
      is_completed: false,
    })
    .select('id, title, start_time, end_time, external_id, source, metadata')
    .single();

  if (error || !createdEvent) {
    Sentry.captureException(error ?? new Error('Calendar insert failed'), {
      tags: { userId: ctx.userId, actionType: 'CREATE_TIME_BLOCK' },
    });
    return humanError('Could not add the calendar event.');
  }

  const canWriteGoogle = await hasGoogleWriteScope(ctx.userId);
  if (canWriteGoogle) {
    const pushResult = await pushEventToGoogle(ctx.userId, createdEvent);
    if (!pushResult?.success) {
      await ctx.supabase.from('calendar_events').delete().eq('id', createdEvent.id).eq('user_id', ctx.userId);
      return humanError('Could not add the event to Google Calendar. No local changes were made.');
    }
    try {
      // Non-force reconcile: the event was already pushed to Google and written
      // locally, so we only need a light delta sync. A force sync here would churn
      // sibling rows' start times without recycling ids (post fix), but non-force
      // is cheaper and sufficient.
      await syncGoogleCalendar(ctx.userId, false);
    } catch (syncError) {
      Sentry.captureException(syncError, { tags: { userId: ctx.userId, actionType: 'CREATE_TIME_BLOCK_SYNC' } });
    }
  }

  return { success: true, data: { eventId: createdEvent.id, title: createdEvent.title } };
}

async function executeUpdateCalendarEvent(action: ProposedAction, ctx: ExecuteActionContext): Promise<BrunoToolResult> {
  const payload = getPayload(ctx, action);
  const eventId = typeof payload.eventId === 'string' && payload.eventId.length > 0 ? payload.eventId : undefined;
  if (!hasCalendarIdentitySignal(action, payload)) {
    return humanError(
      'I could not identify which calendar event to update. Ask Bruno to regenerate the proposal so it includes the event ID.'
    );
  }

  const existing = await findCalendarEventForMutation(action, ctx, payload, eventId);

  if (!existing) return humanError('Event not found or access denied.');

  const writeAccessError = await assertGoogleWriteAccessIfNeeded(existing, ctx);
  if (writeAccessError) return writeAccessError;

  let updates: CalendarEventUpdate = { updated_at: new Date().toISOString() };
  if (payload.taskTitle || payload.eventTitle) {
    updates.title = sanitizeBrunoString(String(payload.taskTitle ?? payload.eventTitle), 500);
  }
  if (payload.notes !== undefined) {
    updates.description = payload.notes ? sanitizeBrunoString(String(payload.notes), 5000) : null;
  }
  if (payload.location !== undefined) {
    updates.location = payload.location ? sanitizeBrunoString(String(payload.location), 500) : null;
  }

  if (payload.startTime || payload.start_time || payload.endTime || payload.end_time || payload.durationMinutes) {
    let times: { startTime: string; endTime: string };
    try {
      times = resolveTimeBlockTimes(
        {
          startTime: (payload.startTime as string | undefined) ?? existing.start_time ?? undefined,
          start_time: payload.start_time as string | undefined,
          endTime: payload.endTime as string | undefined,
          end_time: payload.end_time as string | undefined,
          durationMinutes: payload.durationMinutes as number | undefined,
          duration_minutes: payload.duration_minutes as number | undefined,
        },
        {
          title: action.title || existing.title,
          description: action.description,
          hintTexts: ctx.userPrompt ? [ctx.userPrompt] : [],
          timeZone: ctx.timeZone ?? 'UTC',
        }
      );
    } catch (error) {
      return humanError(error instanceof Error ? error.message : 'Invalid event time.');
    }
    updates = {
      ...updates,
      start_time: times.startTime,
      end_time: times.endTime,
    };
  }

  const googleIdentity = googleCalendarIdentity(existing);
  if (googleIdentity) {
    const syncResult = await pushEventToGoogle(ctx.userId, {
      ...existing,
      ...updates,
      metadata: {
        ...metadataRecord(existing.metadata),
        google_event_id: googleIdentity.eventId,
        ...(googleIdentity.calendarId ? { google_calendar_id: googleIdentity.calendarId } : {}),
      },
    });
    if (!syncResult?.success) {
      return humanError('Could not update the event in Google Calendar. No local changes were made.');
    }
  }

  const { data, error } = await ctx.supabase
    .from('calendar_events')
    .update(updates)
    .eq('id', existing.id)
    .eq('user_id', ctx.userId)
    .eq('is_deleted', false)
    .select('id, title, start_time, end_time')
    .maybeSingle();

  if (error || !data) return humanError('Could not update the calendar event.');

  if (googleIdentity) {
    try {
      // Non-force reconcile only; the change is already written to Google and
      // locally. Avoids re-fetching/re-diffing the whole window mid-batch.
      await syncGoogleCalendar(ctx.userId, false);
    } catch {
      // non-fatal after a verified write/local update
    }
  }

  return {
    success: true,
    data: {
      eventId: data.id,
      title: data.title,
      startTime: data.start_time,
      endTime: data.end_time,
    },
  };
}

async function executeDeleteCalendarEvent(action: ProposedAction, ctx: ExecuteActionContext): Promise<BrunoToolResult> {
  const destructiveError = assertDestructiveConfirmation(action);
  if (destructiveError) return destructiveError;

  const payload = getPayload(ctx, action);
  const eventId = typeof payload.eventId === 'string' && payload.eventId.length > 0 ? payload.eventId : undefined;
  if (!hasCalendarIdentitySignal(action, payload)) {
    return humanError(
      'I could not identify which calendar event to delete. Ask Bruno to regenerate the proposal so it includes the event ID.'
    );
  }

  const existing = await findCalendarEventForMutation(action, ctx, payload, eventId);

  if (!existing) return humanError('Event not found or access denied.');

  const writeAccessError = await assertGoogleWriteAccessIfNeeded(existing, ctx);
  if (writeAccessError) return writeAccessError;

  const googleIdentity = googleCalendarIdentity(existing);
  if (googleIdentity) {
    const syncResult = await deleteEventFromGoogle(
      ctx.userId,
      googleIdentity.eventId,
      googleIdentity.calendarId
    );
    if (!syncResult?.success) {
      return humanError('Could not delete the event in Google Calendar. No local changes were made.');
    }
  }

  const { error } = await ctx.supabase
    .from('calendar_events')
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', existing.id)
    .eq('user_id', ctx.userId);

  if (error) return humanError('Could not delete the calendar event.');

  try {
    // Non-force reconcile after a verified Google delete + local update.
    await syncGoogleCalendar(ctx.userId, false);
  } catch {
    // non-fatal
  }

  return { success: true, data: { eventId: existing.id, title: existing.title } };
}

async function executeUpdateDailyPlan(action: ProposedAction, ctx: ExecuteActionContext): Promise<BrunoToolResult> {
  const payload = getPayload(ctx, action);
  const planAction = (payload.planAction as string) || 'accept';

  if (planAction === 'regenerate') {
    const { data: profile } = await ctx.supabase
      .from('users')
      .select('scheduling_preferences')
      .eq('id', ctx.userId)
      .maybeSingle();
    const scheduling = profile?.scheduling_preferences as { timezone?: string } | null;
    const timezone = ctx.timeZone ?? scheduling?.timezone ?? 'UTC';

    try {
      const result = await generateDailyPlan({ userId: ctx.userId, timezone, force: true, trigger: 'manual' });
      return { success: true, data: { planSize: result.plan.length, message: result.message } };
    } catch {
      return humanError('Could not regenerate your daily plan.');
    }
  }

  if (planAction === 'reject' || payload.feedbackAction) {
    const blockId = payload.blockId as string | undefined;
    if (!blockId) return humanError('Block ID is required to update a plan block.');

    const feedback = (payload.feedbackAction as string) || 'too_vague';
    const newStatus = feedback === 'accept' ? 'accepted' : 'rejected';

    const { data: block, error: blockError } = await ctx.supabase
      .from('calendar_events')
      .select('*')
      .eq('id', blockId)
      .eq('user_id', ctx.userId)
      .maybeSingle();

    if (blockError || !block) return humanError('Plan block not found.');

    const { error: updateError } = await ctx.supabase
      .from('calendar_events')
      .update({ status: newStatus })
      .eq('id', blockId)
      .eq('user_id', ctx.userId);

    if (updateError) return humanError('Could not update the plan block.');

    if (feedback !== 'accept') {
      await ctx.supabase.from('ai_feedback').insert({
        user_id: ctx.userId,
        feature_name: 'daily_plan_block',
        action: feedback,
        suggestion_json: block as unknown as Json,
      });
    }

    try {
      const duration =
        block.end_time && block.start_time
          ? Math.round((new Date(block.end_time).getTime() - new Date(block.start_time).getTime()) / 60_000)
          : 30;
      await recordScheduleBlockFeedbackInMemory(ctx.supabase, ctx.userId, feedback, {
        type: block.energy_level === 'low' ? 'break' : 'focus',
        duration,
        title: block.title,
      });
    } catch {
      // non-fatal
    }

    return { success: true, data: { blockId, status: newStatus } };
  }

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date();
  dayEnd.setHours(23, 59, 59, 999);

  const { data: pendingBlocks } = await ctx.supabase
    .from('calendar_events')
    .select('id')
    .eq('user_id', ctx.userId)
    .eq('is_ai_suggested', true)
    .eq('status', 'pending')
    .gte('start_time', dayStart.toISOString())
    .lte('start_time', dayEnd.toISOString());

  if (!pendingBlocks?.length) return { success: true, data: { accepted: 0 } };

  const { error: updateError } = await ctx.supabase
    .from('calendar_events')
    .update({ status: 'accepted' })
    .eq('user_id', ctx.userId)
    .eq('is_ai_suggested', true)
    .eq('status', 'pending')
    .gte('start_time', dayStart.toISOString())
    .lte('start_time', dayEnd.toISOString());

  if (updateError) return humanError('Could not accept the daily plan.');
  return { success: true, data: { accepted: pendingBlocks.length } };
}

function parseNoteKind(value: unknown): (typeof NOTE_KIND_VALUES)[number] {
  if (typeof value === 'string' && (NOTE_KIND_VALUES as readonly string[]).includes(value)) {
    return value as (typeof NOTE_KIND_VALUES)[number];
  }
  return 'bruno_generated';
}

async function executeCreateNote(action: ProposedAction, ctx: ExecuteActionContext): Promise<BrunoToolResult> {
  const payload = getPayload(ctx, action);
  const markdown = sanitizeBrunoString(String(payload.contentMarkdown ?? ''), 500_000);

  const { data, error } = await createNoteRecord(ctx.supabase, ctx.userId, {
    title: sanitizeBrunoString(String(payload.noteTitle || action.title || 'Untitled Note'), 500),
    subject: payload.subject ? sanitizeBrunoString(String(payload.subject), 200) : undefined,
    content: markdown,
    isBrunoContent: true,
    noteKind: parseNoteKind(payload.noteKind),
    notebookId: (payload.notebookId as string) || undefined,
    linkedTaskId: (payload.linkedTaskId as string) || undefined,
  });

  if (error || !data) {
    Sentry.captureException(error ?? new Error('Note create failed'), { tags: { userId: ctx.userId, actionType: 'CREATE_NOTE' } });
    return humanError('Could not create the note.');
  }
  return { success: true, data: { noteId: data.id, title: data.title } };
}

async function executeUpdateNote(action: ProposedAction, ctx: ExecuteActionContext): Promise<BrunoToolResult> {
  const payload = getPayload(ctx, action);
  const noteId = payload.noteId as string | undefined;
  if (!noteId) return humanError('Note ID is required to update a note.');

  const { data: existing } = await ctx.supabase
    .from('notes')
    .select('id')
    .eq('id', noteId)
    .eq('user_id', ctx.userId)
    .maybeSingle();

  if (!existing) return humanError('Note not found or access denied.');

  const updates: Parameters<typeof updateNoteRecord>[3] = {};
  if (payload.noteTitle) updates.title = sanitizeBrunoString(String(payload.noteTitle), 500);
  if (payload.subject !== undefined) updates.subject = sanitizeBrunoString(String(payload.subject), 200);
  if (payload.notebookId) updates.notebookId = payload.notebookId as string;
  if (payload.linkedTaskId) updates.linkedTaskId = payload.linkedTaskId as string;
  if (payload.isPinned !== undefined) updates.isPinned = Boolean(payload.isPinned);
  if (payload.contentMarkdown !== undefined) {
    const markdown = sanitizeBrunoString(String(payload.contentMarkdown), 500_000);
    updates.contentJson = markdownToStructuredBlocks(markdown, BRUNO_SECTION_MAP);
    updates.content = markdown;
  }

  const { data, error } = await updateNoteRecord(ctx.supabase, ctx.userId, noteId, updates);
  if (error || !data) return humanError('Could not update the note.');
  return { success: true, data: { noteId: data.id, title: data.title } };
}

async function executeAppendToNote(action: ProposedAction, ctx: ExecuteActionContext): Promise<BrunoToolResult> {
  const payload = getPayload(ctx, action);
  const noteId = payload.noteId as string | undefined;
  if (!noteId) return humanError('Note ID is required to append to a note.');

  const { data: existing } = await ctx.supabase
    .from('notes')
    .select('id, title, content_json')
    .eq('id', noteId)
    .eq('user_id', ctx.userId)
    .maybeSingle();

  if (!existing) return humanError('Note not found or access denied.');

  const appendMarkdown = sanitizeBrunoString(String(payload.appendMarkdown ?? ''), 100_000);
  const newBlocks = markdownToStructuredBlocks(appendMarkdown, BRUNO_SECTION_MAP);
  const existingBlocks = (existing.content_json as BlockNoteBlock[] | null) ?? [];
  const mergedBlocks = [...existingBlocks, ...newBlocks];
  const markdown = blocksToMarkdown(mergedBlocks);

  const { data, error } = await updateNoteRecord(ctx.supabase, ctx.userId, noteId, {
    contentJson: mergedBlocks,
    content: markdown,
  });

  if (error || !data) return humanError('Could not append to the note.');
  return { success: true, data: { noteId: data.id, title: data.title } };
}

async function executeArchiveNote(action: ProposedAction, ctx: ExecuteActionContext): Promise<BrunoToolResult> {
  const noteId = getPayload(ctx, action).noteId as string | undefined;
  if (!noteId) return humanError('Note ID is required to archive a note.');

  const { data, error } = await updateNoteRecord(ctx.supabase, ctx.userId, noteId, { isArchived: true });
  if (error || !data) return humanError('Note not found or could not be archived.');
  return { success: true, data: { noteId: data.id, title: data.title } };
}

type PlanStepResult = {
  ref?: string;
  type: string;
  title: string;
  success: boolean;
  error?: string;
  entityId?: string;
};

const PLAN_REF_FIELDS: Array<[refKey: string, targetKey: string]> = [
  ['taskIdRef', 'taskId'],
  ['eventIdRef', 'eventId'],
  ['noteIdRef', 'noteId'],
  ['linkedTaskIdRef', 'linkedTaskId'],
];

/**
 * Execute an ordered multi-step plan under a single confirmation. Steps run
 * sequentially; a step may name itself with `ref` and later steps can point
 * at the created entity via `taskIdRef` / `eventIdRef` / `noteIdRef` /
 * `linkedTaskIdRef`. Execution halts at the first failure and reports which
 * steps completed.
 */
async function executeApplyPlan(
  action: ProposedAction,
  ctx: ExecuteActionContext
): Promise<BrunoToolResult> {
  const payload = getPayload(ctx, action);
  const rawSteps = Array.isArray(payload.steps) ? payload.steps : [];
  if (rawSteps.length === 0) {
    return humanError('This plan has no steps to apply.');
  }
  if (rawSteps.length > 20) {
    return humanError('Plans are limited to 20 steps. Split this into smaller plans.');
  }

  const refs: Record<string, string> = {};
  const results: PlanStepResult[] = [];

  for (const rawStep of rawSteps) {
    const stepRecord =
      typeof rawStep === 'object' && rawStep !== null
        ? (rawStep as Record<string, unknown>)
        : {};
    const refName =
      typeof stepRecord.ref === 'string' ? stepRecord.ref : undefined;

    const parsedStep = proposedActionBaseSchema.safeParse(
      coerceProposedActionInput(stepRecord)
    );
    if (!parsedStep.success || parsedStep.data.type === 'APPLY_PLAN') {
      results.push({
        ref: refName,
        type: String(stepRecord.type ?? 'UNKNOWN'),
        title: String(stepRecord.title ?? 'Step'),
        success: false,
        error: !parsedStep.success
          ? 'Step is not a valid action.'
          : 'Nested plans are not allowed.',
      });
      break;
    }

    const step = parsedStep.data;
    const stepPayload: Record<string, unknown> = { ...(step.payload ?? {}) };
    for (const [refKey, targetKey] of PLAN_REF_FIELDS) {
      const pointer = stepPayload[refKey];
      if (typeof pointer === 'string' && refs[pointer]) {
        stepPayload[targetKey] = refs[pointer];
      }
      delete stepPayload[refKey];
    }

    const result = await executeAction(
      { ...step, payload: stepPayload },
      { ...ctx, mergedPayload: undefined }
    );

    const data =
      result.data && typeof result.data === 'object'
        ? (result.data as Record<string, unknown>)
        : {};
    const entityId = [data.taskId, data.eventId, data.noteId, data.blockId].find(
      (value): value is string => typeof value === 'string' && value.length > 0
    );
    if (result.success && refName && entityId) {
      refs[refName] = entityId;
    }

    results.push({
      ref: refName,
      type: step.type,
      title: step.title,
      success: result.success,
      error: result.error,
      entityId,
    });

    if (!result.success) break;
  }

  const completedSteps = results.filter((step) => step.success).length;
  const allSucceeded = completedSteps === rawSteps.length;
  const lastResult = results[results.length - 1];

  return {
    success: allSucceeded,
    ...(allSucceeded
      ? {}
      : {
          error: `Applied ${completedSteps} of ${rawSteps.length} steps, then stopped at "${lastResult?.title ?? 'unknown step'}": ${lastResult?.error ?? 'unknown error'}`,
        }),
    data: {
      planSummary:
        typeof payload.planSummary === 'string' ? payload.planSummary : undefined,
      steps: results,
      completedSteps,
      totalSteps: rawSteps.length,
    },
  };
}

export async function executeAction(
  action: ProposedAction,
  ctx: ExecuteActionContext
): Promise<BrunoToolResult> {
  try {
    switch (action.type) {
      case 'CREATE_TASK':
        return executeCreateTask(action, ctx);
      case 'UPDATE_TASK':
        return executeUpdateTask(action, ctx);
      case 'RESCHEDULE_TASK':
        return executeRescheduleTask(action, ctx);
      case 'DELETE_TASK':
        return executeDeleteTask(action, ctx);
      case 'CREATE_TIME_BLOCK':
        return executeCreateTimeBlock(action, ctx);
      case 'UPDATE_CALENDAR_EVENT':
        return executeUpdateCalendarEvent(action, ctx);
      case 'DELETE_CALENDAR_EVENT':
        return executeDeleteCalendarEvent(action, ctx);
      case 'UPDATE_DAILY_PLAN':
        return executeUpdateDailyPlan(action, ctx);
      case 'CREATE_NOTE':
        return executeCreateNote(action, ctx);
      case 'UPDATE_NOTE':
        return executeUpdateNote(action, ctx);
      case 'APPEND_TO_NOTE':
        return executeAppendToNote(action, ctx);
      case 'ARCHIVE_NOTE':
        return executeArchiveNote(action, ctx);
      case 'APPLY_PLAN':
        return executeApplyPlan(action, ctx);
      case 'EXPLAIN_PLAN':
      case 'NO_ACTION':
        return { success: true, data: { noOp: true } };
      default: {
        const unknownType: never = action.type;
        return humanError(`Unsupported action type: ${String(unknownType)}`);
      }
    }
  } catch (error) {
    Sentry.captureException(error, { tags: { userId: ctx.userId, actionType: action.type } });
    return humanError('Something went wrong while executing that action.');
  }
}

export async function logExecuteActionAudit(
  supabase: Supabase,
  input: {
    userId: string;
    toolName: string;
    actionType: string;
    entityId?: string;
    entityTitle?: string;
    success: boolean;
  }
): Promise<void> {
  try {
    await supabase.from('bruno_tool_logs').insert({
      user_id: input.userId,
      tool_name: input.toolName,
      arguments: {
        actionType: input.actionType,
        entityId: input.entityId,
        entityTitle: input.entityTitle,
      },
      result: { success: input.success },
    });
  } catch (error) {
    Sentry.captureException(error, { tags: { userId: input.userId, toolName: input.toolName } });
  }
}
