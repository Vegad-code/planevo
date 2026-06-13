'use client';

import Sidebar from '@/components/dashboard/Sidebar';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ensureUserProfile } from '@/lib/supabase/ensure-profile';
import { useUIStore } from '@/lib/store/ui-store';
import QuickCaptureModal from '@/components/tasks/QuickCaptureModal';
import { PlanevoLoader } from '@/components/branding/PlanevoLoader';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useUIStore();
  const pathname = usePathname();
  const isCalendar = pathname === '/dashboard/calendar';
  const [isChecking, setIsChecking] = useState(true);
  const [loaderMode, setLoaderMode] = useState<'loading' | 'complete'>('loading');
  const [showLoader, setShowLoader] = useState(true);

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

  useEffect(() => {
    if (!isChecking) {
      setLoaderMode('complete');
    }
  }, [isChecking]);

  if (showLoader) {
    return (
      <div className="min-h-screen bg-[#111113] flex items-center justify-center">
        <PlanevoLoader mode={loaderMode} onAnimationFinished={() => setShowLoader(false)} />
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
