'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUIStore } from '@/lib/store/ui-store';
import { useState, useEffect } from 'react';
import { normalizePlanType } from '@/lib/auth/plan-types';

import { 
  Layout, 
  CheckSquare, 
  Calendar, 
  Gear, 
  SignOut,
  Notebook,
  CaretDoubleLeft,
  CaretDoubleRight
} from '@phosphor-icons/react';

const BrunoMark = ({ size = 28, mood = 'normal' }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} style={{ flex: 'none' }}>
    <circle cx="14" cy="14" r="7" fill="var(--color-bruno-deep)" />
    <circle cx="34" cy="14" r="7" fill="var(--color-bruno-deep)" />
    <circle cx="14" cy="14" r="3.2" fill="var(--color-belly)" />
    <circle cx="34" cy="14" r="3.2" fill="var(--color-belly)" />
    <circle cx="24" cy="26" r="16" fill="var(--color-bruno)" />
    <ellipse cx="24" cy="30" rx="9" ry="7" fill="var(--color-belly)" />
    <circle cx="19" cy="23" r="1.7" fill="var(--color-ink)" />
    <circle cx="29" cy="23" r="1.7" fill="var(--color-ink)" />
    <ellipse cx="24" cy="28" rx="1.8" ry="1.3" fill="var(--color-ink)" />
    {mood === 'happy' && (
      <path d="M 21 32 Q 24 34 27 32" stroke="var(--color-ink)" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    )}
  </svg>
);

import { PlanevoLogo } from '@/components/PlanevoLogo';


const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <Layout weight="bold" size={16} />,
  },
  {
    label: 'Daily Plan',
    href: '/dashboard/daily-plan',
    icon: <Notebook weight="bold" size={16} />,
  },
  {
    label: 'Tasks',
    href: '/dashboard/tasks',
    icon: <CheckSquare weight="bold" size={16} />,
  },
  {
    label: 'Calendar',
    href: '/dashboard/calendar',
    icon: <Calendar weight="bold" size={16} />,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } = useUIStore();
  const [mounted, setMounted] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [userName, setUserName] = useState('');
  const [planType, setPlanType] = useState('free');
  const supabase = createClient();

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase as any)
          .from('users')
          .select('name, plan_type')
          .eq('id', user.id)
          .single();
        if (profile) {
          setUserName(profile.name || 'User');
          const normalizedPlan = normalizePlanType(profile.plan_type);
          setPlanType(normalizedPlan);
          setIsPremium(['premium', 'trialing', 'admin', 'student'].includes(normalizedPlan));
        }
      }
    }
    fetchUser();
  }, [supabase]);

  if (!mounted) return null;

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'P';

  return (
    <>
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-xl bg-[var(--color-ink)] hover:bg-[var(--color-ink-2)] text-[var(--color-paper)] transition-colors border border-[rgba(251,246,234,0.1)]"
        aria-label="Open navigation menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-50
          flex flex-col bg-[var(--color-ink)] border-r border-[rgba(251,246,234,0.08)] text-[var(--color-paper)]
          transition-all duration-300 ease-in-out font-sans
          ${sidebarCollapsed ? 'w-[68px] px-2 py-5' : 'w-[240px] px-5 py-5'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Brand */}
        <div className={`flex items-center pb-5 border-b border-[rgba(251,246,234,0.08)] mb-5 ${sidebarCollapsed ? 'flex-col gap-4 py-5' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5">
            <PlanevoLogo size={32} gapColor="var(--color-ink)" />
            {!sidebarCollapsed && (
              <span className="font-serif text-[24px] tracking-[-0.02em] leading-none">
                <b className="font-normal">Plan</b><i className="not-italic">evo</i>
              </span>
            )}
          </div>
          <button 
            onClick={toggleSidebar}
            className="hidden lg:flex text-[rgba(251,246,234,0.4)] hover:text-[var(--color-paper)] transition-colors p-1"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <CaretDoubleRight size={16} /> : <CaretDoubleLeft size={16} />}
          </button>
        </div>

        {!sidebarCollapsed && (
          <div className="font-mono text-[10px] tracking-[0.16em] text-[rgba(251,246,234,0.4)] mb-2.5 pl-1.5 uppercase">
            WORKSPACE
          </div>
        )}

        {/* Nav Items */}
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
                  ${isActive 
                    ? 'bg-[rgba(208,135,65,0.12)] text-[var(--color-honey)] font-medium border-none' 
                    : 'text-[rgba(251,246,234,0.65)] hover:bg-[var(--color-ink-2)] font-normal border border-transparent'}
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

        {/* Bruno Ask Card */}
        {!sidebarCollapsed && (
          <div className="bg-[rgba(251,246,234,0.05)] border border-[rgba(251,246,234,0.08)] rounded-[14px] p-3.5">
            <div className="flex items-center gap-2.5 mb-3">
              <BrunoMark size={28} />
              <div>
                <div className="font-serif text-[18px] leading-none text-[var(--color-paper)]">Bruno</div>
                <div className="text-[11px] text-[rgba(251,246,234,0.6)] mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_0_3px_rgba(34,197,94,0.2)]" />
                  ready when you are
                </div>
              </div>
            </div>
            <Link 
              href="/dashboard/chat"
              className="w-full bg-[var(--color-paper)] text-[var(--color-ink)] border-none py-2 px-3 rounded-lg text-[13px] font-medium cursor-pointer flex items-center justify-between font-sans hover:bg-[var(--color-cream-2)]"
            >
              Ask Bruno <span className="text-[var(--color-ink-soft)] font-sans">⌘K</span>
            </Link>
          </div>
        )}

        {/* Footer */}
        <div className={`mt-auto pt-4 border-t border-[rgba(251,246,234,0.08)] ${sidebarCollapsed ? 'flex flex-col items-center gap-4 pb-4' : 'flex flex-col gap-2'}`}>
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
              <div className="w-8 h-8 shrink-0 rounded-lg bg-[var(--color-honey)] text-[var(--color-ink)] text-[12px] font-semibold flex items-center justify-center font-mono">
                {initials}
              </div>
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
            <div className="w-8 h-8 rounded-lg bg-[var(--color-honey)] text-[var(--color-ink)] text-[12px] font-semibold flex items-center justify-center font-mono cursor-pointer mb-2">
              {initials}
            </div>
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
