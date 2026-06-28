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
  pushEventToGoogle,
  syncGoogleCalendar,
} from '@/lib/integrations/google-calendar';
import { generateDailyPlan } from '@/lib/ai/generate-daily-plan';
import { recordScheduleBlockFeedbackInMemory } from '@/lib/ai/memory';
import {
  DESTRUCTIVE_ACTION_TYPES,
  NOTE_KIND_VALUES,
  type BrunoToolResult,
  type ProposedAction,
  sanitizeBrunoString,
} from '@/lib/bruno/tools/schemas';

type Supabase = SupabaseClient<Database>;

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
  return { success: true, data: { taskId: data.id, title: data.title } };
}

async function executeUpdateTask(action: ProposedAction, ctx: ExecuteActionContext): Promise<BrunoToolResult> {
  const payload = getPayload(ctx, action);
  const taskId = payload.taskId as string | undefined;
  if (!taskId) return humanError('Task ID is required to update a task.');

  const updates: Database['public']['Tables']['tasks']['Update'] = { updated_at: new Date().toISOString() };
  if (payload.taskTitle) updates.title = sanitizeBrunoString(String(payload.taskTitle), 500);
  if (payload.notes !== undefined) updates.description = sanitizeBrunoString(String(payload.notes), 5000);
  if (payload.priority) updates.priority = payload.priority as 'low' | 'medium' | 'high';
  if (payload.estimatedMinutes) updates.estimated_minutes = payload.estimatedMinutes as number;
  if (payload.dueDate !== undefined) updates.due_date = (payload.dueDate as string) || null;

  const { data, error } = await ctx.supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .eq('user_id', ctx.userId)
    .is('deleted_at', null)
    .select('id, title')
    .maybeSingle();

  if (error || !data) return humanError('Task not found or could not be updated.');
  return { success: true, data: { taskId: data.id, title: data.title } };
}

async function executeRescheduleTask(action: ProposedAction, ctx: ExecuteActionContext): Promise<BrunoToolResult> {
  const payload = getPayload(ctx, action);
  const taskId = payload.taskId as string | undefined;
  if (!taskId) return humanError('Task ID is required to reschedule a task.');

  const { data: existing } = await ctx.supabase
    .from('tasks')
    .select('id, rescheduled_count')
    .eq('id', taskId)
    .eq('user_id', ctx.userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!existing) return humanError('Task not found or access denied.');

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

  const { data, error } = await ctx.supabase
    .from('tasks')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('user_id', ctx.userId)
    .is('deleted_at', null)
    .select('id, title')
    .maybeSingle();

  if (error || !data) return humanError('Task not found or could not be removed.');
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

  // #region agent log
  fetch('http://127.0.0.1:7448/ingest/f1ed0e51-9957-4543-9501-c6ebb0ae9435',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'10720a'},body:JSON.stringify({sessionId:'10720a',hypothesisId:'A,D',location:'executeAction.ts:180',message:'executeCreateTimeBlock payload pre-resolve',data:{payloadStartTime:(payload as Record<string,unknown>).startTime,payloadStart_time:(payload as Record<string,unknown>).start_time,payloadDueDate:(payload as Record<string,unknown>).dueDate,payloadKeys:Object.keys(payload),actionTitle:action.title,actionDescription:action.description,userPrompt:ctx.userPrompt,timeZone:ctx.timeZone},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

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

  try {
    await pushEventToGoogle(ctx.userId, createdEvent);
    await syncGoogleCalendar(ctx.userId, true);
  } catch (syncError) {
    Sentry.captureException(syncError, { tags: { userId: ctx.userId, actionType: 'CREATE_TIME_BLOCK_SYNC' } });
  }

  return { success: true, data: { eventId: createdEvent.id, title: createdEvent.title } };
}

async function executeDeleteCalendarEvent(action: ProposedAction, ctx: ExecuteActionContext): Promise<BrunoToolResult> {
  const destructiveError = assertDestructiveConfirmation(action);
  if (destructiveError) return destructiveError;

  const eventId = getPayload(ctx, action).eventId as string | undefined;
  if (!eventId) return humanError('Event ID is required to delete a calendar event.');

  const { data: existing } = await ctx.supabase
    .from('calendar_events')
    .select('id, title, external_id, source')
    .eq('id', eventId)
    .eq('user_id', ctx.userId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (!existing) return humanError('Event not found or access denied.');

  const { error } = await ctx.supabase
    .from('calendar_events')
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', eventId)
    .eq('user_id', ctx.userId);

  if (error) return humanError('Could not delete the calendar event.');

  if (existing.external_id && existing.source === 'google_calendar') {
    try {
      await deleteEventFromGoogle(ctx.userId, existing.external_id);
    } catch (syncError) {
      Sentry.captureException(syncError, { tags: { userId: ctx.userId, actionType: 'DELETE_CALENDAR_EVENT_SYNC' } });
    }
  }

  try {
    await syncGoogleCalendar(ctx.userId, true);
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
