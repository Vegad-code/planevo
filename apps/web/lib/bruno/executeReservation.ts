import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/database';

type Supabase = SupabaseClient<Database>;
const STALE_EXECUTION_MS = 5 * 60 * 1000;

export type ExecuteReservationStatus =
  | 'pending'
  | 'executing'
  | 'executed'
  | 'failed';

export type ExecuteReservationResult =
  | {
      kind: 'reserved';
      executionLogId: string;
    }
  | {
      kind: 'already_executed';
      data: Record<string, unknown>;
    }
  | {
      kind: 'in_flight';
    }
  | {
      kind: 'retry';
      executionLogId: string;
    }
  | {
      kind: 'error';
      message: string;
    };

function readExecutionStatus(result: unknown): ExecuteReservationStatus | null {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return null;
  const status = (result as Record<string, unknown>).status;
  if (
    status === 'pending' ||
    status === 'executing' ||
    status === 'executed' ||
    status === 'failed'
  ) {
    return status;
  }
  return null;
}

function isStaleExecution(createdAt: unknown, now = Date.now()): boolean {
  if (typeof createdAt !== 'string') return false;
  const createdMs = new Date(createdAt).getTime();
  return Number.isFinite(createdMs) && now - createdMs > STALE_EXECUTION_MS;
}

export async function reserveBrunoExecution(input: {
  supabase: Supabase;
  userId: string;
  proposalId: string;
  actionType: string;
  loggedPayload: Record<string, unknown>;
}): Promise<ExecuteReservationResult> {
  const idempotencyKey = `execute:${input.proposalId}`;
  const argumentsRow = {
    proposalId: input.proposalId,
    action_type: input.actionType,
    payload: input.loggedPayload,
    status: 'pending' as const,
  };

  const reservation = await input.supabase
    .from('bruno_tool_logs')
    .insert({
      user_id: input.userId,
      tool_name: 'execute_action',
      idempotency_key: idempotencyKey,
      arguments: argumentsRow as Json,
      result: { status: 'pending' } as Json,
    })
    .select('id')
    .single();

  if (!reservation.error) {
    const markExecuting = await input.supabase
      .from('bruno_tool_logs')
      .update({
        arguments: { ...argumentsRow, status: 'executing' } as Json,
        result: { status: 'executing' } as Json,
      })
      .eq('id', reservation.data.id)
      .eq('user_id', input.userId);

    if (markExecuting.error) {
      return { kind: 'error', message: 'Could not reserve execution.' };
    }

    return { kind: 'reserved', executionLogId: reservation.data.id };
  }

  if (reservation.error.code !== '23505') {
    return { kind: 'error', message: 'Could not reserve execution.' };
  }

  const { data: existing } = await input.supabase
    .from('bruno_tool_logs')
    .select('id, result, arguments, created_at')
    .eq('user_id', input.userId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (!existing) {
    return { kind: 'error', message: 'Could not reserve execution.' };
  }

  const existingResult =
    existing.result && typeof existing.result === 'object' && !Array.isArray(existing.result)
      ? (existing.result as Record<string, unknown>)
      : {};
  const status = readExecutionStatus(existingResult);

  if (status === 'executed') {
    const { status: _status, ...data } = existingResult;
    return { kind: 'already_executed', data };
  }

  if ((status === 'executing' || status === 'pending') && isStaleExecution(existing.created_at)) {
    await input.supabase
      .from('bruno_tool_logs')
      .update({
        arguments: { ...argumentsRow, status: 'executing' } as Json,
        result: { status: 'executing' } as Json,
      })
      .eq('id', existing.id)
      .eq('user_id', input.userId);

    return { kind: 'retry', executionLogId: existing.id };
  }

  if (status === 'executing' || status === 'pending') {
    return { kind: 'in_flight' };
  }

  if (status === 'failed') {
    await input.supabase
      .from('bruno_tool_logs')
      .update({
        arguments: { ...argumentsRow, status: 'executing' } as Json,
        result: { status: 'executing' } as Json,
      })
      .eq('id', existing.id)
      .eq('user_id', input.userId);

    return { kind: 'retry', executionLogId: existing.id };
  }

  return { kind: 'in_flight' };
}

export async function finalizeBrunoExecution(input: {
  supabase: Supabase;
  executionLogId: string;
  userId: string;
  success: boolean;
  resultData?: Record<string, unknown>;
  error?: string;
}): Promise<void> {
  const result: Record<string, unknown> = input.success
    ? { status: 'executed', ...(input.resultData ?? {}) }
    : { status: 'failed', error: input.error ?? 'Execution failed' };

  await input.supabase
    .from('bruno_tool_logs')
    .update({ result: result as Json })
    .eq('id', input.executionLogId)
    .eq('user_id', input.userId);
}
