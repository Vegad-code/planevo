'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUserProfileOptional } from '@/components/providers/UserProfileProvider';
import {
  type IntegrationPulse,
  type ProIntegrationProvider,
} from '@/lib/integrations/types';
import { useDocumentVisible } from '@/hooks/useDocumentVisible';
import { isFreeLikePlan } from '@/lib/auth/plan-types';

const PRO_PROVIDERS: ProIntegrationProvider[] = ['notion', 'slack', 'linear'];
const REFRESH_TTL_MS = 5 * 60 * 1000;

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
  const profileCtx = useUserProfileOptional();
  const [loading, setLoading] = useState(true);
  const [connectedProviders, setConnectedProviders] = useState<
    ProIntegrationProvider[]
  >([]);
  const [pulses, setPulses] = useState<IntegrationPulse[]>([]);
  const [syncing, setSyncing] = useState(false);
  const isVisible = useDocumentVisible();
  const lastRefreshAt = useRef(0);

  const isPro = profileCtx ? !isFreeLikePlan(profileCtx.planType) : false;

  const refresh = useCallback(
    async (force = false) => {
      const now = Date.now();
      if (!force && now - lastRefreshAt.current < REFRESH_TTL_MS && lastRefreshAt.current > 0) {
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: accounts } = await supabase
        .from('integration_accounts_public' as 'integration_accounts')
        .select('provider, status, last_synced_at')
        .eq('user_id', user.id)
        .in('provider', PRO_PROVIDERS);

      const connected = (accounts ?? [])
        .filter((a) => a.status === 'connected')
        .map((a) => a.provider as ProIntegrationProvider);
      setConnectedProviders(connected);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: items } = await (supabase as any)
        .from('source_items')
        .select('provider, due_date, completed')
        .eq('user_id', user.id)
        .in('provider', PRO_PROVIDERS)
        .is('deleted_at', null);

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
      lastRefreshAt.current = now;
    },
    []
  );

  const syncAll = useCallback(
    async (provider?: ProIntegrationProvider) => {
      setSyncing(true);
      try {
        const query = provider ? `?provider=${provider}` : '';
        await fetch(`/api/integrations/composio/sync${query}`, { method: 'POST' });
        await refresh(true);
      } catch (err) {
        console.warn('Composio sync failed', err);
      } finally {
        setSyncing(false);
      }
    },
    [refresh]
  );

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  useEffect(() => {
    if (!isVisible) return;
    void refresh(false);
  }, [isVisible, refresh]);

  const value = useMemo<ProIntegrationsContextValue>(
    () => ({
      loading,
      isPro,
      connectedProviders,
      pulses,
      syncing,
      syncAll,
      refresh: () => refresh(true),
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
