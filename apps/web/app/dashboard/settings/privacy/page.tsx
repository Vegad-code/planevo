import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DataExportCard, PrivacyLegalLinks } from '@/components/settings/PrivacyCenter';

export const metadata = {
  title: 'Data & Privacy | Planevo Settings',
};

export default async function PrivacySettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in text-settings-text">
      <div>
        <h2 className="text-3xl font-serif italic text-settings-text mb-3">Data & Privacy</h2>
        <p className="text-sm font-medium text-settings-text-muted max-w-2xl leading-relaxed">
          Export your information, review legal policies, or permanently delete your account.
        </p>
      </div>

      <DataExportCard userEmail={user.email ?? null} />
      <PrivacyLegalLinks />
    </div>
  );
}
