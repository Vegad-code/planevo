import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { BRUNO_PRO_MONTHLY_DEEP_LIMIT } from './modelPolicy';
import { buildBrunoEntitlement, type BrunoCreditLedgerEntry } from './usagePolicy';
import type {
  BrunoDeepAccessSource,
  BrunoEntitlement,
  BrunoMode,
  BrunoRouteSource,
  ModelTier,
} from './types';

export type BrunoRpcClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>
  ) => Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

export type BrunoUsageCompletion = {
  usageLogId: string;
  model: string | null;
  mode: BrunoMode;
  tier: ModelTier;
  inputTokens: number;
  outputTokens: number;
  estimatedCostCents: number | null;
  latencyMs: number;
  status: 'completed' | 'failed';
};

export type BrunoRouteEventInput = {
  userId: string;
  requestId: string;
  messageId?: string;
  conversationId?: string;
  mode: BrunoMode;
  confidence: number;
  routeSource: BrunoRouteSource;
  selectedTier: ModelTier;
  selectedModel: string | null;
  isPro: boolean;
  usedDeepCredit: boolean;
  upgradeCardShown: boolean;
  safetyStatus: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostCents: number | null;
  latencyMs: number;
  rationale: string;
};

export type BrunoUsageRepository = {
  listLedger: (userId: string) => Promise<BrunoCreditLedgerEntry[]>;
  updateUsage: (input: BrunoUsageCompletion) => Promise<void>;
  insertRouteEvent: (input: BrunoRouteEventInput) => Promise<void>;
};

export function createBrunoUsageRepository(
  client: SupabaseClient<Database>
): BrunoUsageRepository {
  return {
    async listLedger(userId) {
      const { data, error } = await client
        .from('bruno_credit_ledger')
        .select('credit_type, delta, created_at')
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Could not load Bruno credits: ${error.message}`);
      }

      return (data ?? []).map((entry) => ({
        creditType: entry.credit_type as BrunoCreditLedgerEntry['creditType'],
        delta: entry.delta,
        createdAt: entry.created_at,
      }));
    },

    async updateUsage(input) {
      const { error } = await client
        .from('ai_usage_logs')
        .update({
          model: input.model,
          mode: input.mode,
          route_tier: input.tier,
          input_tokens: input.inputTokens,
          output_tokens: input.outputTokens,
          estimated_cost_cents: input.estimatedCostCents,
          latency_ms: input.latencyMs,
          status: input.status,
          completed_at: new Date().toISOString(),
        })
        .eq('id', input.usageLogId);

      if (error) {
        throw new Error(`Could not complete AI usage log: ${error.message}`);
      }
    },

    async insertRouteEvent(input) {
      const { error } = await client.from('bruno_route_events').insert({
        user_id: input.userId,
        request_id: input.requestId,
        message_id: input.messageId,
        conversation_id: input.conversationId,
        mode: input.mode,
        confidence: input.confidence,
        route_source: input.routeSource,
        selected_tier: input.selectedTier,
        selected_model: input.selectedModel,
        is_pro: input.isPro,
        used_deep_credit: input.usedDeepCredit,
        upgrade_card_shown: input.upgradeCardShown,
        safety_status: input.safetyStatus,
        estimated_input_tokens: input.inputTokens,
        estimated_output_tokens: input.outputTokens,
        estimated_cost_cents: input.estimatedCostCents,
        latency_ms: input.latencyMs,
        rationale: input.rationale,
      });

      if (error) {
        throw new Error(`Could not log Bruno route event: ${error.message}`);
      }
    },
  };
}

export async function getBrunoEntitlement(
  repository: BrunoUsageRepository,
  input: {
    userId: string;
    isPro: boolean;
    now?: Date;
    monthlyAiBudgetCentsRemaining?: number | null;
    abuseScore?: number;
  }
): Promise<BrunoEntitlement> {
  const ledger = await repository.listLedger(input.userId);
  return buildBrunoEntitlement({
    isPro: input.isPro,
    ledger,
    now: input.now,
    monthlyAiBudgetCentsRemaining: input.monthlyAiBudgetCentsRemaining,
    abuseScore: input.abuseScore,
  });
}

export async function completeBrunoUsage(
  repository: BrunoUsageRepository,
  input: BrunoUsageCompletion
) {
  await repository.updateUsage(input);
}

export async function logBrunoRouteEvent(
  repository: BrunoUsageRepository,
  input: BrunoRouteEventInput
) {
  await repository.insertRouteEvent(input);
}

const reservationSchema = z
  .array(
    z.object({
      reserved: z.boolean(),
      credit_type: z
        .enum(['onboarding_deep', 'earned_deep', 'pro_monthly_deep'])
        .nullable(),
    })
  )
  .min(1);

function toCreditType(source: Exclude<BrunoDeepAccessSource, null>) {
  if (source === 'onboarding_credit') return 'onboarding_deep' as const;
  if (source === 'earned_credit') return 'earned_deep' as const;
  return 'pro_monthly_deep' as const;
}

export async function reserveBrunoDeepAccess(
  client: BrunoRpcClient,
  input: {
    userId: string;
    requestId: string;
    source: Exclude<BrunoDeepAccessSource, null>;
  }
) {
  const creditType = toCreditType(input.source);
  const { data, error } = await client.rpc('reserve_bruno_deep_access', {
    p_user_id: input.userId,
    p_request_id: input.requestId,
    p_source: creditType,
    p_monthly_limit: BRUNO_PRO_MONTHLY_DEEP_LIMIT,
  });

  if (error) {
    throw new Error(`Could not reserve Deep Bruno access: ${error.message}`);
  }

  const reservation = reservationSchema.parse(data)[0];
  return {
    reserved: reservation.reserved,
    creditType: reservation.credit_type,
  };
}

export async function refundBrunoDeepAccess(
  client: BrunoRpcClient,
  input: { userId: string; requestId: string }
) {
  const { data, error } = await client.rpc('refund_bruno_deep_access', {
    p_user_id: input.userId,
    p_request_id: input.requestId,
  });

  if (error) {
    throw new Error(`Could not refund Deep Bruno access: ${error.message}`);
  }

  return data === true;
}
