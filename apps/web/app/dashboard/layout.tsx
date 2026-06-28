import { getAuthenticatedProfile } from '@/lib/auth/get-authenticated-profile';
import { UserProfileProvider } from '@/components/providers/UserProfileProvider';
import DashboardClientShell from './DashboardClientShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authenticated = await getAuthenticatedProfile();

  return (
    <UserProfileProvider initial={authenticated}>
      <DashboardClientShell>{children}</DashboardClientShell>
    </UserProfileProvider>
  );
}
