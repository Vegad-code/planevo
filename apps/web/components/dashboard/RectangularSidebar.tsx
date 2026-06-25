'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/lib/store/ui-store';
import { useBruno } from '@/components/bruno/BrunoProvider';
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

export default function RectangularSidebar() {
  const pathname = usePathname();
  const { currentContext, openBruno } = useBruno();
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } = useUIStore();
  const { mounted, isPremium, userName, avatarUrl, planType, initials, handleLogout } =
    useSidebarProfile();

  if (!mounted) return null;

  return (
    <>
      <MobileMenuButton onOpen={() => setMobileMenuOpen(true)} />
      {mobileMenuOpen && <MobileOverlay onClose={() => setMobileMenuOpen(false)} />}

      <aside
        className={`
          fixed top-0 left-0 h-full z-50
          flex flex-col bg-[var(--color-sidebar-bg)] border-r border-[rgba(251,246,234,0.08)] text-[var(--color-sidebar-text)]
          transition-all duration-300 ease-in-out font-sans
          ${sidebarCollapsed ? 'w-[68px] px-2 py-5' : 'w-[240px] px-5 py-5'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div
          className={`flex items-center pb-5 border-b border-[rgba(251,246,234,0.08)] mb-5 ${
            sidebarCollapsed ? 'flex-col gap-4 py-5' : 'justify-between'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <PlanevoLogo size={32} gapColor="var(--color-ink)" />
            {!sidebarCollapsed && (
              <span className="font-serif text-[24px] tracking-[-0.02em] leading-none">
                <b className="font-normal">Plan</b>
                <i className="not-italic">evo</i>
              </span>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex text-[rgba(251,246,234,0.4)] hover:text-[var(--color-paper)] transition-colors p-1"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <CaretDoubleRight size={16} /> : <CaretDoubleLeft size={16} />}
          </button>
        </div>

        {!sidebarCollapsed && (
          <div className="font-mono text-[10px] tracking-[0.16em] text-[rgba(251,246,234,0.4)] mb-2.5 pl-1.5 uppercase">
            WORKSPACE
          </div>
        )}

        <nav className="flex flex-col gap-0.5 mb-7">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[14px] transition-colors relative
                  ${
                    isActive
                      ? 'bg-[rgba(208,135,65,0.12)] text-[var(--color-honey)] font-medium border-none'
                      : 'text-[rgba(251,246,234,0.65)] hover:bg-[var(--color-ink-2)] font-normal border border-transparent'
                  }
                  ${sidebarCollapsed ? 'justify-center px-0' : ''}
                `}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className={isActive ? 'text-[var(--color-honey)]' : 'text-[rgba(251,246,234,0.65)]'}>
                  {item.icon}
                </span>
                {!sidebarCollapsed && <span>{item.label}</span>}
                {!sidebarCollapsed && isActive && (
                  <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[var(--color-honey)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {!sidebarCollapsed && (
          <div className="bg-[rgba(251,246,234,0.05)] border border-[rgba(251,246,234,0.08)] rounded-[14px] p-3.5">
            <div className="flex items-center gap-2.5 mb-3">
              <BrunoMark size={28} />
              <div>
                <div className="font-serif text-[18px] leading-none text-[var(--color-sidebar-text)]">Bruno</div>
                <div className="text-[11px] text-[rgba(251,246,234,0.6)] mt-1 flex items-center gap-1.5">
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
                  }
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
          className={`mt-auto pt-4 border-t border-[rgba(251,246,234,0.08)] ${
            sidebarCollapsed ? 'flex flex-col items-center gap-4 pb-4' : 'flex flex-col gap-2'
          }`}
        >
          {!sidebarCollapsed ? (
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2.5 px-1.5 py-2 text-[13px] text-[rgba(251,246,234,0.55)] hover:text-[var(--color-paper)] mb-2"
            >
              <Gear size={14} /> Settings
            </Link>
          ) : (
            <Link href="/dashboard/settings" className="text-[rgba(251,246,234,0.55)] hover:text-white">
              <Gear size={20} />
            </Link>
          )}

          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2.5 px-1 py-1.5">
              <SidebarAvatar avatarUrl={avatarUrl} userName={userName} initials={initials} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-[var(--color-paper)] font-medium truncate">{userName}</div>
                <div className="text-[11px] text-[rgba(251,246,234,0.4)] font-mono tracking-[0.04em] uppercase truncate">
                  {isPremium ? planType.replace('_', ' ') : 'Free Plan'}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-[rgba(251,246,234,0.4)] hover:text-red-400 p-1.5 rounded-md hover:bg-[rgba(251,246,234,0.05)] transition-colors shrink-0"
                title="Log Out"
              >
                <SignOut size={16} />
              </button>
            </div>
          ) : (
            <SidebarAvatar avatarUrl={avatarUrl} userName={userName} initials={initials} collapsed />
          )}

          {sidebarCollapsed && (
            <button onClick={handleLogout} className="text-[rgba(251,246,234,0.55)] hover:text-red-400 mt-2">
              <SignOut size={20} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
