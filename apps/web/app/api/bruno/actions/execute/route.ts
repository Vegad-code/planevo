import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getActionDefinition } from '@/lib/bruno/tools/registry';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { executeAction, logExecuteActionAudit } from '@/lib/bruno/executeAction';
import {
  finalizeBrunoExecution,
  reserveBrunoExecution,
} from '@/lib/bruno/executeReservation';
import {
  buildAuthorizedExecuteRequest,
  detectClientPayloadTampering,
} from '@/lib/bruno/verifiedProposalPayload';
import {
  toProposedAction,
  EXECUTABLE_V3_ACTION_TYPES,
} from '@/lib/bruno/tools/schemas';
import { parseBrunoDataAccess, type BrunoDataAccess } from '@/lib/bruno/types';

/**
 * Record the execution outcome as an assistant message so the next chat turn
 * (and a reloaded conversation) knows what actually happened — without this,
 * the model never learns whether the user's confirmed action succeeded.
 */
async function recordExecutionOutcome(input: {
  userId: string;
  conversationId: unknown;
  title: string;
  success: boolean;
  error?: string;
}): Promise<void> {
  if (typeof input.conversationId !== 'string' || !input.conversationId) return;
  try {
    const { data: conversation } = await supabaseAdmin
      .from('chat_conversations')
      .select('id')
      .eq('id', input.conversationId)
      .eq('user_id', input.userId)
      .maybeSingle();
    if (!conversation) return;

    const content = input.success
      ? `✅ Done — ${input.title}`
      : `⚠️ Couldn't complete "${input.title}": ${input.error ?? 'unknown error'}`;
    await supabaseAdmin.from('bruno_messages').insert({
      user_id: input.userId,
      conversation_id: input.conversationId,
      content,
      message_type: 'assistant',
    });
  } catch (error) {
    Sentry.captureException(error);
  }
}

function actionAccessError(
  actionType: string,
  access: BrunoDataAccess
): string | null {
  const taskActions = new Set([
    'CREATE_TASK',
    'UPDATE_TASK',
    'RESCHEDULE_TASK',
    'DELETE_TASK',
  ]);
  const calendarActions = new Set([
    'CREATE_TIME_BLOCK',
    'UPDATE_CALENDAR_EVENT',
    'DELETE_CALENDAR_EVENT',
    'UPDATE_DAILY_PLAN',
  ]);

  if (taskActions.has(actionType) && !access.tasks) {
    return 'Task access is disabled for Bruno. Enable Task Access in Settings > Bruno Preferences, then ask Bruno again.';
  }

  if (calendarActions.has(actionType) && !access.calendar) {
    return 'Calendar access is disabled for Bruno. Enable Calendar Access in Settings > Bruno Preferences, then ask Bruno again.';
  }

  return null;
}

export async function POST(request: NextRequest) {
  let executionLogId: string | null = null;
  let userId: string | null = null;

  try {
    if (!isAllowedOriginOrBearer(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    userId = user.id;

    const body = await request.json();
    const proposalId = typeof body?.proposalId === 'string' ? body.proposalId : null;
    const type = typeof body?.type === 'string' ? body.type : null;

    if (!proposalId || !type) {
      return NextResponse.json({ success: false, error: 'Invalid action payload' }, { status: 400 });
    }

    const isV3Executable = EXECUTABLE_V3_ACTION_TYPES.has(type as never);
    const actionDef = getActionDefinition(type);
    if (!isV3Executable && !actionDef?.executable) {
      return NextResponse.json({ success: false, error: 'Action is not executable' }, { status: 403 });
    }

    const proposalWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: exactProposal } = await supabaseAdmin
      .from('bruno_tool_logs')
      .select('id, arguments')
      .eq('user_id', user.id)
      .eq('tool_name', 'propose_action')
      .eq('idempotency_key', `proposal:${proposalId}`)
      .maybeSingle();

    const { data: proposalIdMatches } = exactProposal
      ? { data: [] as Array<{ id: string; arguments: unknown }> }
      : await supabaseAdmin
          .from('bruno_tool_logs')
          .select('id, arguments')
          .eq('user_id', user.id)
          .eq('tool_name', 'propose_action')
          .contains('arguments', { proposalId })
          .gte('created_at', proposalWindowStart)
          .order('created_at', { ascending: false })
          .limit(1);

    // No (type, title) fallback: matching merely on type+title within 24h can
    // execute a different, older proposal than the card the user clicked.
    const matchingProposal = exactProposal ?? proposalIdMatches?.[0] ?? null;

    if (!matchingProposal?.arguments || typeof matchingProposal.arguments !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Proposal could not be verified. Please ask Bruno to regenerate it.' },
        { status: 403 }
      );
    }

    const loggedArguments = matchingProposal.arguments as Record<string, unknown>;
    const loggedPayload =
      loggedArguments.payload &&
      typeof loggedArguments.payload === 'object' &&
      !Array.isArray(loggedArguments.payload)
        ? (loggedArguments.payload as Record<string, unknown>)
        : {};

    const clientPayload =
      body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload)
        ? (body.payload as Record<string, unknown>)
        : undefined;

    const tamperError = detectClientPayloadTampering(clientPayload, loggedPayload);
    if (tamperError) {
      return NextResponse.json({ success: false, error: tamperError }, { status: 403 });
    }

    const authorized = buildAuthorizedExecuteRequest(proposalId, loggedArguments, {
      userPrompt: typeof body.userPrompt === 'string' ? body.userPrompt : undefined,
      timeZone: typeof body.timeZone === 'string' ? body.timeZone : undefined,
    });
    if ('error' in authorized) {
      return NextResponse.json({ success: false, error: authorized.error }, { status: 403 });
    }

    if (authorized.type !== type) {
      return NextResponse.json(
        { success: false, error: 'Proposal type does not match the logged record.' },
        { status: 403 }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('scheduling_preferences')
      .eq('id', user.id)
      .maybeSingle();
    const prefs = (profile?.scheduling_preferences ?? {}) as Record<string, unknown>;
    const resolvedTimeZone =
      authorized.timeZone ??
      (typeof prefs.timezone === 'string' ? prefs.timezone : undefined) ??
      'UTC';
    const dataAccess = parseBrunoDataAccess(prefs);
    const accessError = actionAccessError(authorized.type, dataAccess);
    if (accessError) {
      return NextResponse.json({ success: false, error: accessError }, { status: 403 });
    }

    // A plan is only executable if every step passes the same per-domain gate.
    if (authorized.type === 'APPLY_PLAN') {
      const steps = Array.isArray(
        (authorized.payload as Record<string, unknown>)?.steps
      )
        ? ((authorized.payload as Record<string, unknown>).steps as Array<
            Record<string, unknown>
          >)
        : [];
      for (const step of steps) {
        const stepError =
          typeof step?.type === 'string'
            ? actionAccessError(step.type, dataAccess)
            : null;
        if (stepError) {
          return NextResponse.json(
            { success: false, error: stepError },
            { status: 403 }
          );
        }
      }
    }

    const reservation = await reserveBrunoExecution({
      supabase: supabaseAdmin,
      userId: user.id,
      proposalId,
      actionType: authorized.type,
      loggedPayload,
    });

    if (reservation.kind === 'already_executed') {
      return NextResponse.json({
        success: true,
        message: 'Action already executed.',
        duplicate: true,
        ...reservation.data,
      });
    }

    if (reservation.kind === 'in_flight') {
      return NextResponse.json(
        {
          success: false,
          error: 'That action is still running. Wait a moment, then try again.',
          duplicate: true,
        },
        { status: 409 }
      );
    }

    if (reservation.kind === 'error') {
      return NextResponse.json({ success: false, error: reservation.message }, { status: 500 });
    }

    executionLogId = reservation.executionLogId;
    const proposedAction = toProposedAction(authorized);
    const mergedPayload = authorized.payload ?? {};

    const result = await executeAction(proposedAction, {
      userId: user.id,
      supabase: supabaseAdmin,
      timeZone: resolvedTimeZone,
      userPrompt: authorized.userPrompt,
      mergedPayload,
    });

    if (!result.success) {
      await finalizeBrunoExecution({
        supabase: supabaseAdmin,
        executionLogId,
        userId: user.id,
        success: false,
        error: result.error ?? 'Execution failed',
      });
      await recordExecutionOutcome({
        userId: user.id,
        conversationId: body.conversationId,
        title: authorized.title ?? authorized.type,
        success: false,
        error: result.error ?? 'Execution failed',
      });
      return NextResponse.json({ success: false, error: result.error ?? 'Execution failed' }, { status: 400 });
    }

    const entityId =
      result.data && typeof result.data === 'object' && result.data !== null
        ? String(
            (result.data as Record<string, unknown>).taskId ??
              (result.data as Record<string, unknown>).eventId ??
              (result.data as Record<string, unknown>).noteId ??
              (result.data as Record<string, unknown>).blockId ??
              ''
          ) || undefined
        : undefined;

    await logExecuteActionAudit(supabaseAdmin, {
      userId: user.id,
      toolName: 'execute_action',
      actionType: authorized.type,
      entityId,
      entityTitle: authorized.title,
      success: true,
    });

    const resultData = (result.data as Record<string, unknown> | undefined) ?? {};
    await finalizeBrunoExecution({
      supabase: supabaseAdmin,
      executionLogId,
      userId: user.id,
      success: true,
      resultData,
    });
    await recordExecutionOutcome({
      userId: user.id,
      conversationId: body.conversationId,
      title: authorized.title ?? authorized.type,
      success: true,
    });

    return NextResponse.json({ success: true, ...resultData });
  } catch (error) {
    Sentry.captureException(error);
    if (executionLogId && userId) {
      await finalizeBrunoExecution({
        supabase: supabaseAdmin,
        executionLogId,
        userId,
        success: false,
        error: 'Unexpected error while executing action.',
      });
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Unexpected error while executing action. Please try again.',
      },
      { status: 500 }
    );
  }
}
