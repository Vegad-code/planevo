'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { disconnectCanvasAction } from '@/lib/canvas/actions';
import { disconnectGoogleCalendarAction } from '@/lib/integrations/google-calendar';
import { formatDistanceToNow } from 'date-fns';
import { IntegrationCard } from './IntegrationCard';
import { CanvasConnectModal } from './CanvasConnectModal';
import { GoogleCalendarManageModal } from './GoogleCalendarManageModal';
import { NotionManageModal } from './NotionManageModal';
import { SlackManageModal } from './SlackManageModal';
import { LinearManageModal } from './LinearManageModal';
import { LinearConfigModal } from './LinearConfigModal';
import { disconnectNotionAction } from '@/lib/integrations/notion';
import { disconnectSlackAction } from '@/lib/integrations/slack';
import { disconnectLinearAction } from '@/lib/integrations/linear';
import { UpgradeToProModal } from './UpgradeToProModal';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Calendar, SlackLogo, Kanban } from '@phosphor-icons/react';
import { SlackIcon, NotionIcon, LinearIcon, GoogleIcon, CanvasIcon } from '../icons/BrandIcons';

export default function IntegrationsScreen() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [accounts, setAccounts] = useState<any[]>([]);

  // Modal state
  const [isCanvasModalOpen, setIsCanvasModalOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isNotionModalOpen, setIsNotionModalOpen] = useState(false);
  const [isSlackModalOpen, setIsSlackModalOpen] = useState(false);
  const [isLinearModalOpen, setIsLinearModalOpen] = useState(false);
  const [isLinearConfigModalOpen, setIsLinearConfigModalOpen] = useState(false);

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeFeatureName, setUpgradeFeatureName] = useState('');

  const fetchIntegrationsData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('id, google_calendar_connected, google_calendar_last_synced_at, scheduling_preferences, canvas_url, plan_type')
        .eq('id', user.id)
        .single();

      if (userProfile) {
        setProfile({ ...userProfile, email: user.email });
      }

      const { data: integrationAccounts } = await supabase
        .from('integration_accounts')
        .select('id, provider, provider_account_id, display_name, status, last_synced_at, last_error')
        .eq('user_id', user.id);

      if (integrationAccounts) {
        setAccounts(integrationAccounts);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve(); // defer setState out of synchronous effect body
      if (!cancelled) fetchIntegrationsData();
    })();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'oauth_result') {
        const { provider, error } = event.data;
        if (error) {
          alert(`Failed to connect ${provider}: ${error}`);
        } else {
          fetchIntegrationsData();
          if (provider === 'linear') {
            setIsLinearConfigModalOpen(true);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      cancelled = true;
      window.removeEventListener('message', handleMessage);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const handleConnectGoogle = async () => {
    const redirectTo = `${window.location.origin}/api/auth/callback/google-calendar?next=/dashboard/settings/integrations`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        scopes: 'https://www.googleapis.com/auth/calendar.readonly',
      },
    });
    if (error) {
      console.error('Google Calendar OAuth error:', error);
    }
  };

  const isProUser = profile?.plan_type && !['free', 'canceled'].includes(profile.plan_type);

  const handleUpgradeClick = (featureName: string) => {
    setUpgradeFeatureName(featureName);
    setIsUpgradeModalOpen(true);
  };

  const openOAuthPopup = (url: string, providerName: string) => {
    const width = 600;
    const height = 700;
    const left = (window.innerWidth / 2) - (width / 2);
    const top = (window.innerHeight / 2) - (height / 2);
    window.open(url, `oauth_${providerName}`, `width=${width},height=${height},top=${top},left=${left}`);
  };

  const handleConnectNotion = () => {
    if (!isProUser) return handleUpgradeClick('Notion');
    const clientId = process.env.NEXT_PUBLIC_NOTION_CLIENT_ID;
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/callback/notion`);
    if (!clientId) {
      console.error('NEXT_PUBLIC_NOTION_CLIENT_ID is not set in environment variables.');
      alert('Notion integration is not fully configured on the server yet.');
      return;
    }
    const notionAuthUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${redirectUri}`;
    openOAuthPopup(notionAuthUrl, 'notion');
  };

  const handleConnectSlack = () => {
    if (!isProUser) return handleUpgradeClick('Slack');
    const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID;
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/callback/slack`);
    if (!clientId) {
      console.error('NEXT_PUBLIC_SLACK_CLIENT_ID is not set in environment variables.');
      alert('Slack integration is not fully configured on the server yet.');
      return;
    }
    const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&user_scope=stars:read&redirect_uri=${redirectUri}`;
    openOAuthPopup(slackAuthUrl, 'slack');
  };

  const handleConnectLinear = () => {
    if (!isProUser) return handleUpgradeClick('Linear');
    const clientId = process.env.NEXT_PUBLIC_LINEAR_CLIENT_ID;
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/callback/linear`);
    if (!clientId) {
      console.error('NEXT_PUBLIC_LINEAR_CLIENT_ID is not set in environment variables.');
      alert('Linear integration is not fully configured on the server yet.');
      return;
    }
    const linearAuthUrl = `https://linear.app/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=read`;
    openOAuthPopup(linearAuthUrl, 'linear');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleWaitlist = async (provider: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('integration_waitlist_requests').upsert({ user_id: user.id, provider }, { onConflict: 'user_id,provider' });
      // You could also show a toast here
    }
  };

  // handleSyncGoogle is now inside GoogleCalendarManageModal

  const canvasAccount = accounts.find(a => a.provider === 'canvas');
  const googleAccount = accounts.find(a => a.provider === 'google_calendar');
  const notionAccount = accounts.find(a => a.provider === 'notion');
  const slackAccount = accounts.find(a => a.provider === 'slack');
  const linearAccount = accounts.find(a => a.provider === 'linear');

  const isCanvasConnected = canvasAccount ? canvasAccount.status === 'connected' : !!profile?.canvas_url;
  const isGoogleConnected = googleAccount ? googleAccount.status === 'connected' : !!profile?.google_calendar_connected;
  const isNotionConnected = notionAccount ? notionAccount.status === 'connected' : false;
  const isSlackConnected = slackAccount ? slackAccount.status === 'connected' : false;
  const isLinearConnected = linearAccount ? linearAccount.status === 'connected' : false;

  if (loading) return <div className="animate-pulse h-64 bg-settings-card/50 rounded-3xl" />;

  return (
    <div className="space-y-6 animate-fade-in text-settings-text">
      {/* Page Header */}
      <div>
        <h2 className="text-[32px] font-serif italic text-settings-text mb-1 leading-tight">Sources & Integrations</h2>
        <p className="text-[13px] font-medium text-settings-text-muted max-w-2xl leading-relaxed">
          The more sources you connect, the smarter Bruno&apos;s plan. We only read deadlines and events — never your private content.
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
            PRODUCTIVITY · PREMIUM
          </h3>
          <h4 className="text-2xl font-light text-settings-text mb-0.5 leading-tight">
            For when <span className="font-serif italic text-settings-brand font-normal">work</span> creeps in.
          </h4>
          <p className="text-[13px] font-medium text-settings-text-muted">
            Bring in side-projects, internships, and team work. Available with the Builder plan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <IntegrationCard
            id="notion"
            title="Notion"
            description="Pull database deadlines and project pages."
            status={notionAccount?.status === 'error' ? 'error' : isNotionConnected ? 'connected' : (isProUser ? 'available' : 'upgrade')}
            infoText={isNotionConnected ? `Synced ${notionAccount?.last_synced_at ? formatDistanceToNow(new Date(notionAccount.last_synced_at)) + ' ago' : 'never'}` : undefined}
            icon={<div className="bg-white border border-gray-200/50 w-full h-full rounded-xl flex items-center justify-center shadow-inner text-black"><NotionIcon className="w-6 h-6" /></div>}
            onConnect={handleConnectNotion}
            onManage={() => setIsNotionModalOpen(true)}
          />

          <IntegrationCard
            id="slack"
            title="Slack"
            description="Channel mentions and saved messages become tasks."
            status={slackAccount?.status === 'error' ? 'error' : isSlackConnected ? 'connected' : (isProUser ? 'available' : 'upgrade')}
            infoText={isSlackConnected ? `Synced ${slackAccount?.last_synced_at ? formatDistanceToNow(new Date(slackAccount.last_synced_at)) + ' ago' : 'never'}` : undefined}
            icon={<div className="bg-white border border-gray-200/50 w-full h-full rounded-xl flex items-center justify-center shadow-inner"><SlackIcon className="w-6 h-6" /></div>}
            onConnect={handleConnectSlack}
            onManage={() => setIsSlackModalOpen(true)}
          />

          <IntegrationCard
            id="linear"
            title="Linear"
            description="Bring in issues assigned to you."
            status={linearAccount?.status === 'error' ? 'error' : isLinearConnected ? 'connected' : (isProUser ? 'available' : 'upgrade')}
            infoText={isLinearConnected ? `Synced ${linearAccount?.last_synced_at ? formatDistanceToNow(new Date(linearAccount.last_synced_at)) + ' ago' : 'never'}` : undefined}
            icon={<div className="bg-white border border-gray-200/50 w-full h-full rounded-xl flex items-center justify-center shadow-inner"><LinearIcon className="w-6 h-6" /></div>}
            onConnect={handleConnectLinear}
            onManage={() => setIsLinearModalOpen(true)}
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

      <NotionManageModal
        isOpen={isNotionModalOpen}
        onClose={() => setIsNotionModalOpen(false)}
        profile={profile}
        onProfileUpdate={setProfile}
        onDisconnect={async (deleteData: boolean) => {
          await disconnectNotionAction(deleteData);
          setAccounts(accs => accs.filter(a => a.provider !== 'notion'));
          setIsNotionModalOpen(false);
        }}
      />

      <SlackManageModal
        isOpen={isSlackModalOpen}
        onClose={() => setIsSlackModalOpen(false)}
        profile={profile}
        onProfileUpdate={setProfile}
        onDisconnect={async (deleteData: boolean) => {
          await disconnectSlackAction(deleteData);
          setAccounts(accs => accs.filter(a => a.provider !== 'slack'));
          setIsSlackModalOpen(false);
        }}
      />

      <LinearManageModal
        isOpen={isLinearModalOpen}
        onClose={() => setIsLinearModalOpen(false)}
        profile={profile}
        onProfileUpdate={setProfile}
        onDisconnect={async (deleteData: boolean) => {
          await disconnectLinearAction(deleteData);
          setAccounts(accs => accs.filter(a => a.provider !== 'linear'));
          setIsLinearModalOpen(false);
        }}
        onConfigure={() => {
          setIsLinearModalOpen(false);
          setIsLinearConfigModalOpen(true);
        }}
      />

      <LinearConfigModal
        isOpen={isLinearConfigModalOpen}
        onClose={() => setIsLinearConfigModalOpen(false)}
        onComplete={() => {
          setIsLinearConfigModalOpen(false);
          fetchIntegrationsData();
        }}
      />

      <UpgradeToProModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        featureName={upgradeFeatureName}
      />
    </div>
  );
}
