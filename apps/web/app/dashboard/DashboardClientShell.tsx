'use client';

import { useAppearance } from '@/components/providers/AppearanceProvider';
import Sidebar from '@/components/dashboard/Sidebar';
import { getSidebarMainOffset } from '@/lib/dashboard/sidebar-layout';
import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/lib/store/ui-store';
import QuickCaptureModal from '@/components/tasks/QuickCaptureModal';
import {
  LOADER_SPIN_MS,
  PlanevoLoader,
} from '@/components/branding/PlanevoLoader';
import { BrunoProvider } from '@/components/bruno/BrunoProvider';
import { BrunoShell } from '@/components/bruno/BrunoShell';
import { ProIntegrationsProvider } from '@/components/providers/ProIntegrationsProvider';
import {
  DASHBOARD_SHELL_SESSION_FLAG,
  setSessionFlag,
} from '@/lib/tab-coordination';

export default function DashboardClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useUIStore();
  const { sidebarStyle } = useAppearance();
  const pathname = usePathname();
  const isCalendar = pathname === '/dashboard/calendar';
  const mainOffset = getSidebarMainOffset(sidebarStyle, sidebarCollapsed);
  const [showLoader, setShowLoader] = useState(true);
  const [loaderMode, setLoaderMode] = useState<'loading' | 'complete'>('loading');

  useEffect(() => {
    const spinTimer = window.setTimeout(() => {
      setLoaderMode('complete');
    }, LOADER_SPIN_MS);

    return () => window.clearTimeout(spinTimer);
  }, []);

  const handleLoaderFinished = useCallback(() => {
    setSessionFlag(DASHBOARD_SHELL_SESSION_FLAG);
    setShowLoader(false);
  }, []);

  return (
    <ProIntegrationsProvider>
      <BrunoProvider>
        <div
          className={`bg-cream text-(--color-ink) transition-colors duration-300 ${
            isCalendar ? 'h-screen overflow-hidden' : 'min-h-screen'
          }`}
        >
          <Sidebar />

          <main
            className={`
            transition-all duration-300 ease-in-out
            ${isCalendar ? 'h-screen overflow-hidden' : 'min-h-screen'}
            ${mainOffset}
          `}
          >
            <div
              className={`w-full mx-auto transition-all duration-300 ease-in-out ${
                isCalendar
                  ? 'h-full flex flex-col min-h-0 p-3 lg:p-4 max-w-none'
                  : `p-6 lg:p-8 ${sidebarCollapsed ? 'max-w-400' : 'max-w-5xl'}`
              }`}
            >
              {children}
            </div>
          </main>

          <QuickCaptureModal />
          <BrunoShell />
        </div>

        {showLoader && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111113]">
            <PlanevoLoader
              mode={loaderMode}
              onAnimationFinished={handleLoaderFinished}
            />
          </div>
        )}
      </BrunoProvider>
    </ProIntegrationsProvider>
  );
}
