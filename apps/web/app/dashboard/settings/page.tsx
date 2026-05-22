'use client';

import ThemeToggle from '@/components/ui/ThemeToggle';
import ColorSchemeToggle from '@/components/ui/ColorSchemeToggle';
import Integrations from '@/components/settings/Integrations';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getOrCreateReferralCode, getReferralLink, getReferralStats } from '@/lib/referral';
import { toast } from 'sonner';
import { User, Palette, Globe, CreditCard, Warning, Lightning, Gift, Copy } from '@phosphor-icons/react';

export default function SettingsPage() {
  const [name, setName] = useState('');
  const [assignmentViewPreference, setAssignmentViewPreference] = useState('all');
  const [planType, setPlanType] = useState('free');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState('');
  const [referralStats, setReferralStats] = useState({ total: 0, converted: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email ?? null);
        const { data } = await (supabase as any)
          .from('users')
          .select('name, plan_type, assignment_view_preference')
          .eq('id', user.id)
          .single();
        
        if (data?.name) {
          setName(data.name);
        }
        if (data?.plan_type) {
          setPlanType(data.plan_type);
        }
        if (data?.assignment_view_preference) {
          setAssignmentViewPreference(data.assignment_view_preference);
        }

        try {
          const code = await getOrCreateReferralCode(supabase as any, user.id);
          const stats = await getReferralStats(supabase as any, user.id);
          setReferralLink(getReferralLink(code));
          setReferralStats(stats);
        } catch (error) {
          console.error('Error loading referral data:', error);
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

      const { error } = await (supabase as any)
        .from('users')
        .update({ 
          name: name,
          assignment_view_preference: assignmentViewPreference
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Settings updated!');
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const OWNER_EMAIL = 'jabbouranthony720@gmail.com';
  const isOwner = userEmail?.toLowerCase() === OWNER_EMAIL.toLowerCase();

  const getPlanDisplay = (type: string) => {
    // Only the owner can see 'PREMIUM' for an 'admin' plan type
    if (type === 'admin') {
      return isOwner ? 'PREMIUM' : 'FREE';
    }
    
    switch (type) {
      case 'premium': return 'PREMIUM';
      case 'trialing': return 'TRIAL';
      case 'canceled': return 'CANCELED';
      default: return 'FREE';
    }
  };

  const isPremium = planType === 'premium' || planType === 'trialing' || (planType === 'admin' && isOwner);

  const handleCopyReferral = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied');
  };

  return (
    <div className="space-y-12 animate-fade-in text-[var(--color-text-dark)] max-w-5xl mx-auto pb-20">
      <header>
        <h1 className="text-5xl font-black uppercase tracking-tighter">Settings</h1>
        <p className="text-[var(--color-text-dark-muted)] mt-2 text-base font-bold uppercase tracking-tight">Configure your schedule and integrations.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Appearance Panel */}
        <section className="bg-[var(--color-card-dark)] p-8 space-y-8 border border-[var(--color-border-dark)] rounded-[22px]">
          <div className="flex items-center gap-3 border-b border-[var(--color-border-dark)] pb-4">
            <Palette weight="fill" className="size-6 text-[var(--color-text-dark)]" />
            <h2 className="text-2xl font-black uppercase">Visuals</h2>
          </div>
          
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--color-text-dark-muted)]">Interface Mode</h3>
              <ThemeToggle />
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--color-text-dark-muted)]">Primary Hue</h3>
              <p className="text-sm font-bold text-[var(--color-text-dark-muted)] mb-4">Select the accent color for your dashboard.</p>
              <ColorSchemeToggle />
            </div>
          </div>
        </section>

        {/* Profile Panel */}
        <section className="bg-[var(--color-card-dark)] p-8 space-y-8 border border-[var(--color-border-dark)] rounded-[22px]">
          <div className="flex items-center gap-3 border-b border-[var(--color-border-dark)] pb-4">
            <User weight="fill" className="size-6 text-[var(--color-text-dark)]" />
            <h2 className="text-2xl font-black uppercase">User Profile</h2>
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
                placeholder="Name..."
                disabled={loading}
                className="w-full px-4 py-3 bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)] rounded-[12px] font-bold focus:outline-none focus:border-[var(--color-text-dark)] transition-all disabled:opacity-50 text-[var(--color-text-dark)] placeholder:text-[var(--color-text-dark-muted)]"
              />
            </div>
            
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="w-full py-4 bg-[var(--color-text-dark)] text-[var(--color-bg-dark)] rounded-[12px] font-black uppercase tracking-widest hover:bg-[var(--color-text-dark)]/90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </section>
      </div>

      {/* Integrations - Full Width */}
      <section className="bg-[var(--color-card-dark)] p-8 border border-[var(--color-border-dark)] rounded-[22px]">
        <div className="flex items-center gap-3 border-b border-[var(--color-border-dark)] pb-4 mb-8">
          <Globe weight="fill" className="size-6 text-[var(--color-text-dark)]" />
          <h2 className="text-2xl font-black uppercase">Connected Sources</h2>
        </div>
        <Integrations />
      </section>

      {/* Dashboard Preferences */}
      <section className="bg-[var(--color-card-dark)] p-8 border border-[var(--color-border-dark)] rounded-[22px]">
        <div className="flex items-center gap-3 border-b border-[var(--color-border-dark)] pb-4 mb-8">
          <Lightning weight="fill" className="size-6 text-[var(--color-text-dark)]" />
          <h2 className="text-2xl font-black uppercase">Dashboard Experience</h2>
        </div>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--color-text-dark-muted)] mb-4">Assignment Visibility</h3>
            <p className="text-sm font-bold text-[var(--color-text-dark-muted)] mb-6">Choose how many assignments Bruno surfaces on your main dashboard.</p>
            
            <div className="flex flex-wrap gap-4">
              {[
                { id: 'day', label: 'Day', desc: 'Focus on today only' },
                { id: 'week', label: 'Week', desc: 'See the next 7 days' },
                { id: 'all', label: 'All', desc: 'Show everything synced' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={async () => {
                    setAssignmentViewPreference(opt.id);
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      await (supabase.from('users') as any).update({ assignment_view_preference: opt.id }).eq('id', user.id);
                    }
                  }}
                  className={`flex-1 min-w-[140px] p-6 border rounded-[16px] transition-all text-left ${
                    assignmentViewPreference === opt.id
                      ? 'border-[var(--color-text-dark)] bg-[var(--color-text-dark)]/5 text-[var(--color-text-dark)]'
                      : 'border-[var(--color-border-dark)] hover:border-[var(--color-text-dark)]/50 bg-transparent text-[var(--color-text-dark-muted)]'
                  }`}
                >
                  <div className="text-lg font-black uppercase tracking-tighter mb-1">{opt.label}</div>
                  <div className={`text-[10px] font-bold uppercase tracking-widest ${
                    assignmentViewPreference === opt.id ? 'text-[var(--color-text-dark)]/80' : 'text-[var(--color-text-dark-muted)]'
                  }`}>
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 p-6 border border-[var(--color-border-dark)] bg-[var(--color-bg-dark)] rounded-[16px] max-w-2xl">
            <p className="text-[10px] font-bold text-[var(--color-text-dark-muted)] uppercase tracking-widest leading-relaxed">
              Note: Bruno is designed to pull almost every assignment. However, if a teacher uses non-standard modules or external links, some data may be restricted. If you ever have a doubt, your Canvas link above is the final source of truth.
            </p>
          </div>
        </div>
      </section>
      
      {/* Bruno Brain panel archived in v1 — re-introduce in Block G (memory transparency UI). */}

      {/* Referrals */}
      <section className="bg-[var(--color-card-dark)] p-8 border border-[var(--color-border-dark)] rounded-[22px]">
        <div className="flex items-center gap-3 border-b border-[var(--color-border-dark)] pb-4 mb-8">
          <Gift weight="fill" className="size-6 text-[var(--color-text-dark)]" />
          <h2 className="text-2xl font-black uppercase">Refer a Friend</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-end">
          <div>
            <label htmlFor="referral-link" className="block text-xs font-black uppercase mb-2">
              Your referral link
            </label>
            <input
              id="referral-link"
              value={referralLink || 'Loading...'}
              readOnly
              className="w-full px-4 py-3 bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)] rounded-[12px] font-bold focus:outline-none text-[var(--color-text-dark)]"
            />
          </div>
          <button
            onClick={handleCopyReferral}
            disabled={!referralLink}
            className="px-6 py-3 bg-[var(--color-text-dark)] text-[var(--color-bg-dark)] rounded-[12px] font-black uppercase tracking-widest hover:bg-[var(--color-text-dark)]/90 active:scale-[0.98] transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            <Copy weight="bold" className="size-4" />
            Copy
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6 max-w-xl">
          <div className="p-4 border border-[var(--color-border-dark)] bg-[var(--color-bg-dark)] rounded-[12px]">
            <span className="text-[10px] font-black uppercase text-[var(--color-text-dark-muted)]">Total</span>
            <p className="text-2xl font-black">{referralStats.total}</p>
          </div>
          <div className="p-4 border border-[var(--color-border-dark)] bg-[var(--color-bg-dark)] rounded-[12px]">
            <span className="text-[10px] font-black uppercase text-[var(--color-text-dark-muted)]">Converted</span>
            <p className="text-2xl font-black">{referralStats.converted}</p>
          </div>
          <div className="p-4 border border-[var(--color-border-dark)] bg-[var(--color-bg-dark)] rounded-[12px]">
            <span className="text-[10px] font-black uppercase text-[var(--color-text-dark-muted)]">Pending</span>
            <p className="text-2xl font-black">{referralStats.pending}</p>
          </div>
        </div>
      </section>

      {/* Subscription & Danger Zone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-[#121212] p-8 border border-[var(--color-border-dark)] rounded-[22px] text-white">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard weight="fill" className="size-6 text-[var(--color-text-dark)]" />
            <h2 className="text-2xl font-black uppercase tracking-tight">Membership</h2>
          </div>
          <div className="flex flex-col gap-6">
            <div className="p-4 border border-[var(--color-border-dark)] bg-[#1a1a1a] rounded-[12px]">
              <span className="text-xs font-black uppercase text-[var(--color-text-dark)]">Current Tier</span>
              <p className={`text-2xl font-black ${isPremium ? 'text-[var(--color-text-dark)]' : 'text-white'}`}>
                {getPlanDisplay(planType)}
              </p>
            </div>
            {isPremium ? (
              <button className="w-full py-4 bg-white text-black rounded-[12px] font-black uppercase tracking-widest hover:bg-white/90 active:scale-[0.98] transition-all">
                Manage Subscription
              </button>
            ) : (
              <button className="w-full py-4 bg-[var(--color-text-dark)] text-[#121212] rounded-[12px] font-black uppercase tracking-widest hover:bg-[var(--color-text-dark)]/90 active:scale-[0.98] transition-all">
                Upgrade to Premium
              </button>
            )}
          </div>
        </section>

        <section className="bg-[var(--color-card-dark)] p-8 border border-red-500/30 rounded-[22px] hover:border-red-500 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <Warning weight="fill" className="size-6 text-red-500" />
            <h2 className="text-2xl font-black uppercase text-red-500">Danger Zone</h2>
          </div>
          <p className="text-[var(--color-text-dark-muted)] text-sm font-bold uppercase mb-6">
            Permanently delete your profile and all account data.
          </p>
          <button className="px-6 py-3 border border-red-500 rounded-[12px] text-red-500 font-black uppercase text-xs hover:bg-red-500 hover:text-white transition-all">
            Delete Account
          </button>
        </section>
      </div>
    </div>
  );
}
