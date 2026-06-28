import { NextRequest, NextResponse } from 'next/server';
import { getActionDefinition } from '@/lib/bruno/tools/registry';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { executeAction, logExecuteActionAudit } from '@/lib/bruno/executeAction';
import {
  executeActionRequestSchema,
  toProposedAction,
  EXECUTABLE_V3_ACTION_TYPES,
  type ExecuteActionRequest,
} from '@/lib/bruno/tools/schemas';
import type { Json } from '@/types/database';

export async function POST(request: NextRequest) {
  if (!isAllowedOriginOrBearer(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const { user, error: authError } = await getAuthenticatedUser(request);
  if (!user || authError) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = executeActionRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid action payload' }, { status: 400 });
  }

  const isV3Executable = EXECUTABLE_V3_ACTION_TYPES.has(parsed.data.type);
  const actionDef = getActionDefinition(parsed.data.type);
  if (!isV3Executable && !actionDef?.executable) {
    return NextResponse.json({ success: false, error: 'Action is not executable' }, { status: 403 });
  }

  const proposalWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: matchingProposals } = await supabaseAdmin
    .from('bruno_tool_logs')
    .select('id, arguments')
    .eq('user_id', user.id)
    .eq('tool_name', 'propose_action')
    .contains('arguments', { type: parsed.data.type, title: parsed.data.title })
    .gte('created_at', proposalWindowStart)
    .order('created_at', { ascending: false })
    .limit(1);

  const matchingProposal = matchingProposals?.[0] ?? null;
  const loggedArguments =
    matchingProposal?.arguments && typeof matchingProposal.arguments === 'object' && !Array.isArray(matchingProposal.arguments)
      ? (matchingProposal.arguments as Record<string, unknown>)
      : null;
  const loggedPayload =
    loggedArguments?.payload && typeof loggedArguments.payload === 'object' && !Array.isArray(loggedArguments.payload)
      ? (loggedArguments.payload as Record<string, unknown>)
      : {};

  const { data: profile } = await supabaseAdmin.from('users').select('scheduling_preferences').eq('id', user.id).maybeSingle();
  const prefs = (profile?.scheduling_preferences ?? {}) as Record<string, unknown>;
  const resolvedTimeZone =
    parsed.data.timeZone ?? (typeof prefs.timezone === 'string' ? prefs.timezone : undefined) ?? 'UTC';

  if (!matchingProposal) {
    return NextResponse.json(
      { success: false, error: 'Proposal could not be verified. Please ask Bruno to regenerate it.' },
      { status: 403 }
    );
  }

  const idempotencyKey = `execute:${parsed.data.proposalId}`;
  const { data: reserved, error: reserveError } = await supabaseAdmin
    .from('bruno_tool_logs')
    .insert({
      user_id: user.id,
      tool_name: 'execute_action',
      idempotency_key: idempotencyKey,
      arguments: {
        proposalId: parsed.data.proposalId,
        action_type: parsed.data.type,
        payload: parsed.data.payload,
        status: 'pending',
      } as Json,
      result: {},
    })
    .select('id, result')
    .single();

  if (reserveError?.code === '23505') {
    const { data: existingExecution } = await supabaseAdmin
      .from('bruno_tool_logs')
      .select('id, result')
      .eq('user_id', user.id)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (existingExecution) {
      const existingResult =
        existingExecution.result &&
        typeof existingExecution.result === 'object' &&
        !Array.isArray(existingExecution.result)
          ? (existingExecution.result as Record<string, unknown>)
          : {};

      if (existingResult.status === 'executed') {
        const { status: _status, ...data } = existingResult;
        return NextResponse.json({
          success: true,
          message: 'Action already executed.',
          duplicate: true,
          ...data,
        });
      }

      return NextResponse.json(
        {
          success: false,
          error:
            typeof existingResult.error === 'string'
              ? existingResult.error
              : 'That action did not finish. Please ask Bruno to regenerate the proposal.',
          duplicate: true,
        },
        { status: existingResult.status === 'failed' ? 400 : 409 }
      );
    }
  } else if (reserveError) {
    return NextResponse.json({ success: false, error: 'Could not reserve execution.' }, { status: 500 });
  }

  const proposedAction = toProposedAction({
    proposalId: parsed.data.proposalId,
    type: parsed.data.type,
    title: (parsed.data.title ?? loggedArguments?.title ?? parsed.data.type) as string,
    description: (parsed.data.description ?? loggedArguments?.description ?? '') as string,
    userPrompt: parsed.data.userPrompt,
    timeZone: parsed.data.timeZone,
    riskLevel:
      parsed.data.riskLevel ??
      (loggedArguments?.riskLevel as 'low' | 'medium' | 'high' | undefined),
    requiresConfirmation:
      parsed.data.requiresConfirmation ??
      (loggedArguments?.requiresConfirmation as boolean | undefined),
    payload: parsed.data.payload,
  } as ExecuteActionRequest);

  const result = await executeAction(proposedAction, {
    userId: user.id,
    supabase: supabaseAdmin,
    timeZone: resolvedTimeZone,
    userPrompt: parsed.data.userPrompt,
    mergedPayload: { ...loggedPayload, ...parsed.data.payload },
  });

  if (!result.success) {
    if (reserved?.id) {
      await supabaseAdmin.from('bruno_tool_logs').update({ result: { status: 'failed', error: result.error } }).eq('id', reserved.id);
    }
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
    actionType: parsed.data.type,
    entityId,
    entityTitle: parsed.data.title,
    success: true,
  });

  if (reserved?.id) {
    await supabaseAdmin
      .from('bruno_tool_logs')
      .update({ result: { status: 'executed', ...((result.data as Record<string, unknown> | undefined) ?? {}) } })
      .eq('id', reserved.id);
  }

  return NextResponse.json({ success: true, ...((result.data as Record<string, unknown> | undefined) ?? {}) });
}
