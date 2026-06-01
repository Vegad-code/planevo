'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { disconnectCanvasAction } from '@/lib/canvas/actions';
import { disconnectGoogleCalendarAction } from '@/lib/integrations/google-calendar';
import { formatDistanceToNow } from 'date-fns';
import { IntegrationCard } from './IntegrationCard';
import { CanvasConnectModal } from './CanvasConnectModal';
import { GoogleCalendarManageModal } from './GoogleCalendarManageModal';
import { Calendar, SlackLogo, Kanban } from '@phosphor-icons/react';

export default function IntegrationsScreen() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);

  // Modal state
  const [isCanvasModalOpen, setIsCanvasModalOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  const fetchIntegrationsData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('id, google_calendar_connected, google_calendar_last_synced_at, scheduling_preferences, canvas_url')
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
    fetchIntegrationsData();
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
  
  const isCanvasConnected = canvasAccount ? canvasAccount.status === 'connected' : !!profile?.canvas_url;
  const isGoogleConnected = googleAccount ? googleAccount.status === 'connected' : !!profile?.google_calendar_connected;

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
            icon={<div className="bg-[var(--color-rose)] w-full h-full rounded-xl flex items-center justify-center font-serif text-2xl italic shadow-inner text-white">C</div>}
            onConnect={() => setIsCanvasModalOpen(true)}
            onManage={() => setIsCanvasModalOpen(true)}
            onDisconnect={async () => {
              const proceed = window.confirm("Are you sure you want to disconnect Canvas?");
              if (!proceed) return;
              const deleteData = window.confirm("Do you want to delete all imported Canvas tasks as well?\n\nClick 'OK' to delete them, or 'Cancel' to keep them.");
              await disconnectCanvasAction(deleteData);
              setAccounts(accs => accs.filter(a => a.provider !== 'canvas'));
              setProfile((p: any) => ({ ...p, canvas_url: null }));
            }}
          />

          <IntegrationCard
            id="google-calendar"
            title="Google Calendar"
            description="Imports your classes, meetings, and personal events."
            status={googleAccount?.status === 'error' ? 'error' : isGoogleConnected ? 'connected' : 'available'}
            infoText={isGoogleConnected ? `${profile?.email || 'Connected'} · synced ${googleAccount?.last_synced_at ? formatDistanceToNow(new Date(googleAccount.last_synced_at)) + ' ago' : 'never'}` : undefined}
            icon={<div className="bg-[var(--color-blue)] w-full h-full rounded-xl flex items-center justify-center text-white shadow-inner"><Calendar size={24} weight="fill" /></div>}
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
            status="coming-soon"
            icon={<div className="bg-settings-card border border-gray-200 w-full h-full rounded-xl flex items-center justify-center text-black font-bold shadow-inner">N</div>}
            onConnect={() => handleWaitlist('notion')}
          />

          <IntegrationCard
            id="slack"
            title="Slack"
            description="Channel mentions and saved messages become tasks."
            status="coming-soon"
            icon={<div className="bg-[#4A154B] w-full h-full rounded-xl flex items-center justify-center text-white shadow-inner"><SlackLogo size={24} weight="fill" /></div>}
            onConnect={() => handleWaitlist('slack')}
          />

          <IntegrationCard
            id="linear"
            title="Linear"
            description="Bring in issues assigned to you."
            status="coming-soon"
            icon={<div className="bg-[#5E6AD2] w-full h-full rounded-xl flex items-center justify-center text-white shadow-inner"><Kanban size={24} weight="fill" /></div>}
            onConnect={() => handleWaitlist('linear')}
          />
        </div>
      </section>

      <CanvasConnectModal 
        isOpen={isCanvasModalOpen} 
        onClose={() => setIsCanvasModalOpen(false)}
        onSuccess={(url) => {
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
          setProfile((p: any) => ({ ...p, google_calendar_connected: false }));
          setIsGoogleModalOpen(false);
        }}
      />
    </div>
  );
}
