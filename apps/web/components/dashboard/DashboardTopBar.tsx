'use client';

import { usePathname } from 'next/navigation';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { SidebarAvatar, useSidebarProfile } from '@/components/dashboard/sidebar/shared';
import { GlassPanel } from '@/components/ui/glass-panel';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { cn } from '@/lib/utils';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/daily-plan': 'Daily Plan',
  '/dashboard/tasks': 'Tasks',
  '/dashboard/calendar': 'Calendar',
  '/dashboard/notes': 'Notes',
  '/dashboard/settings': 'Settings',
};

function resolvePageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/dashboard/settings/')) {
    const segment = pathname.split('/').pop() ?? 'settings';
    return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
  }
  if (pathname.startsWith('/dashboard/notes/')) return 'Notes';
  return 'Dashboard';
}

interface DashboardTopBarProps {
  className?: string;
  hideSearch?: boolean;
}

export function DashboardTopBar({ className, hideSearch }: DashboardTopBarProps) {
  const pathname = usePathname();
  const { mounted, userName, avatarUrl, initials } = useSidebarProfile();
  const title = resolvePageTitle(pathname);

  if (!mounted) return null;

  return (
    <header className={cn('flex items-center justify-between gap-4 mb-6', className)}>
      <h1 className="font-serif text-2xl lg:text-3xl text-[var(--color-ink)] tracking-tight shrink-0">
        {title}
      </h1>

      <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
        {!hideSearch && (
          <GlassPanel variant="flat" className="hidden md:flex items-center gap-2 px-3 py-1.5 max-w-xs w-full">
            <MagnifyingGlass size={16} className="text-[var(--color-ink-faint)] shrink-0" />
            <Input
              type="search"
              placeholder="Search…"
              className="h-8 border-0 bg-transparent shadow-none focus-visible:ring-0 px-0"
            />
          </GlassPanel>
        )}

        <NotificationBell />

        <GlassPanel variant="flat" className="flex items-center gap-2.5 pl-1.5 pr-3 py-1">
          <SidebarAvatar avatarUrl={avatarUrl} userName={userName} initials={initials} />
          <div className="hidden sm:block min-w-0">
            <div className="text-sm font-medium text-[var(--color-ink)] truncate max-w-[120px]">
              {userName}
            </div>
            <div className="text-[10px] text-[var(--color-ink-faint)] uppercase tracking-wider">
              Planner
            </div>
          </div>
        </GlassPanel>
      </div>
    </header>
  );
}
