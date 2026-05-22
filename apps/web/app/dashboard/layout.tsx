'use client';

import Sidebar from '@/components/dashboard/Sidebar';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ensureUserProfile } from '@/lib/supabase/ensure-profile';
import { useUIStore } from '@/lib/store/ui-store';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useUIStore();
  const pathname = usePathname();
  const isCalendar = pathname === '/dashboard/calendar';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      ensureUserProfile(supabase).then(({ profile }) => {
        if (profile && user) {
          if (!profile.onboarding_complete) {
            window.location.href = '/onboarding';
          } else {
            const planType = profile.plan_type || 'free';
            const isAdminEmail = user.email?.toLowerCase() === 'jabbouranthony720@gmail.com';
            const isActive = ['pro_monthly', 'pro_annual', 'trialing', 'premium'].includes(planType) || (planType === 'admin' && isAdminEmail) || isAdminEmail;
            if (!isActive) {
              window.location.href = '/onboarding';
            }
          }
        }
      }).catch(console.error);
    });
  }, []);


  if (!mounted) {
    return (
      <div className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[var(--color-honey)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)] transition-colors duration-300">
      <Sidebar />

      {/* Main content area - offset by sidebar width */}
      <main
        className={`
          transition-all duration-300 ease-in-out
          lg:ml-[240px] min-h-screen
          ${sidebarCollapsed ? 'lg:ml-[68px]' : ''}
        `}
      >
        <div className={`p-6 lg:p-8 ${isCalendar ? 'max-w-[1400px]' : (sidebarCollapsed ? 'max-w-full px-12' : 'max-w-5xl')} mx-auto transition-all duration-300`}>
          {children}
        </div>
      </main>
    </div>
  );
}
