import type { BrunoActionProposal } from '@/lib/bruno/tools/types';
import { assignColorsToProposalBatch } from '@/lib/bruno/proposalColors';

/**
 * Shared client-side extraction of Bruno proposal cards from UIMessage parts.
 *
 * Understands both write-tool modes:
 * - Agent loop: `tool-propose_action` / `tool-propose_plan` parts moving
 *   through approval-requested → approval-responded → output-available /
 *   output-denied. Confirm/deny is an approval response, never a payload.
 * - Legacy: tool outputs carrying a server proposalId, confirmed via
 *   /api/bruno/actions/execute (mobile and kill-switch fallback).
 *
 * Deliberately NOT here (removed in Phase C): AI SDK v4 `tool-invocation`
 * parts and client-side time enrichment — display comes straight from what
 * the model proposed / the server logged.
 */

export type ExecutionStatusLike =
  | 'idle'
  | 'executing'
  | 'success'
  | 'error'
  | 'cancelled';

export type ExtractedBrunoProposal = BrunoActionProposal & {
  /** Present when confirmation must go through addToolApprovalResponse. */
  approvalId?: string;
  /** Status derived from the tool part state (agent loop); null for legacy cards. */
  derivedStatus?: ExecutionStatusLike | null;
  derivedError?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function stableProposalHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
}

function normalizeProposal(value: unknown): BrunoActionProposal | null {
  if (!isRecord(value)) return null;
  if (typeof value.type !== 'string' || typeof value.title !== 'string') {
    return null;
  }

  return {
    id:
      typeof value.id === 'string'
        ? value.id
        : `proposal-${stableProposalHash(JSON.stringify(value))}`,
    type: value.type as BrunoActionProposal['type'],
    title: value.title,
    description:
      typeof value.description === 'string' ? value.description : value.title,
    status: 'pending_confirmation',
    riskLevel:
      value.riskLevel === 'medium' || value.riskLevel === 'high'
        ? value.riskLevel
        : 'low',
    requiresConfirmation:
      typeof value.requiresConfirmation === 'boolean'
        ? value.requiresConfirmation
        : true,
    payload: isRecord(value.payload) ? value.payload : {},
    createdAt:
      typeof value.createdAt === 'string'
        ? value.createdAt
        : new Date(0).toISOString(),
  };
}

/** Shape a raw propose_plan input ({summary, steps}) as an APPLY_PLAN card. */
function planInputToProposalArgs(
  input: Record<string, unknown>
): Record<string, unknown> {
  const summary =
    typeof input.summary === 'string' && input.summary.trim()
      ? input.summary.trim()
      : 'Apply this plan';
  return {
    type: 'APPLY_PLAN',
    title: summary.length > 120 ? `${summary.slice(0, 117)}...` : summary,
    description: summary,
    riskLevel: 'medium',
    requiresConfirmation: true,
    payload: {
      planSummary: summary,
      steps: Array.isArray(input.steps) ? input.steps : [],
    },
  };
}

type ToolPartExtraction = {
  proposal: BrunoActionProposal;
  approvalId?: string;
  derivedStatus: ExecutionStatusLike | null;
  derivedError?: string | null;
} | null;

function extractFromToolPart(part: Record<string, unknown>): ToolPartExtraction {
  const isPlan = part.type === 'tool-propose_plan';
  const state = typeof part.state === 'string' ? part.state : '';
  const input = isRecord(part.input) ? part.input : {};
  const output = isRecord(part.output) ? part.output : null;
  const approval = isRecord(part.approval) ? part.approval : null;
  const toolCallId =
    typeof part.toolCallId === 'string' ? part.toolCallId : null;

  const argsFromInput = isPlan
    ? planInputToProposalArgs(input)
    : (input as Record<string, unknown>);

  const buildProposal = (
    args: Record<string, unknown>,
    id?: string | null
  ): BrunoActionProposal | null => {
    const normalized = normalizeProposal(
      id ? { ...args, id } : { ...args }
    );
    return normalized;
  };

  switch (state) {
    case 'approval-requested': {
      if (!approval || typeof approval.id !== 'string') return null;
      const proposal = buildProposal(argsFromInput, toolCallId);
      if (!proposal) return null;
      return {
        proposal,
        approvalId: approval.id,
        derivedStatus: 'idle',
      };
    }
    case 'approval-responded': {
      if (!approval || typeof approval.id !== 'string') return null;
      const proposal = buildProposal(argsFromInput, toolCallId);
      if (!proposal) return null;
      return {
        proposal,
        approvalId: approval.id,
        derivedStatus: approval.approved === true ? 'executing' : 'cancelled',
      };
    }
    case 'output-denied': {
      const proposal = buildProposal(argsFromInput, toolCallId);
      if (!proposal) return null;
      return { proposal, derivedStatus: 'cancelled' };
    }
    case 'output-available': {
      if (!output) return null;

      // Agent-loop outcome: the action already ran inside the loop.
      if ('executed' in output) {
        if (output.executed !== true) return null; // NO_ACTION / validation error
        const proposal = buildProposal(
          argsFromInput,
          typeof output.proposalId === 'string' ? output.proposalId : toolCallId
        );
        if (!proposal) return null;
        return {
          proposal,
          derivedStatus: output.success === true ? 'success' : 'error',
          derivedError:
            output.success === true
              ? null
              : typeof output.error === 'string'
                ? output.error
                : 'Execution failed',
        };
      }

      // Legacy outcome: a persisted proposal awaiting explicit confirmation.
      if (output.success !== true) return null;
      const serverProposal = isRecord(output.proposal) ? output.proposal : null;
      const args = serverProposal ?? argsFromInput;
      const proposal = buildProposal(
        args,
        typeof output.proposalId === 'string' ? output.proposalId : toolCallId
      );
      if (!proposal) return null;
      return { proposal, derivedStatus: null };
    }
    default:
      return null;
  }
}

export function extractBrunoProposalsFromMessage(message: {
  parts?: unknown[];
}): ExtractedBrunoProposal[] {
  const parts = Array.isArray(message.parts) ? message.parts : [];

  const fromDataParts: ExtractedBrunoProposal[] = parts.flatMap((part) => {
    if (!isRecord(part) || part.type !== 'data-bruno-action-proposals') {
      return [];
    }
    const data = isRecord(part.data) ? part.data : null;
    if (!Array.isArray(data?.proposals)) return [];
    return data.proposals
      .map(normalizeProposal)
      .filter((proposal): proposal is BrunoActionProposal => Boolean(proposal))
      .map((proposal) => ({ ...proposal, derivedStatus: null }));
  });

  const fromToolParts: ExtractedBrunoProposal[] = parts.flatMap((part) => {
    if (
      !isRecord(part) ||
      (part.type !== 'tool-propose_action' && part.type !== 'tool-propose_plan')
    ) {
      return [];
    }
    const extracted = extractFromToolPart(part);
    if (!extracted) return [];
    return [
      {
        ...extracted.proposal,
        approvalId: extracted.approvalId,
        derivedStatus: extracted.derivedStatus,
        derivedError: extracted.derivedError ?? null,
      },
    ];
  });

  const byId = new Map<string, ExtractedBrunoProposal>();
  for (const proposal of [...fromDataParts, ...fromToolParts]) {
    if (!byId.has(proposal.id)) byId.set(proposal.id, proposal);
  }
  const merged = [...byId.values()];

  // Display-only color assignment for batches without explicit colors.
  const colorized = assignColorsToProposalBatch(
    merged.map((proposal) => ({
      ...proposal,
      payload: isRecord(proposal.payload) ? proposal.payload : {},
    }))
  ) as unknown as ExtractedBrunoProposal[];

  return colorized.map((proposal, index) => ({
    ...merged[index],
    payload: proposal.payload,
  }));
}

export type ExecutedBrunoAction = {
  actionType: string;
  proposalId: string | null;
  data: Record<string, unknown> | null;
};

/**
 * Actions that finished executing inside the agent loop for this message —
 * used to fire the same refresh events the legacy execute path dispatches.
 */
export function extractExecutedActionsFromMessage(message: {
  parts?: unknown[];
}): ExecutedBrunoAction[] {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  const executed: ExecutedBrunoAction[] = [];

  for (const part of parts) {
    if (
      !isRecord(part) ||
      (part.type !== 'tool-propose_action' && part.type !== 'tool-propose_plan')
    ) {
      continue;
    }
    if (part.state !== 'output-available') continue;
    const output = isRecord(part.output) ? part.output : null;
    if (!output || output.executed !== true || output.success !== true) {
      continue;
    }
    const input = isRecord(part.input) ? part.input : {};
    const actionType =
      part.type === 'tool-propose_plan'
        ? 'APPLY_PLAN'
        : typeof input.type === 'string'
          ? input.type
          : 'NO_ACTION';
    executed.push({
      actionType,
      proposalId:
        typeof output.proposalId === 'string' ? output.proposalId : null,
      data: isRecord(output.data) ? output.data : null,
    });
  }

  return executed;
}

export type IntegrationToolCall = {
  key: string;
  toolName: string;
  status: 'running' | 'success' | 'error';
  url: string | null;
  errorText: string | null;
};

/**
 * Composio (Notion/Slack/Linear) tool calls, for inline status cards.
 */
export function extractIntegrationToolCallsFromMessage(message: {
  parts?: unknown[];
}): IntegrationToolCall[] {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  const isProToolName = (name: string) => /^(NOTION|SLACK|LINEAR)_/i.test(name);
  const calls: IntegrationToolCall[] = [];

  parts.forEach((part, index) => {
    if (!isRecord(part) || typeof part.type !== 'string') return;
    if (!part.type.startsWith('tool-')) return;
    const toolName = part.type.slice('tool-'.length);
    if (!isProToolName(toolName)) return;

    const state = part.state;
    const output = isRecord(part.output) ? part.output : null;
    const errorText = typeof part.errorText === 'string' ? part.errorText : null;

    let status: IntegrationToolCall['status'] = 'running';
    if (state === 'output-error' || errorText) status = 'error';
    else if (state === 'output-available' || output) {
      status = output && output.successful === false ? 'error' : 'success';
    }

    const data = isRecord(output?.data) ? output.data : null;
    const url =
      (typeof data?.url === 'string' ? data.url : null) ??
      (typeof output?.url === 'string' ? output.url : null) ??
      (typeof data?.permalink === 'string' ? data.permalink : null);

    calls.push({
      key:
        typeof part.toolCallId === 'string'
          ? part.toolCallId
          : `${toolName}-${index}`,
      toolName,
      status,
      url,
      errorText:
        status === 'error'
          ? ((typeof output?.error === 'string' ? output.error : null) ??
            errorText ??
            'Action failed')
          : null,
    });
  });

  return calls;
}
