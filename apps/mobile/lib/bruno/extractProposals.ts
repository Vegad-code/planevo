import type { BrunoUIMessage } from '@/lib/bruno/types';

export type ExtractedProposal = {
  id: string;
  type: string;
  title: string;
  description: string;
  riskLevel: string;
  requiresConfirmation: boolean;
  payload: Record<string, unknown>;
};

function stableHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeProposal(args: Record<string, unknown>, fallbackId: string): ExtractedProposal {
  const id =
    (args.id as string | undefined) ??
    (args.proposalId as string | undefined) ??
    fallbackId;

  return {
    id,
    type: String(args.type ?? 'NO_ACTION'),
    title: String(args.title ?? 'Proposed action'),
    description: String(args.description ?? ''),
    riskLevel: String(args.riskLevel ?? 'low'),
    requiresConfirmation: Boolean(args.requiresConfirmation ?? true),
    payload: isRecord(args.payload) ? args.payload : {},
  };
}

export function extractProposalsFromMessage(message: BrunoUIMessage): ExtractedProposal[] {
  const parts = message.parts ?? [];
  const nativeProposals = parts.flatMap((part) => {
    const rawPart = part as Record<string, unknown>;
    if (rawPart.type !== 'data-bruno-action-proposals') {
      return [];
    }

    const data = rawPart.data as { proposals?: unknown[] } | undefined;
    if (!Array.isArray(data?.proposals)) {
      return [];
    }

    return data.proposals
      .filter(isRecord)
      .map((proposal, index) =>
        normalizeProposal(
          proposal,
          `proposal-${stableHash(JSON.stringify(proposal))}-${index}`
        )
      );
  });

  const tools = parts.filter(
    (part) =>
      part.type === 'tool-propose_action' ||
      part.type === 'tool-propose_plan' ||
      (part.type === 'tool-invocation' &&
        'toolInvocation' in part &&
        (part.toolInvocation as { toolName?: string }).toolName === 'propose_action')
  );

  const toolProposals = tools.map((part, index) => {
    const rawPart = part as Record<string, unknown>;
    const toolInvocation = rawPart.toolInvocation as Record<string, unknown> | undefined;
    const toolOutput =
      rawPart.output ??
      rawPart.result ??
      toolInvocation?.result ??
      toolInvocation?.output;
    const outputRecord = isRecord(toolOutput) ? toolOutput : null;
    const rawArgs = (rawPart.input ??
      rawPart.args ??
      toolInvocation?.args ??
      toolInvocation?.input ??
      {}) as Record<string, unknown>;

    // propose_plan args are {summary, steps}; prefer the server-shaped
    // APPLY_PLAN proposal from the tool output, else shape one for display.
    const serverProposal = isRecord(outputRecord?.proposal)
      ? (outputRecord.proposal as Record<string, unknown>)
      : null;
    const isPlan = rawPart.type === 'tool-propose_plan';
    const summary =
      typeof rawArgs.summary === 'string' && rawArgs.summary.trim()
        ? rawArgs.summary.trim()
        : 'Apply this plan';
    const args =
      serverProposal ??
      (isPlan
        ? {
            type: 'APPLY_PLAN',
            title: summary.length > 120 ? `${summary.slice(0, 117)}...` : summary,
            description: summary,
            riskLevel: 'medium',
            requiresConfirmation: true,
            payload: {
              planSummary: summary,
              steps: Array.isArray(rawArgs.steps) ? rawArgs.steps : [],
            },
          }
        : rawArgs);
    const argsWithServerId =
      typeof outputRecord?.proposalId === 'string'
        ? { ...args, id: outputRecord.proposalId }
        : args;

    const id =
      (argsWithServerId.id as string | undefined) ??
      (argsWithServerId.proposalId as string | undefined) ??
      (rawPart.toolCallId as string | undefined) ??
      (toolInvocation?.toolCallId as string | undefined) ??
      `proposal-${stableHash(JSON.stringify(argsWithServerId))}-${index}`;

    return normalizeProposal(argsWithServerId, id);
  });

  const byId = new Map<string, ExtractedProposal>();
  for (const proposal of [...nativeProposals, ...toolProposals]) {
    if (!byId.has(proposal.id)) {
      byId.set(proposal.id, proposal);
    }
  }

  return [...byId.values()];
}

export function extractProposalsByMessageId(
  messages: BrunoUIMessage[]
): Record<string, ExtractedProposal[]> {
  const map: Record<string, ExtractedProposal[]> = {};
  for (const message of messages) {
    if (message.role !== 'assistant') continue;
    const proposals = extractProposalsFromMessage(message);
    if (proposals.length > 0) {
      map[message.id] = proposals;
    }
  }
  return map;
}
