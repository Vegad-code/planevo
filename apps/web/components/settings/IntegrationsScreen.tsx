'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { disconnectCanvasAction, getCanvasCredentialsAction } from '@/lib/canvas/actions';
import { disconnectGoogleCalendarAction } from '@/lib/integrations/google-calendar';
import { IntegrationCard } from './IntegrationCard';
import { CanvasConnectModal } from './CanvasConnectModal';
import { GoogleCalendarManageModal } from './GoogleCalendarManageModal';
import { Calendar, SlackLogo, Kanban } from '@phosphor-icons/react';

export default function IntegrationsScreen() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  
  // Modal state
  const [isCanvasModalOpen, setIsCanvasModalOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setProfile({ ...data, email: user.email });
        }

        const canvasRes = await getCanvasCredentialsAction();
        if (canvasRes.success && canvasRes.data) {
          setProfile((p: any) => ({ ...p, canvas_token: canvasRes.data!.canvasToken, canvas_url: canvasRes.data!.canvasUrl }));
        }
      }
      setLoading(false);
    }
    getProfile();
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
        scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
      },
    });
    if (error) {
      console.error('Google Calendar OAuth error:', error);
    }
  };

  // handleSyncGoogle is now inside GoogleCalendarManageModal

  const isCanvasConnected = !!profile?.canvas_token;
  const isGoogleConnected = !!profile?.google_calendar_connected;

  if (loading) return <div className="animate-pulse h-64 bg-white/50 rounded-3xl" />;

  return (
    <div className="space-y-6 animate-fade-in text-[#2A2118]">
      {/* Page Header */}
      <div>
        <h2 className="text-[32px] font-serif italic text-[#2A2118] mb-1 leading-tight">Sources & Integrations</h2>
        <p className="text-[13px] font-medium text-[#8a7b66] max-w-2xl leading-relaxed">
          The more sources you connect, the smarter Bruno&apos;s plan. We only read deadlines and events — never your private content.
        </p>
      </div>

      {/* Academic Sources Section */}
      <section className="bg-white rounded-2xl border border-[#e6dcce] p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8a7b66] mb-2">
            ACADEMIC SOURCES
          </h3>
          <h4 className="text-2xl font-light text-[#2A2118] mb-0.5 leading-tight">
            Your <span className="font-serif italic text-[#D08741] font-normal">school</span> stuff.
          </h4>
          <p className="text-[13px] font-medium text-[#8a7b66]">
            Sync courses, deadlines, and class schedules.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <IntegrationCard
            id="canvas"
            title="Canvas LMS"
            description="Pulls assignments, quizzes, and due dates from your enrolled courses."
            status={isCanvasConnected ? 'connected' : 'available'}
            infoText={isCanvasConnected ? 'Syncing automatically' : undefined}
            icon={<div className="bg-[#C56B5E] w-full h-full rounded-xl flex items-center justify-center font-serif text-2xl italic shadow-inner text-white">C</div>}
            onConnect={() => setIsCanvasModalOpen(true)}
            onManage={() => setIsCanvasModalOpen(true)}
            onDisconnect={async () => {
              await disconnectCanvasAction();
              setProfile((p: any) => ({ ...p, canvas_token: null, canvas_url: null }));
            }}
          />

          <IntegrationCard
            id="google-calendar"
            title="Google Calendar"
            description="Imports your classes, meetings, and personal events."
            status={isGoogleConnected ? 'connected' : 'available'}
            infoText={isGoogleConnected ? `${profile?.email || 'Connected'} · synced ${profile?.google_calendar_last_synced_at ? 'recently' : 'never'}` : undefined}
            icon={<div className="bg-[#5B8DCF] w-full h-full rounded-xl flex items-center justify-center text-white shadow-inner"><Calendar size={24} weight="fill" /></div>}
            onConnect={handleConnectGoogle}
            onManage={() => setIsGoogleModalOpen(true)}
          />
        </div>
      </section>

      {/* Productivity & Premium Section */}
      <section className="bg-white rounded-2xl border border-[#e6dcce] p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8a7b66] mb-2">
            PRODUCTIVITY · PREMIUM
          </h3>
          <h4 className="text-2xl font-light text-[#2A2118] mb-0.5 leading-tight">
            For when <span className="font-serif italic text-[#D08741] font-normal">work</span> creeps in.
          </h4>
          <p className="text-[13px] font-medium text-[#8a7b66]">
            Bring in side-projects, internships, and team work. Available with the Builder plan.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <IntegrationCard
            id="notion"
            title="Notion"
            description="Pull database deadlines and project pages."
            status="coming-soon"
            icon={<div className="bg-white border border-gray-200 w-full h-full rounded-xl flex items-center justify-center text-black font-bold shadow-inner">N</div>}
          />

          <IntegrationCard
            id="slack"
            title="Slack"
            description="Channel mentions and saved messages become tasks."
            status="coming-soon"
            icon={<div className="bg-[#4A154B] w-full h-full rounded-xl flex items-center justify-center text-white shadow-inner"><SlackLogo size={24} weight="fill" /></div>}
          />

          <IntegrationCard
            id="linear"
            title="Linear"
            description="Bring in issues assigned to you."
            status="coming-soon"
            icon={<div className="bg-[#5E6AD2] w-full h-full rounded-xl flex items-center justify-center text-white shadow-inner"><Kanban size={24} weight="fill" /></div>}
          />
        </div>
      </section>

      <CanvasConnectModal 
        isOpen={isCanvasModalOpen} 
        onClose={() => setIsCanvasModalOpen(false)}
        onSuccess={(url, token) => {
          setProfile((p: any) => ({ ...p, canvas_token: token, canvas_url: url }));
          setTimeout(() => setIsCanvasModalOpen(false), 1500);
        }}
      />

      <GoogleCalendarManageModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        profile={profile}
        onProfileUpdate={setProfile}
        onDisconnect={async () => {
          await disconnectGoogleCalendarAction();
          setProfile((p: any) => ({ ...p, google_calendar_connected: false }));
          setIsGoogleModalOpen(false);
        }}
      />
    </div>
  );
}
