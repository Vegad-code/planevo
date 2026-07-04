'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { disconnectCanvasAction } from '@/lib/canvas/actions';
import { disconnectGoogleCalendarAction } from '@/lib/integrations/google-calendar';
import { formatDistanceToNow } from 'date-fns';
import { IntegrationCard } from './IntegrationCard';
import { CanvasConnectModal } from './CanvasConnectModal';
import { GoogleCalendarManageModal } from './GoogleCalendarManageModal';
import { UpgradeToProModal } from './UpgradeToProModal';
import { OAuthConnectingModal } from './OAuthConnectingModal';
import { NotionDatabasePicker } from './NotionDatabasePicker';
import { ComposioManageModal } from './ComposioManageModal';
import { extractConnectionSlug } from '@/lib/integrations/composio/slugs';
import { GOOGLE_CALENDAR_OAUTH_SCOPES } from '@/lib/integrations/google-oauth-scopes';
import { SlackIcon, NotionIcon, LinearIcon, GoogleIcon, CanvasIcon } from '../icons/BrandIcons';

export default function ComposioIntegrationScreen() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [accounts, setAccounts] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [composioConnections, setComposioConnections] = useState<any[]>([]);

  // Modal state
  const [isCanvasModalOpen, setIsCanvasModalOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isNotionPickerOpen, setIsNotionPickerOpen] = useState(false);
  const [composioManageProvider, setComposioManageProvider] = useState<'slack' | 'linear' | null>(null);
  const [upgradeFeatureName, setUpgradeFeatureName] = useState('');
  const [connectingProvider, setConnectingProvider] = useState<'notion' | 'slack' | 'linear' | 'google' | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const popupPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const notionPickerAutoOpenedRef = useRef(false);
  const oauthHandledRef = useRef(false);

  const maybeAutoOpenNotionPicker = (integrationAccounts: typeof accounts) => {
    if (notionPickerAutoOpenedRef.current) return;
    const notionAccount = integrationAccounts.find((a) => a.provider === 'notion');
    const selectedIds = notionAccount?.metadata?.notion_database_ids;
    const hasSelection = Array.isArray(selectedIds) && selectedIds.length > 0;
    if (hasSelection) return;
    notionPickerAutoOpenedRef.current = true;
    setIsNotionPickerOpen(true);
  };

  const refreshIntegrations = async (options?: { promptNotionPicker?: boolean }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: userProfile } = await supabase
      .from('users')
      .select('id, google_calendar_connected, google_calendar_last_synced_at, scheduling_preferences, canvas_url, plan_type')
      .eq('id', user.id)
      .single();

    if (userProfile) {
      setProfile({ ...userProfile, email: user.email });
    }

    const { data: integrationAccounts } = await supabase
      .from('integration_accounts_public' as 'integration_accounts')
      .select('id, provider, provider_account_id, display_name, status, last_synced_at, last_error, metadata')
      .eq('user_id', user.id);

    const nextAccounts = integrationAccounts ?? [];
    setAccounts(nextAccounts);

    try {
      const res = await fetch('/api/integrations/composio/connections');
      const data = await res.json();
      if (data.connections) {
        setComposioConnections(data.connections);
      }
    } catch (err) {
      console.error('Failed to fetch Composio connections', err);
    }

    if (options?.promptNotionPicker) {
      maybeAutoOpenNotionPicker(nextAccounts);
    }

    setLoading(false);
    return nextAccounts;
  };

  const fetchIntegrationsData = async () => {
    await refreshIntegrations();
  };

  const runPostConnectActions = async (
    provider: 'notion' | 'slack' | 'linear' | 'google'
  ) => {
    if (provider === 'google') {
      await refreshIntegrations();
      try {
        const syncRes = await fetch('/api/integrations/google/sync?force=true', { method: 'POST' });
        const syncData = await syncRes.json().catch(() => ({}));
        if (syncRes.ok && syncData.success) {
          const now = new Date().toISOString();
          setProfile((p: typeof profile) => (
            p ? { ...p, google_calendar_connected: true, google_calendar_last_synced_at: now } : p
          ));
          setIsGoogleModalOpen(true);
        }
        await refreshIntegrations();
      } catch (err) {
        console.error('Post-connect Google sync failed', err);
      }
      return;
    }

    if (provider === 'notion') {
      await refreshIntegrations({ promptNotionPicker: true });
      return;
    }

    await refreshIntegrations();
    try {
      const verifyRes = await fetch(`/api/integrations/composio/verify?provider=${provider}`);
      const verifyData = await verifyRes.json();
      if (!verifyData.ok) {
        console.warn(`Post-connect ${provider} verify failed:`, verifyData.error);
        return;
      }
      await fetch(`/api/integrations/composio/sync?provider=${provider}&force=true`, {
        method: 'POST',
      });
      await refreshIntegrations();
    } catch (err) {
      console.error(`Post-connect ${provider} sync failed`, err);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (!cancelled) fetchIntegrationsData();
    })();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'oauth_result') {
        const { provider, error } = event.data;
        setConnectingProvider(null);
        setOauthError(error ?? null);
        if (popupPollIntervalRef.current) {
          clearInterval(popupPollIntervalRef.current);
          popupPollIntervalRef.current = null;
        }
        if (error) {
          return;
        }
        oauthHandledRef.current = true;
        void runPostConnectActions(provider);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      cancelled = true;
      window.removeEventListener('message', handleMessage);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const openOAuthPopup = (url: string | null, providerName: 'notion' | 'slack' | 'linear' | 'google') => {
    const width = 600;
    const height = 700;
    const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - height) / 2);
    const features = `width=${width},height=${height},top=${top},left=${left},popup=yes,scrollbars=yes,resizable=yes`;
    const popup = window.open(url || '', `oauth_${providerName}`, features);
    
    setOauthError(null);
    setConnectingProvider(providerName);
    oauthHandledRef.current = false;
    
    if (popupPollIntervalRef.current) clearInterval(popupPollIntervalRef.current);
    popupPollIntervalRef.current = setInterval(() => {
      if (popup?.closed) {
        if (popupPollIntervalRef.current) {
          clearInterval(popupPollIntervalRef.current);
          popupPollIntervalRef.current = null;
        }
        setConnectingProvider(null);
        if (!oauthHandledRef.current) {
          oauthHandledRef.current = true;
          void runPostConnectActions(providerName);
        } else {
          void fetchIntegrationsData();
        }
      }
    }, 500);

    return popup;
  };

  const handleConnectGoogle = async () => {
    const popup = openOAuthPopup(null, 'google');

    const redirectTo = `${window.location.origin}/api/auth/callback/google-calendar?next=/dashboard/settings/integrations`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        scopes: GOOGLE_CALENDAR_OAUTH_SCOPES,
        skipBrowserRedirect: true,
      },
    });
    if (error) {
      console.error('Google Calendar OAuth error:', error);
      popup?.close();
    } else if (data?.url && popup) {
      popup.location.href = data.url;
    } else if (data?.url) {
      openOAuthPopup(data.url, 'google');
    }
  };

  const isProUser = profile?.plan_type && !['free', 'canceled'].includes(profile.plan_type);

  const handleUpgradeClick = (featureName: string) => {
    setUpgradeFeatureName(featureName);
    setIsUpgradeModalOpen(true);
  };

  const handleConnectComposio = async (appName: 'notion' | 'slack' | 'linear') => {
    if (!isProUser) return handleUpgradeClick(appName.charAt(0).toUpperCase() + appName.slice(1));
    
    try {
      const redirectUrl = `${window.location.origin}/api/integrations/composio/callback?provider=${appName}`;
      const res = await fetch('/api/integrations/composio/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName, redirectUrl })
      });
      const data = await res.json();
      if (data.alreadyConnected) {
        await refreshIntegrations();
        return;
      }
      if (data.redirectUrl) {
        openOAuthPopup(data.redirectUrl, appName);
      } else {
        setOauthError(data.error || 'Failed to generate connection URL');
        setConnectingProvider(appName);
      }
    } catch (err) {
      console.error('Connection error:', err);
      setOauthError('An error occurred while connecting.');
      setConnectingProvider(appName);
    }
  };

  const canvasAccount = accounts.find(a => a.provider === 'canvas');
  const googleAccount = accounts.find(a => a.provider === 'google_calendar');

  const isCanvasConnected = canvasAccount ? canvasAccount.status === 'connected' : false;
  const isGoogleConnected =
    googleAccount?.status === 'connected' || profile?.google_calendar_connected === true;
  
  // Composio check
  const getComposioConnection = (appName: string) => {
    return composioConnections.find((conn) => {
      const slug = extractConnectionSlug(conn);
      return slug?.toLowerCase() === appName.toLowerCase() && String(conn.status ?? '').toUpperCase() === 'ACTIVE';
    });
  };

  const isComposioAppConnected = (appName: string) => !!getComposioConnection(appName);

  const handleDisconnectComposio = async (appName: string) => {
    const conn = getComposioConnection(appName);
    if (!conn) return;
    
    const proceed = window.confirm(`Are you sure you want to disconnect ${appName.charAt(0).toUpperCase() + appName.slice(1)}?`);
    if (!proceed) return;

    try {
      const res = await fetch('/api/integrations/composio/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: conn.id })
      });
      if (res.ok) {
        fetchIntegrationsData();
      } else {
        const data = await res.json();
        setOauthError(data.error || 'Failed to disconnect');
      }
    } catch {
      setOauthError('An error occurred while disconnecting.');
    }
  };

  const isNotionConnected = isComposioAppConnected('notion');
  const isSlackConnected = isComposioAppConnected('slack');
  const isLinearConnected = isComposioAppConnected('linear');

  const getComposioInfoText = (provider: 'slack' | 'linear') => {
    const account = accounts.find((a) => a.provider === provider);
    if (!account || account.status !== 'connected') return undefined;
    const synced = account.last_synced_at
      ? `synced ${formatDistanceToNow(new Date(account.last_synced_at))} ago`
      : 'not synced yet';
    const configured =
      provider === 'slack'
        ? account.metadata?.slack_preferences_configured === true
        : account.metadata?.linear_preferences_configured === true;
    const scope = configured ? 'custom scope' : 'default scope';
    return `Managed via Composio · ${scope} · ${synced}`;
  };

  if (loading) return <div className="animate-pulse h-64 bg-settings-card/50 rounded-3xl" />;

  return (
    <div className="space-y-6 animate-fade-in text-settings-text">
      <div>
        <h2 className="text-[32px] font-serif italic text-settings-text mb-1 leading-tight">Sources & Integrations</h2>
        <p className="text-[13px] font-medium text-settings-text-muted max-w-2xl leading-relaxed">
          The more sources you connect, the smarter Bruno's plan.
        </p>
      </div>

      {/* Academic Sources Section */}
      <section className="bg-settings-card rounded-2xl border border-settings-border p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-settings-text-muted mb-2">
            ACADEMIC SOURCES
          </h3>
          <h4 className="text-2xl font-light text-settings-text mb-0.5 leading-tight">
            Your <span className="font-serif italic text-settings-brand font-normal">school</span> stuff.
          </h4>
          <p className="text-[13px] font-medium text-settings-text-muted">
            Sync courses, deadlines, and class schedules.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <IntegrationCard
            id="canvas"
            title="Canvas LMS"
            description="Pulls assignments, quizzes, and due dates from your enrolled courses."
            status={canvasAccount?.status === 'error' ? 'error' : isCanvasConnected ? 'connected' : 'available'}
            infoText={isCanvasConnected ? `Synced ${canvasAccount?.last_synced_at ? formatDistanceToNow(new Date(canvasAccount.last_synced_at)) + ' ago' : 'recently'}` : undefined}
            icon={<div className="bg-white border border-gray-200/50 w-full h-full rounded-xl flex items-center justify-center shadow-inner"><CanvasIcon className="w-6 h-6" /></div>}
            onConnect={() => setIsCanvasModalOpen(true)}
            onManage={() => setIsCanvasModalOpen(true)}
            onDisconnect={async () => {
              const proceed = window.confirm("Are you sure you want to disconnect Canvas?");
              if (!proceed) return;
              const deleteData = window.confirm("Do you want to delete all imported Canvas tasks as well?\n\nClick 'OK' to delete them, or 'Cancel' to keep them.");
              await disconnectCanvasAction(deleteData);
              setAccounts(accs => accs.filter(a => a.provider !== 'canvas'));
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              setProfile((p: any) => ({ ...p, canvas_url: null }));
            }}
          />

          <IntegrationCard
            id="google-calendar"
            title="Google Calendar"
            description="Imports your classes, meetings, and personal events."
            status={googleAccount?.status === 'error' ? 'error' : isGoogleConnected ? 'connected' : 'available'}
            infoText={isGoogleConnected ? `${profile?.email || 'Connected'} · synced ${googleAccount?.last_synced_at ? formatDistanceToNow(new Date(googleAccount.last_synced_at)) + ' ago' : 'never'}` : undefined}
            icon={<div className="bg-white border border-gray-200/50 w-full h-full rounded-xl flex items-center justify-center shadow-inner"><GoogleIcon className="w-6 h-6" /></div>}
            onConnect={handleConnectGoogle}
            onManage={() => setIsGoogleModalOpen(true)}
          />
        </div>
      </section>

      {/* Productivity & Premium Section */}
      <section className="bg-settings-card rounded-2xl border border-settings-border p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-settings-text-muted mb-2">
            PRODUCTIVITY · PREMIUM (via Composio)
          </h3>
          <h4 className="text-2xl font-light text-settings-text mb-0.5 leading-tight">
            For when <span className="font-serif italic text-settings-brand font-normal">work</span> creeps in.
          </h4>
          <p className="text-[13px] font-medium text-settings-text-muted">
            Notion, Slack, and Linear all connect securely through Composio so Bruno can read your work items and act on them. Available with Planevo Pro.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <IntegrationCard
            id="notion"
            title="Notion"
            description="Interact with Notion databases and pages directly with Bruno."
            status={isNotionConnected ? 'connected' : (isProUser ? 'available' : 'upgrade')}
            infoText={
              isNotionConnected
                ? (() => {
                    const account = accounts.find((a) => a.provider === 'notion');
                    const configured =
                      Array.isArray(account?.metadata?.notion_database_ids) &&
                      (account.metadata.notion_database_ids as string[]).length > 0;
                    const synced = account?.last_synced_at
                      ? `synced ${formatDistanceToNow(new Date(account.last_synced_at))} ago`
                      : 'not synced yet';
                    return `Managed via Composio · ${configured ? 'custom scope' : 'pick databases'} · ${synced}`;
                  })()
                : undefined
            }
            icon={<div className="bg-white border border-gray-200/50 w-full h-full rounded-xl flex items-center justify-center shadow-inner text-black"><NotionIcon className="w-6 h-6" /></div>}
            onConnect={() => handleConnectComposio('notion')}
            onManage={isNotionConnected ? () => setIsNotionPickerOpen(true) : undefined}
            onDisconnect={() => handleDisconnectComposio('notion')}
          />

          <IntegrationCard
            id="slack"
            title="Slack"
            description="Send messages and interact with Slack."
            status={isSlackConnected ? 'connected' : (isProUser ? 'available' : 'upgrade')}
            infoText={isSlackConnected ? getComposioInfoText('slack') : undefined}
            icon={<div className="bg-white border border-gray-200/50 w-full h-full rounded-xl flex items-center justify-center shadow-inner"><SlackIcon className="w-6 h-6" /></div>}
            onConnect={() => handleConnectComposio('slack')}
            onManage={isSlackConnected ? () => setComposioManageProvider('slack') : undefined}
            onDisconnect={() => handleDisconnectComposio('slack')}
          />

          <IntegrationCard
            id="linear"
            title="Linear"
            description="Manage Linear issues with Bruno."
            status={isLinearConnected ? 'connected' : (isProUser ? 'available' : 'upgrade')}
            infoText={isLinearConnected ? getComposioInfoText('linear') : undefined}
            icon={<div className="bg-white border border-gray-200/50 w-full h-full rounded-xl flex items-center justify-center shadow-inner"><LinearIcon className="w-6 h-6" /></div>}
            onConnect={() => handleConnectComposio('linear')}
            onManage={isLinearConnected ? () => setComposioManageProvider('linear') : undefined}
            onDisconnect={() => handleDisconnectComposio('linear')}
          />
        </div>
      </section>

      <CanvasConnectModal
        isOpen={isCanvasModalOpen}
        onClose={() => setIsCanvasModalOpen(false)}
        onSuccess={(url) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setProfile((p: any) => ({ ...p, canvas_url: url }));
          fetchIntegrationsData();
          setTimeout(() => setIsCanvasModalOpen(false), 1500);
        }}
      />

      <GoogleCalendarManageModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        profile={profile}
        onProfileUpdate={setProfile}
        onDisconnect={async (deleteData: boolean) => {
          await disconnectGoogleCalendarAction(deleteData);
          setAccounts(accs => accs.filter(a => a.provider !== 'google_calendar'));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setProfile((p: any) => ({ ...p, google_calendar_connected: false }));
          setIsGoogleModalOpen(false);
        }}
      />

      <UpgradeToProModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        featureName={upgradeFeatureName}
      />

      <OAuthConnectingModal
        isOpen={connectingProvider !== null}
        onClose={() => {
          setConnectingProvider(null);
          setOauthError(null);
          if (popupPollIntervalRef.current) {
            clearInterval(popupPollIntervalRef.current);
            popupPollIntervalRef.current = null;
          }
        }}
        provider={connectingProvider}
        error={oauthError}
      />

      <ComposioManageModal
        isOpen={composioManageProvider !== null}
        onClose={() => setComposioManageProvider(null)}
        provider={composioManageProvider}
        lastSyncedAt={
          composioManageProvider
            ? accounts.find((a) => a.provider === composioManageProvider)?.last_synced_at
            : null
        }
        onSaved={fetchIntegrationsData}
      />

      <NotionDatabasePicker
        isOpen={isNotionPickerOpen}
        onClose={() => setIsNotionPickerOpen(false)}
        onSaved={fetchIntegrationsData}
        lastSyncedAt={accounts.find((a) => a.provider === 'notion')?.last_synced_at}
      />
    </div>
  );
}
