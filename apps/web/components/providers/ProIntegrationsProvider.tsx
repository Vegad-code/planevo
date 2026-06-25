'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  type IntegrationPulse,
  type ProIntegrationProvider,
} from '@/lib/integrations/types';
import { extractConnectionSlug } from '@/lib/integrations/composio/slugs';
import { useDocumentVisible } from '@/hooks/useDocumentVisible';

const PRO_PROVIDERS: ProIntegrationProvider[] = ['notion', 'slack', 'linear'];

export interface ProIntegrationsContextValue {
  loading: boolean;
  isPro: boolean;
  connectedProviders: ProIntegrationProvider[];
  pulses: IntegrationPulse[];
  syncing: boolean;
  syncAll: (provider?: ProIntegrationProvider) => Promise<void>;
  refresh: () => Promise<void>;
}

const ProIntegrationsContext = createContext<ProIntegrationsContextValue | null>(null);

function buildLabel(provider: ProIntegrationProvider, openCount: number): string {
  const noun =
    provider === 'linear' ? 'open issue' : provider === 'notion' ? 'page' : 'item';
  if (openCount === 0) return `No ${noun}s`;
  return `${openCount} ${noun}${openCount === 1 ? '' : 's'}`;
}

export function ProIntegrationsProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [connectedProviders, setConnectedProviders] = useState<
    ProIntegrationProvider[]
  >([]);
  const [pulses, setPulses] = useState<IntegrationPulse[]>([]);
  const [syncing, setSyncing] = useState(false);
  const isVisible = useDocumentVisible();

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
    if (!isVisible) return;
    void refresh();
  }, [isVisible, refresh]);

  const value = useMemo<ProIntegrationsContextValue>(
    () => ({
      loading,
      isPro,
      connectedProviders,
      pulses,
      syncing,
      syncAll,
      refresh,
    }),
    [loading, isPro, connectedProviders, pulses, syncing, syncAll, refresh]
  );

  return (
    <ProIntegrationsContext.Provider value={value}>
      {children}
    </ProIntegrationsContext.Provider>
  );
}

export function useProIntegrationsContext(): ProIntegrationsContextValue {
  const context = useContext(ProIntegrationsContext);
  if (!context) {
    throw new Error('useProIntegrations must be used within ProIntegrationsProvider');
  }
  return context;
}
