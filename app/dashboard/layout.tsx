'use client';

import Sidebar from '@/components/dashboard/Sidebar';
import AcademicSearch from '@/components/dashboard/AcademicSearch';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ensureUserProfile } from '@/lib/supabase/ensure-profile';
import OllieChat from '@/components/ollie/OllieChat';
import OmniBox from '@/components/dashboard/OmniBox';
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
    setMounted(true);
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

      {/* Main content area — offset by sidebar width */}
      <main
        className={`
          transition-all duration-300 ease-in-out
          lg:ml-[240px] min-h-screen
          ${sidebarCollapsed ? 'lg:ml-[68px]' : ''}
        `}
      >
        {/* Top Bar with Academic Search */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b-2 border-border px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <AcademicSearch />
          </div>
          <div className="flex items-center gap-3 text-[10px] font-black text-surface-400 uppercase tracking-widest shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-surface-100 border border-surface-200 rounded-lg cursor-default" title="Quick Capture: Add tasks from anywhere">
              <kbd className="text-surface-500">⌘J</kbd>
              <span className="text-surface-300">Quick Add</span>
            </div>
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            Ollie Online
          </div>
        </div>

        <div className={isCalendar ? "h-[calc(100vh-64px)] w-full" : "p-6 lg:p-8 max-w-7xl mx-auto"}>
          {children}
        </div>
      </main>
      <OllieChat />
      <OmniBox />
    </div>
  );
}
