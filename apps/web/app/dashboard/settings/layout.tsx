import SettingsSidebar from '@/components/settings/SettingsSidebar';
import SettingsSearch from '@/components/settings/SettingsSearch';
import { createClient } from '@/lib/supabase/server';

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let profile = null;
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single();
    profile = { ...data, email: user.email };
  }

  return (
    <div className="min-h-screen bg-[#f4ece1] p-6 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header section */}
      <header className="flex flex-col gap-3">
        <div className="text-[10px] font-black uppercase tracking-widest text-[#8a7b66] flex items-center gap-2">
          <span>SETTINGS</span>
          <span>·</span>
          <span>WORKSPACE</span>
        </div>
        
        <div className="flex items-end justify-between pb-4">
          <div className="space-y-1.5">
            <h1 className="text-4xl tracking-tight text-[#2A2118]">
              <span className="font-sans font-light">Make Planevo </span>
              <span className="font-serif italic text-[#D08741]">yours.</span>
            </h1>
            <p className="text-sm font-medium text-[#8a7b66]">
              Tune what Bruno knows about your week, your tools, and how loud he should be.
            </p>
          </div>
          
          <div className="pb-1">
            <SettingsSearch />
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex gap-6 flex-col md:flex-row pb-20">
        <SettingsSidebar profile={profile} />
        
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
