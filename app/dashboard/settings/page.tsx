'use client';

import ThemeToggle from '@/components/ui/ThemeToggle';
import ColorSchemeToggle from '@/components/ui/ColorSchemeToggle';
import Integrations from '@/components/settings/Integrations';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { User, Palette, Globe, CreditCard, Warning } from '@phosphor-icons/react';

export default function SettingsPage() {
  const [name, setName] = useState('');
  const [planType, setPlanType] = useState('free');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('name, plan_type')
          .eq('id', user.id)
          .single();
        
        if (data?.name) {
          setName(data.name);
        }
        if (data?.plan_type) {
          setPlanType(data.plan_type);
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, [supabase]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('users')
        .update({ name: name })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Settings updated!');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getPlanDisplay = (type: string) => {
    switch (type) {
      case 'elite': return 'ELITE PILOT';
      case 'team': return 'TEAM PILOT';
      case 'pro': return 'PRO PILOT';
      default: return 'STANDARD PILOT';
    }
  };

  return (
    <div className="space-y-12 animate-fade-in text-foreground max-w-5xl mx-auto pb-20">
      <header>
        <h1 className="text-5xl font-black uppercase tracking-tighter">Command Center</h1>
        <p className="text-surface-500 mt-2 text-base font-bold uppercase tracking-tight">Configure your schedule and integrations.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Appearance Panel */}
        <section className="glass p-8 space-y-8 border-2 border-surface-900 shadow-[4px_4px_0px_0px_var(--surface-900)]">
          <div className="flex items-center gap-3 border-b-2 border-surface-900 pb-4">
            <Palette weight="fill" className="size-6 text-accent-600" />
            <h2 className="text-2xl font-black uppercase">Visuals</h2>
          </div>
          
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-surface-400">Interface Mode</h3>
              <ThemeToggle />
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-surface-400">Primary Hue</h3>
              <p className="text-sm font-bold text-surface-500 mb-4">Select the accent color for your dashboard.</p>
              <ColorSchemeToggle />
            </div>
          </div>
        </section>

        {/* Profile Panel */}
        <section className="glass p-8 space-y-8 border-2 border-surface-900 shadow-[4px_4px_0px_0px_var(--surface-900)]">
          <div className="flex items-center gap-3 border-b-2 border-surface-900 pb-4">
            <User weight="fill" className="size-6 text-accent-600" />
            <h2 className="text-2xl font-black uppercase">Pilot Profile</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <label htmlFor="settings-name" className="block text-xs font-black uppercase mb-2">
                Display Name
              </label>
              <input
                id="settings-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Callsign..."
                disabled={loading}
                className="w-full px-4 py-3 bg-surface-100 border-2 border-surface-900 font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_var(--accent-500)] transition-all disabled:opacity-50"
              />
            </div>
            
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="w-full py-4 bg-surface-900 text-surface-100 font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_var(--accent-600)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
            >
              {saving ? 'Syncing...' : 'Update Callsign'}
            </button>
          </div>
        </section>
      </div>

      {/* Integrations - Full Width */}
      <section className="glass p-8 border-2 border-surface-900 shadow-[8px_8px_0px_0px_var(--surface-900)]">
        <div className="flex items-center gap-3 border-b-2 border-surface-900 pb-4 mb-8">
          <Globe weight="fill" className="size-6 text-accent-600" />
          <h2 className="text-2xl font-black uppercase">Academic Data Links</h2>
        </div>
        <Integrations />
      </section>

      {/* Subscription & Danger Zone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="glass p-8 border-2 border-surface-900 shadow-[4px_4px_0px_0px_var(--surface-900)] bg-[#121212] text-white">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard weight="fill" className="size-6 text-accent-500" />
            <h2 className="text-2xl font-black uppercase tracking-tight">Membership</h2>
          </div>
          <div className="flex flex-col gap-6">
            <div className="p-4 border-2 border-surface-700 bg-[#1a1a1a]">
              <span className="text-xs font-black uppercase text-accent-500">Current Tier</span>
              <p className={`text-2xl font-black ${planType.toLowerCase() === 'elite' ? 'text-accent-400' : 'text-white'}`}>
                {getPlanDisplay(planType)}
              </p>
            </div>
            {planType.toLowerCase() !== 'elite' ? (
              <button className="w-full py-4 bg-accent-500 hover:bg-accent-400 text-white font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_white] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all">
                Upgrade to Elite
              </button>
            ) : (
              <button className="w-full py-4 bg-white text-black font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_var(--accent-500)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all">
                Manage Subscription
              </button>
            )}
          </div>
        </section>

        <section className="glass p-8 border-2 border-error/30 hover:border-error transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <Warning weight="fill" className="size-6 text-error" />
            <h2 className="text-2xl font-black uppercase text-error">Eject</h2>
          </div>
          <p className="text-surface-500 text-sm font-bold uppercase mb-6">
            Permanently delete your profile and all flight data.
          </p>
          <button className="px-6 py-3 border-2 border-error text-error font-black uppercase text-xs hover:bg-error hover:text-white transition-all">
            Initiate Account Deletion
          </button>
        </section>
      </div>
    </div>
  );
}
