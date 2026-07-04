import type { SupabaseClient } from '@supabase/supabase-js';
import { enrichTimeBlockProposal } from '@/lib/bruno/enrichTimeBlockProposal';
import { isValidProposalColor, resolveProposalColor } from '@/lib/bruno/proposalColors';

type ProposalArgs = Record<string, unknown>;

const BATCH_WINDOW_MS = 120_000;
const CALENDAR_MUTATION_TYPES = new Set([
  'UPDATE_CALENDAR_EVENT',
  'DELETE_CALENDAR_EVENT',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readGoogleEventId(metadata: unknown): string | undefined {
  if (!isRecord(metadata)) return undefined;
  return typeof metadata.google_event_id === 'string' &&
    metadata.google_event_id.length > 0
    ? metadata.google_event_id
    : undefined;
}

async function loadStableCalendarIdentity(
  context: {
    userId: string;
    supabase: SupabaseClient;
  },
  eventId: string
): Promise<{ externalId?: string; googleEventId?: string }> {
  const { data, error } = await context.supabase
    .from('calendar_events')
    .select('source, external_id, metadata')
    .eq('id', eventId)
    .eq('user_id', context.userId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error || !isRecord(data)) return {};

  const identity: { externalId?: string; googleEventId?: string } = {};
  if (
    data.source === 'google_calendar' &&
    typeof data.external_id === 'string' &&
    data.external_id.length > 0
  ) {
    identity.externalId = data.external_id;
  }

  const googleEventId = readGoogleEventId(data.metadata);
  if (googleEventId) {
    identity.googleEventId = googleEventId;
  }

  return identity;
}

async function enrichCalendarMutationIdentity(
  args: ProposalArgs,
  context: {
    userId: string;
    supabase: SupabaseClient;
  }
): Promise<ProposalArgs> {
  if (!CALENDAR_MUTATION_TYPES.has(String(args.type))) return args;

  const payload = isRecord(args.payload) ? args.payload : {};
  const eventId =
    typeof payload.eventId === 'string' && payload.eventId.length > 0
      ? payload.eventId
      : null;

  if (!eventId) return args;

  const identity = await loadStableCalendarIdentity(context, eventId);
  if (!identity.externalId && !identity.googleEventId) return args;

  const enrichedPayload = { ...payload };
  if (!enrichedPayload.externalId && identity.externalId) {
    enrichedPayload.externalId = identity.externalId;
  }
  if (!enrichedPayload.googleEventId && identity.googleEventId) {
    enrichedPayload.googleEventId = identity.googleEventId;
  }

  return {
    ...args,
    payload: enrichedPayload,
  };
}

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
  const enriched = await enrichCalendarMutationIdentity(
    enrichTimeBlockProposal(args, {
      texts: context.texts,
      timeZone: context.timeZone,
      referenceDate: context.referenceDate,
    }),
    context
  );

  const type = enriched.type;
  const payload =
    typeof enriched.payload === 'object' && enriched.payload !== null
      ? (enriched.payload as Record<string, unknown>)
      : {};

  if (type === 'RESCHEDULE_TASK' && !payload.dueDate && context.texts.length > 0) {
    const inferred = enrichTimeBlockProposal(
      { type: 'CREATE_TIME_BLOCK', payload: {} },
      context
    );
    const inferredPayload =
      typeof inferred.payload === 'object' && inferred.payload !== null
        ? (inferred.payload as Record<string, unknown>)
        : {};
    if (typeof inferredPayload.startTime === 'string') {
      return {
        ...enriched,
        payload: {
          ...payload,
          dueDate: inferredPayload.startTime.slice(0, 10),
        },
      };
    }
  }

  if (type !== 'CREATE_TASK' && type !== 'CREATE_TIME_BLOCK') {
    return enriched;
  }

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
