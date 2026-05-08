'use client';

import Sidebar from '@/components/dashboard/Sidebar';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ensureUserProfile } from '@/lib/supabase/ensure-profile';
import OllieChat from '@/components/ollie/OllieChat';
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
    ensureUserProfile(supabase).catch(console.error);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Sidebar />

      {/* Main content area - offset by sidebar width */}
      <main
        className={`
          transition-all duration-300 ease-in-out
          lg:ml-[240px] min-h-screen
          ${sidebarCollapsed ? 'lg:ml-[68px]' : ''}
        `}
      >
        <div className={isCalendar ? "h-[calc(100vh-0px)] w-full" : "p-6 lg:p-8 max-w-5xl mx-auto"}>
          {children}
        </div>
      </main>
      <OllieChat />
    </div>
  );
}
