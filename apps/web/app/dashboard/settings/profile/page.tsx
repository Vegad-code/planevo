import { createClient } from '@/lib/supabase/server';
import { UpdateIdentityForm } from '@/components/settings/UpdateIdentityForm';
import { UpdateContextForm } from '@/components/settings/UpdateContextForm';
import { UpdateBaselineForm } from '@/components/settings/UpdateBaselineForm';
import { AccountSecuritySummary } from '@/components/settings/AccountSecuritySummary';
import { ChangePasswordSection } from '@/components/settings/ChangePasswordForm';
import { redirect } from 'next/navigation';

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  const { data: userData } = await supabase
    .from('users')
    .select('name, energy_preference, scheduling_preferences, avatar_url')
    .eq('id', user.id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileData = (userData?.scheduling_preferences as Record<string, any>) || {};

  const initialData = {
    ...userData,
    ...profileData,
    preferred_name: userData?.name || profileData?.preferred_name,
    email: user.email,
    provider: user.app_metadata?.provider || 'Email',
    identities: user.identities?.map((identity) => ({ provider: identity.provider })),
    last_sign_in_at: user.last_sign_in_at,
    avatar_url: userData?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
  };

  return (
    <div className="space-y-8 animate-fade-in text-settings-text">
      <div>
        <h2 className="text-3xl font-serif italic text-settings-text mb-3">Profile</h2>
        <p className="text-sm font-medium text-settings-text-muted max-w-2xl leading-relaxed">
          Manage your personal details and how Planevo identifies you.
        </p>
      </div>
      
      <div className="flex flex-col gap-12">
        <UpdateIdentityForm initialData={initialData} />
        <UpdateContextForm initialData={initialData} />
        <UpdateBaselineForm initialData={initialData} />
        <AccountSecuritySummary initialData={initialData} />
        <ChangePasswordSection
          provider={initialData.provider}
          identities={initialData.identities}
        />
      </div>
    </div>
  );
}
