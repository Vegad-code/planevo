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

export function extractProposalsFromMessage(message: BrunoUIMessage): ExtractedProposal[] {
  const parts = message.parts ?? [];
  const tools = parts.filter(
    (part) =>
      part.type === 'tool-propose_action' ||
      (part.type === 'tool-invocation' &&
        'toolInvocation' in part &&
        (part.toolInvocation as { toolName?: string }).toolName === 'propose_action')
  );

  return tools.map((part, index) => {
    const rawPart = part as Record<string, unknown>;
    const toolInvocation = rawPart.toolInvocation as Record<string, unknown> | undefined;
    const args = (rawPart.input ??
      rawPart.args ??
      toolInvocation?.args ??
      toolInvocation?.input ??
      {}) as Record<string, unknown>;

    const id =
      (args.id as string | undefined) ??
      (rawPart.toolCallId as string | undefined) ??
      (toolInvocation?.toolCallId as string | undefined) ??
      `proposal-${stableHash(JSON.stringify(args))}-${index}`;

    return {
      id,
      type: String(args.type ?? 'NO_ACTION'),
      title: String(args.title ?? 'Proposed action'),
      description: String(args.description ?? ''),
      riskLevel: String(args.riskLevel ?? 'low'),
      requiresConfirmation: Boolean(args.requiresConfirmation ?? true),
      payload:
        typeof args.payload === 'object' && args.payload !== null
          ? (args.payload as Record<string, unknown>)
          : {},
    };
  });
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
