import type { SupabaseClient } from '@supabase/supabase-js';
import type { UIMessage } from 'ai';
import type { BrunoDataAccess } from '@/lib/bruno/types';
import type { Database } from '@/types/database';
import { actionAccessErrorDeep } from '@/lib/bruno/actionAccess';
import { executeAction, logExecuteActionAudit } from '@/lib/bruno/executeAction';
import {
  finalizeBrunoExecution,
  reserveBrunoExecution,
} from '@/lib/bruno/executeReservation';
import {
  assignProposalId,
  persistBrunoProposals,
} from '@/lib/bruno/proposalPersistence';
import { buildAuthorizedExecuteRequest } from '@/lib/bruno/verifiedProposalPayload';
import { toProposedAction } from '@/lib/bruno/tools/schemas';
import type { BrunoActionProposal } from '@/lib/bruno/tools/types';

type Supabase = SupabaseClient<Database>;

/**
 * Native approval loop (Phase B).
 *
 * Trust boundary: the ONLY thing the server accepts from the client on an
 * approval continuation is `{approvalId, approved}` pairs. Those are validated
 * against the approval requests the server itself persisted in
 * `bruno_messages.parts`; everything else the client sends about assistant or
 * tool state is ignored, exactly like the rest of the chat history.
 */

/** Approvals expire after 7 days; stale cards must be re-proposed. */
export const BRUNO_APPROVAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type ClientApprovalResponse = {
  approvalId: string;
  approved: boolean;
};

export type ValidatedApproval = ClientApprovalResponse & {
  toolCallId: string;
  toolName: string;
};

export type PendingApprovalState = {
  /** bruno_messages row id holding the approval-requested parts. */
  rowId: string;
  createdAt: string;
  /** The raw stored parts of that assistant row. */
  parts: unknown[];
  /** approvalId -> tool call info, for every pending approval in the row. */
  pending: Map<string, { toolCallId: string; toolName: string }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isToolPartType(type: unknown): type is string {
  return (
    typeof type === 'string' &&
    (type.startsWith('tool-') || type === 'dynamic-tool')
  );
}

function toolNameOfPart(part: Record<string, unknown>): string {
  if (part.type === 'dynamic-tool' && typeof part.toolName === 'string') {
    return part.toolName;
  }
  return String(part.type).slice('tool-'.length);
}

/**
 * Pull `{approvalId, approved}` pairs from the client's trailing assistant
 * message. This is pure parsing — no trust is placed in anything else on the
 * message, and `reason` strings are deliberately dropped (they would flow
 * into the model prompt).
 */
export function extractClientApprovalResponses(
  messages: Array<{ role: string; parts?: unknown[] }>
): ClientApprovalResponse[] {
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'assistant' || !Array.isArray(last.parts)) {
    return [];
  }

  const seen = new Set<string>();
  const responses: ClientApprovalResponse[] = [];
  for (const part of last.parts) {
    if (!isRecord(part) || !isToolPartType(part.type)) continue;
    if (part.state !== 'approval-responded') continue;
    const approval = part.approval;
    if (
      !isRecord(approval) ||
      typeof approval.id !== 'string' ||
      typeof approval.approved !== 'boolean' ||
      seen.has(approval.id)
    ) {
      continue;
    }
    seen.add(approval.id);
    responses.push({ approvalId: approval.id, approved: approval.approved });
  }
  return responses;
}

/**
 * A request "looks like" an approval continuation when its trailing message
 * carries approval responses. Used by the route for quota routing only; the
 * authoritative validation happens in `loadPendingApprovalState` +
 * `validateApprovalResponses`.
 */
export function looksLikeApprovalContinuation(
  messages: Array<{ role: string; parts?: unknown[] }>
): boolean {
  return extractClientApprovalResponses(messages).length > 0;
}

/**
 * Load the server-persisted pending approvals. Only the newest message of the
 * conversation qualifies: if anything (a user turn, another assistant turn)
 * came after the approval cards, the resume contract with the model prompt is
 * broken and the cards must be re-proposed.
 */
export async function loadPendingApprovalState(
  supabase: Supabase,
  userId: string,
  conversationId: string
): Promise<PendingApprovalState | null> {
  const { data: rows } = await supabase
    .from('bruno_messages')
    .select('id, message_type, parts, created_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  const row = rows?.[0];
  if (!row || row.message_type === 'user' || !Array.isArray(row.parts)) {
    return null;
  }

  const pending = new Map<string, { toolCallId: string; toolName: string }>();
  for (const part of row.parts) {
    if (!isRecord(part) || !isToolPartType(part.type)) continue;
    if (part.state !== 'approval-requested') continue;
    const approval = part.approval;
    if (!isRecord(approval) || typeof approval.id !== 'string') continue;
    if (typeof part.toolCallId !== 'string') continue;
    pending.set(approval.id, {
      toolCallId: part.toolCallId,
      toolName: toolNameOfPart(part),
    });
  }

  if (pending.size === 0) return null;

  return {
    rowId: row.id,
    createdAt: row.created_at,
    parts: row.parts,
    pending,
  };
}

/**
 * Keep only the client approval responses that match a server-persisted
 * pending approval within its TTL.
 */
export function validateApprovalResponses(
  state: PendingApprovalState,
  responses: ClientApprovalResponse[],
  now: number = Date.now()
): ValidatedApproval[] {
  const createdMs = new Date(state.createdAt).getTime();
  if (!Number.isFinite(createdMs) || now - createdMs > BRUNO_APPROVAL_TTL_MS) {
    return [];
  }

  const validated: ValidatedApproval[] = [];
  for (const response of responses) {
    const match = state.pending.get(response.approvalId);
    if (!match) continue;
    validated.push({ ...response, ...match });
  }
  return validated;
}

/**
 * Return a copy of `parts` where every approval-requested part matching a
 * validated approval becomes approval-responded. Non-matching parts are left
 * untouched.
 */
export function graftApprovalsIntoParts(
  parts: unknown[],
  validated: ValidatedApproval[]
): unknown[] {
  if (validated.length === 0) return parts;
  const byApprovalId = new Map(validated.map((v) => [v.approvalId, v]));

  return parts.map((part) => {
    if (!isRecord(part) || !isToolPartType(part.type)) return part;
    if (part.state !== 'approval-requested') return part;
    const approval = part.approval;
    if (!isRecord(approval) || typeof approval.id !== 'string') return part;
    const match = byApprovalId.get(approval.id);
    if (!match) return part;
    return {
      ...part,
      state: 'approval-responded',
      approval: { id: match.approvalId, approved: match.approved },
    };
  });
}

/**
 * Drop tool parts that are still awaiting an approval response. They cannot
 * be represented in a model prompt (a tool call with neither result nor
 * response), but they stay in the stored parts so the UI keeps showing them.
 */
export function stripUnresolvedApprovalParts(
  messages: UIMessage[]
): UIMessage[] {
  return messages.map((message) => {
    if (message.role !== 'assistant') return message;
    const parts = message.parts.filter((part) => {
      const record = part as unknown as Record<string, unknown>;
      if (!isToolPartType(record.type)) return true;
      return record.state !== 'approval-requested';
    });
    return parts.length === message.parts.length
      ? message
      : { ...message, parts };
  });
}

export type ApprovedExecutionResult = {
  success: boolean;
  executed: boolean;
  proposalId?: string;
  message?: string;
  error?: string;
  duplicate?: boolean;
  data?: Record<string, unknown>;
};

/**
 * Execute a user-approved action inside the agent loop: privacy gate →
 * proposal ledger row (audit) → execution reservation (double-run guard) →
 * executeAction → finalize. Mirrors /api/bruno/actions/execute but the input
 * is server-trusted (it comes from the persisted tool call, never the client).
 */
export async function executeApprovedBrunoAction(input: {
  supabase: Supabase;
  userId: string;
  /** Enriched + validated proposal args (including APPLY_PLAN). */
  args: Record<string, unknown>;
  source: string;
  userPrompt?: string;
  timeZone: string;
  dataAccess: BrunoDataAccess;
}): Promise<ApprovedExecutionResult> {
  const actionType = typeof input.args.type === 'string' ? input.args.type : '';
  const payload = isRecord(input.args.payload) ? input.args.payload : {};

  const accessError = actionAccessErrorDeep(
    actionType,
    payload,
    input.dataAccess
  );
  if (accessError) {
    return { success: false, executed: false, error: accessError };
  }

  const { proposalId, enriched } = assignProposalId(input.args);
  await persistBrunoProposals(
    input.supabase,
    input.userId,
    [
      {
        id: proposalId,
        type: enriched.type as BrunoActionProposal['type'],
        title:
          typeof enriched.title === 'string' ? enriched.title : 'Proposed action',
        description:
          typeof enriched.description === 'string'
            ? enriched.description
            : 'Confirm this proposed change',
        status: 'pending_confirmation',
        riskLevel:
          enriched.riskLevel === 'medium' || enriched.riskLevel === 'high'
            ? enriched.riskLevel
            : 'low',
        requiresConfirmation: true,
        payload: isRecord(enriched.payload) ? enriched.payload : {},
        createdAt: new Date().toISOString(),
      },
    ],
    input.source
  );

  const authorized = buildAuthorizedExecuteRequest(proposalId, enriched, {
    userPrompt: input.userPrompt,
    timeZone: input.timeZone,
  });
  if ('error' in authorized) {
    return { success: false, executed: false, proposalId, error: authorized.error };
  }

  const reservation = await reserveBrunoExecution({
    supabase: input.supabase,
    userId: input.userId,
    proposalId,
    actionType: authorized.type,
    loggedPayload: isRecord(enriched.payload) ? enriched.payload : {},
  });

  if (reservation.kind === 'already_executed') {
    return {
      success: true,
      executed: true,
      duplicate: true,
      proposalId,
      message: 'This action was already executed.',
      data: reservation.data,
    };
  }
  if (reservation.kind === 'in_flight') {
    return {
      success: false,
      executed: false,
      proposalId,
      error: 'That action is still running. Wait a moment, then try again.',
    };
  }
  if (reservation.kind === 'error') {
    return { success: false, executed: false, proposalId, error: reservation.message };
  }

  const executionLogId = reservation.executionLogId;

  try {
    const result = await executeAction(toProposedAction(authorized), {
      userId: input.userId,
      supabase: input.supabase,
      timeZone: authorized.timeZone ?? input.timeZone,
      userPrompt: authorized.userPrompt,
      mergedPayload: authorized.payload ?? {},
    });

    if (!result.success) {
      await finalizeBrunoExecution({
        supabase: input.supabase,
        executionLogId,
        userId: input.userId,
        success: false,
        error: result.error ?? 'Execution failed',
      });
      return {
        success: false,
        executed: true,
        proposalId,
        error: result.error ?? 'Execution failed',
        data: isRecord(result.data) ? result.data : undefined,
      };
    }

    const resultData = isRecord(result.data) ? result.data : {};
    const entityId =
      String(
        resultData.taskId ??
          resultData.eventId ??
          resultData.noteId ??
          resultData.blockId ??
          ''
      ) || undefined;

    await logExecuteActionAudit(input.supabase, {
      userId: input.userId,
      toolName: 'execute_action',
      actionType: authorized.type,
      entityId,
      entityTitle: authorized.title,
      success: true,
    });

    await finalizeBrunoExecution({
      supabase: input.supabase,
      executionLogId,
      userId: input.userId,
      success: true,
      resultData,
    });

    return {
      success: true,
      executed: true,
      proposalId,
      message: `Done — ${authorized.title ?? authorized.type}`,
      data: resultData,
    };
  } catch (error) {
    await finalizeBrunoExecution({
      supabase: input.supabase,
      executionLogId,
      userId: input.userId,
      success: false,
      error: 'Unexpected error while executing action.',
    });
    throw error;
  }
}
