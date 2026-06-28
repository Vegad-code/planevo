'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/lib/store/ui-store';
import { Gear, SignOut, CaretDoubleLeft, CaretDoubleRight } from '@phosphor-icons/react';
import { PlanevoLogo } from '@/components/PlanevoLogo';
import {
  BrunoMark,
  MobileMenuButton,
  MobileOverlay,
  NAV_ITEMS,
  SidebarAvatar,
  useSidebarProfile,
} from '@/components/dashboard/sidebar/shared';
import { useBruno } from '@/components/bruno/BrunoProvider';
import { cn } from '@/lib/utils';

export default function GlassSidebar() {
  const pathname = usePathname();
  const { currentContext, openBruno } = useBruno();
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } = useUIStore();
  const { mounted, isPremium, userName, avatarUrl, planType, initials, handleLogout } =
    useSidebarProfile();

  const isSettings = pathname.startsWith('/dashboard/settings');

  if (!mounted) return null;

  return (
    <>
      <MobileMenuButton onOpen={() => setMobileMenuOpen(true)} />
      {mobileMenuOpen && <MobileOverlay onClose={() => setMobileMenuOpen(false)} />}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 flex h-full flex-col',
          'bg-[var(--color-sidebar-bg)] text-[var(--color-sidebar-text)]',
          'border-r border-[var(--glass-border)]',
          'transition-all duration-300 ease-in-out font-sans',
          'rounded-r-[2rem]',
          sidebarCollapsed ? 'w-[72px] px-2 py-5' : 'w-[248px] px-4 py-5',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
        )}
        style={{
          boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
        }}
      >
        <div
          className={cn(
            'flex items-center border-b border-[var(--glass-border)] pb-5 mb-5',
            sidebarCollapsed ? 'flex-col gap-4 py-2' : 'justify-between',
          )}
        >
          <div className="flex items-center gap-2.5">
            <PlanevoLogo size={32} gapColor="var(--color-accent-cream)" />
            {!sidebarCollapsed && (
              <span className="font-serif text-[22px] tracking-[-0.02em] leading-none text-[var(--color-accent-cream)]">
                <b className="font-normal">Plan</b>
                <i className="not-italic">evo</i>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden lg:flex p-1 text-[var(--color-sidebar-text)]/40 hover:text-[var(--color-sidebar-text)] transition-colors"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <CaretDoubleRight size={16} /> : <CaretDoubleLeft size={16} />}
          </button>
        </div>

        {!sidebarCollapsed && (
          <div className="font-mono text-[10px] tracking-[0.16em] text-[var(--color-sidebar-text)]/40 mb-2.5 pl-1.5 uppercase">
            Workspace
          </div>
        )}

        <nav className="flex flex-col gap-1 mb-6">
          {NAV_ITEMS.map((item) => {
            const isActive =
              !isSettings &&
              (pathname === item.href || pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] transition-all relative',
                  isActive
                    ? 'bg-[var(--color-accent-warm)]/20 text-[var(--color-accent-cream)] font-medium'
                    : 'text-[var(--color-sidebar-text)]/65 hover:bg-white/5 font-normal',
                  sidebarCollapsed && 'justify-center px-0',
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className={isActive ? 'text-[var(--color-accent-warm)]' : ''}>
                  {item.icon}
                </span>
                {!sidebarCollapsed && <span>{item.label}</span>}
                {!sidebarCollapsed && isActive && (
                  <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-warm)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {!sidebarCollapsed && (
          <div className="glass-panel rounded-[14px] p-3.5 mb-4">
            <div className="flex items-center gap-2.5 mb-3">
              <BrunoMark size={28} />
              <div>
                <div className="font-serif text-[18px] leading-none text-[var(--color-sidebar-text)]">
                  Bruno
                </div>
                <div className="text-[11px] text-[var(--color-sidebar-text)]/60 mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_0_3px_rgba(34,197,94,0.2)]" />
                  ready when you are
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                openBruno(
                  currentContext ?? {
                    source: 'sidebar',
                    page: pathname,
                    label: 'Current page',
                  },
                );
                setMobileMenuOpen(false);
              }}
              className="w-full bg-[var(--color-paper)] text-[var(--color-ink)] border-none py-2 px-3 rounded-lg text-[13px] font-medium cursor-pointer flex items-center justify-between font-sans hover:bg-[var(--color-cream-2)]"
            >
              Ask Bruno <span className="text-[var(--color-ink-soft)] font-sans">⌘L</span>
            </button>
          </div>
        )}

        <div
          className={cn(
            'mt-auto pt-4 border-t border-[var(--glass-border)]',
            sidebarCollapsed ? 'flex flex-col items-center gap-4 pb-2' : 'flex flex-col gap-2',
          )}
        >
          {!sidebarCollapsed ? (
            <Link
              href="/dashboard/settings"
              className={cn(
                'flex items-center gap-2.5 px-1.5 py-2 text-[13px] rounded-xl transition-colors mb-1',
                isSettings
                  ? 'text-[var(--color-accent-cream)] bg-[var(--color-accent-warm)]/15'
                  : 'text-[var(--color-sidebar-text)]/55 hover:text-[var(--color-sidebar-text)]',
              )}
            >
              <Gear size={14} /> Settings
            </Link>
          ) : (
            <Link
              href="/dashboard/settings"
              className={cn(
                'p-2 rounded-xl transition-colors',
                isSettings
                  ? 'text-[var(--color-accent-warm)]'
                  : 'text-[var(--color-sidebar-text)]/55 hover:text-[var(--color-sidebar-text)]',
              )}
            >
              <Gear size={20} />
            </Link>
          )}

          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2.5 px-1 py-1.5">
              <SidebarAvatar avatarUrl={avatarUrl} userName={userName} initials={initials} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-[var(--color-sidebar-text)] font-medium truncate">
                  {userName}
                </div>
                <div className="text-[11px] text-[var(--color-sidebar-text)]/40 font-mono tracking-[0.04em] uppercase truncate">
                  {isPremium ? planType.replace('_', ' ') : 'Free Plan'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-[var(--color-sidebar-text)]/40 hover:text-red-400 p-1.5 rounded-md hover:bg-white/5 transition-colors shrink-0"
                title="Log Out"
              >
                <SignOut size={16} />
              </button>
            </div>
          ) : (
            <>
              <SidebarAvatar avatarUrl={avatarUrl} userName={userName} initials={initials} collapsed />
              <button
                type="button"
                onClick={handleLogout}
                className="text-[var(--color-sidebar-text)]/55 hover:text-red-400"
              >
                <SignOut size={20} />
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
