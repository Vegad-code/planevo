import SettingsSidebar from '@/components/settings/SettingsSidebar';
import SettingsSearch from '@/components/settings/SettingsSearch';
import { createClient } from '@/lib/supabase/server';

import { normalizePlanType } from '@/lib/auth/plan-types';

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  let membershipBadge = 'FREE';

  if (user) {
    const { data } = await supabase
      .from('users')
      .select('name, plan_type, subscription_status, trial_end')
      .eq('id', user.id)
      .single();
    profile = { ...data, email: user.email };

    if (data) {
      const plan = normalizePlanType(data.plan_type);
      const isOwner = user.email?.toLowerCase() === 'jabbouranthony720@gmail.com';
      const effectivePlan = (plan === 'admin' && !isOwner) ? 'free' : plan;

      if (effectivePlan === 'trialing' && data.trial_end) {
        const daysLeft = Math.ceil((new Date(data.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        membershipBadge = daysLeft > 0 ? `TRIAL · ${daysLeft}D` : 'TRIAL ENDED';
      } else if (['premium', 'student', 'admin'].includes(effectivePlan)) {
        membershipBadge = effectivePlan.toUpperCase();
      } else if (effectivePlan === 'canceled') {
        membershipBadge = 'CANCELED';
      } else {
        membershipBadge = 'FREE';
      }
    }
  }

  // Mock integrations badge for now, calculate membership dynamically
  const badges: Record<string, string> = {
    integrations: '0 / 1',
    membership: membershipBadge
  };

  return (
    <div className="min-h-screen bg-settings-bg p-4 md:p-10 lg:p-12 w-full mx-auto flex flex-col gap-8 transition-colors">
      {/* Header section */}
      <header className="flex flex-col gap-3 border-b border-settings-border/40 pb-8">
        <div className="text-[10px] font-black uppercase tracking-widest text-settings-text-muted flex items-center gap-2">
          <span>SETTINGS</span>
          <span>·</span>
          <span>WORKSPACE</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl tracking-tight text-settings-text">
              <span className="font-sans font-light">Make Planevo </span>
              <span className="font-serif italic text-settings-brand">yours.</span>
            </h1>
            <p className="text-base text-settings-text-muted max-w-xl">
              Tune what Bruno knows about your week, your tools, and how loud he should be.
            </p>
          </div>

          <div className="pb-1 w-full md:w-auto">
            <SettingsSearch />
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex gap-6 lg:gap-12 flex-col md:flex-row pb-20 pt-2">
        <aside className="md:w-64 lg:w-72 flex-shrink-0 md:sticky md:top-8 self-start md:max-h-[calc(100vh-4rem)] md:overflow-y-auto hidden-scrollbar w-full">
          <SettingsSidebar profile={profile} badges={badges} />
        </aside>

        <main className="flex-1 min-w-0 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
