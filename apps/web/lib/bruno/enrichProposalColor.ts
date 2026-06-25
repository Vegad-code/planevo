import type { SupabaseClient } from '@supabase/supabase-js';
import { enrichTimeBlockProposal } from '@/lib/bruno/enrichTimeBlockProposal';
import { isValidProposalColor, resolveProposalColor } from '@/lib/bruno/proposalColors';

type ProposalArgs = Record<string, unknown>;

const BATCH_WINDOW_MS = 120_000;

export async function countRecentProposals(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const windowStart = new Date(Date.now() - BATCH_WINDOW_MS).toISOString();
  const { count, error } = await supabase
    .from('bruno_tool_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('tool_name', 'propose_action')
    .gte('created_at', windowStart);

  if (error) return 0;
  return count ?? 0;
}

export async function enrichBrunoProposal(
  args: ProposalArgs,
  context: {
    userId: string;
    supabase: SupabaseClient;
    texts: string[];
    timeZone: string;
    referenceDate?: Date;
  }
): Promise<ProposalArgs> {
  const enriched = enrichTimeBlockProposal(args, {
    texts: context.texts,
    timeZone: context.timeZone,
    referenceDate: context.referenceDate,
  });

  const type = enriched.type;
  if (type !== 'CREATE_TASK' && type !== 'CREATE_TIME_BLOCK') {
    return enriched;
  }

  const payload =
    typeof enriched.payload === 'object' && enriched.payload !== null
      ? (enriched.payload as Record<string, unknown>)
      : {};

  if (isValidProposalColor(payload.color)) {
    return enriched;
  }

  const batchIndex = await countRecentProposals(context.supabase, context.userId);
  const color = resolveProposalColor({
    color: payload.color,
    colorCategory: payload.colorCategory,
    title: typeof enriched.title === 'string' ? enriched.title : undefined,
    description:
      typeof enriched.description === 'string' ? enriched.description : undefined,
    batchIndex,
  });

  return {
    ...enriched,
    payload: {
      ...payload,
      color,
    },
  };
}
