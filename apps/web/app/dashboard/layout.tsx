import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardClientShell from './DashboardClientShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('onboarding_complete')
    .eq('id', user.id)
    .maybeSingle();

  if (profile && !profile.onboarding_complete) {
    redirect('/onboarding');
  }

  return <DashboardClientShell>{children}</DashboardClientShell>;
}
