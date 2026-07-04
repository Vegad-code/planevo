import type { SupabaseClient } from '@supabase/supabase-js';
import type { BrunoActionProposal } from '@/lib/bruno/tools/types';
import type { Database, Json } from '@/types/database';

type Supabase = SupabaseClient<Database>;

export function fingerprintProposal(input: {
  type: string;
  entityId?: string;
  startTime?: string;
  endTime?: string;
  title: string;
}): string {
  const source = [
    input.type,
    input.entityId ?? '',
    input.startTime ?? '',
    input.endTime ?? '',
    input.title,
  ].join('|');
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(index);
    hash |= 0;
  }
  return `proposal-${Math.abs(hash).toString(36)}`;
}

export function assignProposalId(
  args: Record<string, unknown>,
  entityId?: string
): { proposalId: string; enriched: Record<string, unknown> } {
  const payload =
    typeof args.payload === 'object' && args.payload !== null
      ? (args.payload as Record<string, unknown>)
      : {};
  const type = typeof args.type === 'string' ? args.type : 'NO_ACTION';
  const title = typeof args.title === 'string' ? args.title : 'Proposed action';
  const proposalId =
    typeof args.id === 'string'
      ? args.id
      : fingerprintProposal({
          type,
          entityId:
            entityId ??
            (typeof payload.eventId === 'string' ? payload.eventId : undefined) ??
            (typeof payload.taskId === 'string' ? payload.taskId : undefined),
          startTime:
            typeof payload.startTime === 'string' ? payload.startTime : undefined,
          endTime: typeof payload.endTime === 'string' ? payload.endTime : undefined,
          title,
        });

  return {
    proposalId,
    enriched: {
      ...args,
      id: proposalId,
      payload: {
        ...payload,
        proposalFingerprint: proposalId,
      },
    },
  };
}

export async function persistBrunoProposals(
  supabase: Supabase,
  userId: string,
  proposals: BrunoActionProposal[],
  source: string
): Promise<void> {
  if (proposals.length === 0) return;

  for (const proposal of proposals) {
    const row = {
      user_id: userId,
      tool_name: 'propose_action',
      idempotency_key: `proposal:${proposal.id}`,
      arguments: {
        ...proposal,
        proposalId: proposal.id,
        proposalFingerprint: proposal.id,
      } as Json,
      result: { success: true, source } as Json,
    };

    const { error: insertError } = await supabase.from('bruno_tool_logs').insert(row);
    if (!insertError) continue;

    if (insertError.code === '23505') {
      const { error: updateError } = await supabase
        .from('bruno_tool_logs')
        .update({
          arguments: row.arguments,
          result: row.result,
        })
        .eq('user_id', userId)
        .eq('idempotency_key', row.idempotency_key);
      if (updateError) throw updateError;
      continue;
    }

    throw insertError;
  }
}

export async function persistBrunoProposalArgs(
  supabase: Supabase,
  userId: string,
  args: Record<string, unknown>,
  source: string
): Promise<{ proposalId: string }> {
  const { proposalId, enriched } = assignProposalId(args);
  await persistBrunoProposals(
    supabase,
    userId,
    [
      {
        id: proposalId,
        type: enriched.type as BrunoActionProposal['type'],
        title: typeof enriched.title === 'string' ? enriched.title : 'Proposed action',
        description:
          typeof enriched.description === 'string'
            ? enriched.description
            : 'Confirm this proposed change',
        status: 'pending_confirmation',
        riskLevel:
          enriched.riskLevel === 'medium' || enriched.riskLevel === 'high'
            ? enriched.riskLevel
            : 'low',
        requiresConfirmation:
          typeof enriched.requiresConfirmation === 'boolean'
            ? enriched.requiresConfirmation
            : true,
        payload:
          typeof enriched.payload === 'object' && enriched.payload !== null
            ? (enriched.payload as Record<string, unknown>)
            : {},
        createdAt: new Date().toISOString(),
      },
    ],
    source
  );
  return { proposalId };
}
