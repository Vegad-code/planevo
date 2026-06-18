'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  PRO_PROVIDER_LABELS,
  type IntegrationPulse,
  type ProIntegrationProvider,
} from '@/lib/integrations/types';
import { extractConnectionSlug } from '@/lib/integrations/composio/slugs';

const PRO_PROVIDERS: ProIntegrationProvider[] = ['notion', 'slack', 'linear'];

interface UseProIntegrationsResult {
  loading: boolean;
  isPro: boolean;
  connectedProviders: ProIntegrationProvider[];
  pulses: IntegrationPulse[];
  syncing: boolean;
  syncAll: (provider?: ProIntegrationProvider) => Promise<void>;
  refresh: () => Promise<void>;
}

function buildLabel(provider: ProIntegrationProvider, openCount: number): string {
  const noun =
    provider === 'linear' ? 'open issue' : provider === 'notion' ? 'page' : 'item';
  if (openCount === 0) return `No ${noun}s`;
  return `${openCount} ${noun}${openCount === 1 ? '' : 's'}`;
}

/**
 * Client hook powering every Pro integration surface (dashboard rail, Bruno
 * chips, tasks/daily-plan sync). Reads connection status from Composio and
 * pulse counts from `source_items`. Server routes enforce real Pro gating.
 */
export function useProIntegrations(): UseProIntegrationsResult {
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [connectedProviders, setConnectedProviders] = useState<
    ProIntegrationProvider[]
  >([]);
  const [pulses, setPulses] = useState<IntegrationPulse[]>([]);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('users')
      .select('plan_type')
      .eq('id', user.id)
      .single();
    const planType = (profile?.plan_type as string | null) ?? 'free';
    setIsPro(!['free', 'canceled'].includes(planType));

    // Connected providers (Composio is the source of truth for connection state).
    const connected: ProIntegrationProvider[] = [];
    try {
      const res = await fetch('/api/integrations/composio/connections');
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const conn of (data.connections ?? []) as any[]) {
        const slug = extractConnectionSlug(conn);
        if (
          slug &&
          (PRO_PROVIDERS as string[]).includes(slug) &&
          String(conn.status).toUpperCase() === 'ACTIVE'
        ) {
          connected.push(slug);
        }
      }
    } catch (err) {
      console.warn('Failed to load Composio connections', err);
    }
    setConnectedProviders(connected);

    // Pulse counts from source_items.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: items } = await (supabase as any)
      .from('source_items')
      .select('provider, due_date, completed')
      .eq('user_id', user.id)
      .in('provider', PRO_PROVIDERS)
      .is('deleted_at', null);

    const { data: accounts } = await supabase
      .from('integration_accounts_public' as 'integration_accounts')
      .select('provider, last_synced_at')
      .eq('user_id', user.id)
      .in('provider', PRO_PROVIDERS);

    const lastSyncedByProvider = new Map<string, string | null>();
    for (const acct of accounts ?? []) {
      lastSyncedByProvider.set(acct.provider, acct.last_synced_at);
    }

    const weekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const connectedSet = new Set(connected);
    const computed: IntegrationPulse[] = PRO_PROVIDERS.map((provider) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const providerItems = ((items ?? []) as any[]).filter(
        (i) => i.provider === provider && !i.completed
      );
      const openCount = providerItems.length;
      const dueThisWeek = providerItems.filter((i) => {
        if (!i.due_date) return false;
        const due = new Date(i.due_date).getTime();
        return due >= Date.now() && due <= weekFromNow;
      }).length;
      return {
        provider,
        connected: connectedSet.has(provider),
        openCount,
        dueThisWeek,
        lastSyncedAt: lastSyncedByProvider.get(provider) ?? null,
        label: buildLabel(provider, openCount),
      };
    });
    setPulses(computed);
    setLoading(false);
  }, []);

  const syncAll = useCallback(
    async (provider?: ProIntegrationProvider) => {
      setSyncing(true);
      try {
        const query = provider ? `?provider=${provider}` : '';
        await fetch(`/api/integrations/composio/sync${query}`, { method: 'POST' });
        await refresh();
      } catch (err) {
        console.warn('Composio sync failed', err);
      } finally {
        setSyncing(false);
      }
    },
    [refresh]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    loading,
    isPro,
    connectedProviders,
    pulses,
    syncing,
    syncAll,
    refresh,
  };
}

export { PRO_PROVIDER_LABELS };
