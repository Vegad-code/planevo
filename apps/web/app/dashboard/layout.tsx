'use client';

import Sidebar from '@/components/dashboard/Sidebar';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ensureUserProfile } from '@/lib/supabase/ensure-profile';
import { useUIStore } from '@/lib/store/ui-store';
import QuickCaptureModal from '@/components/tasks/QuickCaptureModal';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useUIStore();
  const pathname = usePathname();
  const isCalendar = pathname === '/dashboard/calendar';
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.href = '/login';
        return;
      }
      ensureUserProfile(supabase).then(({ profile }) => {
        if (profile) {
          if (!profile.onboarding_complete) {
            if (window.location.search.includes('checkout=success')) {
              window.location.href = '/onboarding?checkout=success';
            } else {
              window.location.href = '/onboarding';
            }
          } else {
            setIsChecking(false);
          }
        } else {
          setIsChecking(false);
        }
      }).catch((err) => {
        console.error(err);
        setIsChecking(false);
      });
    });
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-cream text-(--color-ink) flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-(--color-honey) border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream text-(--color-ink) transition-colors duration-300">
      <Sidebar />

      {/* Main content area - offset by sidebar width */}
      <main
        className={`
          transition-all duration-300 ease-in-out min-h-screen
          ${sidebarCollapsed ? 'lg:ml-17' : 'lg:ml-60'}
        `}
      >
        <div className={`p-6 lg:p-8 w-full ${isCalendar ? 'max-w-350' : (sidebarCollapsed ? 'max-w-400' : 'max-w-5xl')} mx-auto transition-all duration-300 ease-in-out`}>
          {children}
        </div>
      </main>

      <QuickCaptureModal />
    </div>
  );
}
