import { DeleteAccountCard } from '@/components/settings/DeleteAccountCard';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

function getConfirmationText(email: string | undefined) {
  return email?.trim() || 'DELETE MY ACCOUNT';
}

export default async function DangerZonePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <div className="space-y-8 animate-fade-in text-settings-text">
      <div>
        <h2 className="text-3xl font-serif italic text-[var(--color-rose)] mb-3">Danger Zone</h2>
        <p className="text-sm font-medium text-settings-text-muted max-w-2xl leading-relaxed">
          Destructive account actions that cannot be undone.
        </p>
      </div>

      <DeleteAccountCard confirmationText={getConfirmationText(user.email)} />
    </div>
  );
}
