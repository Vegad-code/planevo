import { supabaseAdmin } from '@/lib/supabase/admin';
import { isPaidPlan, normalizePlanType } from '@/lib/auth/plan-types';
import { getOwnerEmails } from '@/lib/auth/owner-emails';
import { getActiveProProviders } from './composio/client';
import { upsertIntegrationAccount } from './accounts';
import {
  PRO_PROVIDER_LABELS,
  type IntegrationPulse,
  type ProIntegrationProvider,
} from './types';

const PRO_PROVIDERS: ProIntegrationProvider[] = ['notion', 'slack', 'linear'];

function adminEmailSet(): Set<string> {
  return new Set(getOwnerEmails());
}

/**
 * Computes whether a user has Pro access, honoring the admin-email allowlist
 * used elsewhere (Bruno). Shared so every integration surface gates identically.
 */
export function computeIsPro(
  planType: string | null | undefined,
  email?: string | null
): boolean {
  const plan = normalizePlanType(planType);
  const isOwner = email ? adminEmailSet().has(email.toLowerCase()) : false;
  return isPaidPlan(plan, isOwner);
}

/** Providers that are connected and active in Composio for this user. */
export async function getConnectedProProviders(
  userId: string
): Promise<ProIntegrationProvider[]> {
  try {
    return await getActiveProProviders(userId);
  } catch (err) {
    console.warn('[integrations] failed to list connected providers:', err);
    return [];
  }
}

/**
 * Mirrors Composio's connection state into `integration_accounts` so the rest
 * of the app (dashboard, tasks, daily plan) can read connection status from a
 * single table instead of calling Composio on every page load.
 */
export async function reconcileProAccounts(userId: string): Promise<void> {
  let active: Set<ProIntegrationProvider>;
  try {
    active = new Set(await getActiveProProviders(userId));
  } catch (err) {
    console.warn('[integrations] reconcile skipped (Composio unavailable):', err);
    return;
  }

  for (const provider of PRO_PROVIDERS) {
    if (active.has(provider)) {
      await upsertIntegrationAccount({ userId, provider, status: 'connected' });
    } else {
      await supabaseAdmin
        .from('integration_accounts')
        .update({ status: 'disconnected' })
        .eq('user_id', userId)
        .eq('provider', provider);
    }
  }
}

function buildLabel(provider: ProIntegrationProvider, openCount: number): string {
  const noun =
    provider === 'linear'
      ? 'open issue'
      : provider === 'notion'
        ? 'page'
        : 'item';
  if (openCount === 0) return `No ${noun}s`;
  return `${openCount} ${noun}${openCount === 1 ? '' : 's'}`;
}

/**
 * Builds per-provider summaries from `source_items` (no live Composio call), so
 * the dashboard and Bruno context stay fast. `connected` reflects Composio,
 * which is fetched once per call.
 */
export async function getIntegrationPulses(
  userId: string
): Promise<IntegrationPulse[]> {
  const connected = new Set(await getConnectedProProviders(userId));

  const { data: items } = await (supabaseAdmin as any)
    .from('source_items')
    .select('provider, due_date, completed')
    .eq('user_id', userId)
    .in('provider', PRO_PROVIDERS)
    .is('deleted_at', null);

  const { data: accounts } = await supabaseAdmin
    .from('integration_accounts')
    .select('provider, last_synced_at')
    .eq('user_id', userId)
    .in('provider', PRO_PROVIDERS);

  const lastSyncedByProvider = new Map<string, string | null>();
  for (const acct of accounts ?? []) {
    lastSyncedByProvider.set(acct.provider, acct.last_synced_at);
  }

  const weekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;

  return PRO_PROVIDERS.map((provider) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const providerItems = (items ?? []).filter(
      (i: { provider: string; completed?: boolean | null }) =>
        i.provider === provider && !i.completed
    );
    const openCount = providerItems.length;
    const dueThisWeek = providerItems.filter((i: { due_date: string | null }) => {
      if (!i.due_date) return false;
      const due = new Date(i.due_date).getTime();
      return due >= Date.now() && due <= weekFromNow;
    }).length;

    return {
      provider,
      connected: connected.has(provider),
      openCount,
      dueThisWeek,
      lastSyncedAt: lastSyncedByProvider.get(provider) ?? null,
      label: buildLabel(provider, openCount),
    } satisfies IntegrationPulse;
  });
}

export { PRO_PROVIDER_LABELS };
