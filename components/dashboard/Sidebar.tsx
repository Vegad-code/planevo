'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUIStore } from '@/lib/store/ui-store';
import { useState, useEffect } from 'react';

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: 'Briefing',
    href: '/dashboard/briefing',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 18a5 5 0 0 0-10 0" />
        <line x1="12" y1="9" x2="12" y2="2" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  {
    label: 'Tasks',
    href: '/dashboard/tasks',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    label: 'Goals',
    href: '/dashboard/goals',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    label: 'Schedule',
    href: '/dashboard/schedule',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: 'Habits',
    href: '/dashboard/habits',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    label: 'Focus',
    href: '/dashboard/focus',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

const BOTTOM_NAV_ITEMS = [
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, setSidebarCollapsed, mobileMenuOpen, setMobileMenuOpen } = useUIStore();
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        id="sidebar-mobile-toggle"
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-xl glass hover:bg-surface-600 transition-colors"
        aria-label="Open navigation menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50
          flex flex-col
          bg-card border-r-2 border-border
          transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'w-[68px]' : 'w-[240px]'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
        id="sidebar"
      >
        {/* Header */}
        <div className={`flex items-center h-16 px-4 border-b-2 border-border ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!sidebarCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-2 group" id="sidebar-logo">
              <span className="text-xl transition-transform group-hover:scale-110">🦉</span>
              <span className="font-black uppercase tracking-tighter text-foreground group-hover:text-brand-600 transition-colors">
                Plan Pilot
              </span>
            </Link>
          )}
          {sidebarCollapsed && (
            <span className="text-xl">🦉</span>
          )}

          {/* Collapse toggle — desktop only */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-surface-200 transition-colors text-surface-400 hover:text-surface-900"
            id="sidebar-collapse-toggle"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {sidebarCollapsed ? (
                <polyline points="9 18 15 12 9 6" />
              ) : (
                <polyline points="15 18 9 12 15 6" />
              )}
            </svg>
          </button>

          {/* Mobile close */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-surface-200 transition-colors text-surface-400 hover:text-surface-900"
            id="sidebar-mobile-close"
            aria-label="Close navigation menu"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Main nav */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                id={`sidebar-nav-${item.label.toLowerCase()}`}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl
                  transition-all duration-200 group border-2 border-transparent
                  ${isActive
                    ? 'bg-brand-600 text-white border-brand-700 shadow-md scale-[1.02]'
                    : 'text-muted hover:text-foreground hover:bg-muted/10'
                  }
                  ${sidebarCollapsed ? 'justify-center' : ''}
                `}
              >
                <span className={`shrink-0 ${isActive ? 'text-white' : 'text-muted group-hover:text-foreground'}`}>
                  {item.icon}
                </span>
                {!sidebarCollapsed && (
                  <span className="text-xs font-black uppercase">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom nav */}
        <div className="border-t-2 border-border py-4 px-2 space-y-1">
          {BOTTOM_NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                id={`sidebar-nav-${item.label.toLowerCase()}`}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl
                  transition-all duration-200 group border-2 border-transparent
                  ${isActive
                    ? 'bg-brand-600 text-white border-brand-700 shadow-md scale-[1.02]'
                    : 'text-muted hover:text-foreground hover:bg-muted/10'
                  }
                  ${sidebarCollapsed ? 'justify-center' : ''}
                `}
              >
                <span className={`shrink-0 ${isActive ? 'text-white' : 'text-muted group-hover:text-foreground'}`}>
                  {item.icon}
                </span>
                {!sidebarCollapsed && (
                  <span className="text-xs font-black uppercase">{item.label}</span>
                )}
              </Link>
            );
          })}

          {/* Pro Feature Teaser */}
          {!sidebarCollapsed && (
            <div className="mx-2 mb-4 p-4 border-2 border-brand-200 bg-brand-50 shadow-md rounded-2xl transition-all hover:shadow-lg hover:-translate-y-0.5">
              <h3 className="text-xs font-black uppercase tracking-tight text-brand-900 mb-1 flex items-center gap-1.5">
                <span className="text-base">✨</span> Pro Feature
              </h3>
              <p className="text-[10px] font-bold text-brand-700 uppercase leading-tight mb-3">
                Unlock AI priority, project insights, and custom themes.
              </p>
              <Link 
                href="/pricing" 
                className="block text-center py-2 text-[10px] font-black uppercase bg-brand-600 text-white rounded-full shadow-sm hover:bg-brand-500 transition-colors"
              >
                View Plans
              </Link>
            </div>
          )}
          {sidebarCollapsed && (
            <Link 
              href="/pricing"
              className="flex justify-center mb-4 py-2 text-brand-600 hover:text-brand-500 transition-colors"
              title="Upgrade to Pro"
            >
              <span className="text-xl">✨</span>
            </Link>
          )}

          {/* Logout button */}
          <button
            onClick={handleLogout}
            id="sidebar-logout-button"
            className={`
              flex items-center gap-3 px-3 py-2.5 w-full
              text-muted hover:text-error hover:bg-error/10
              transition-all duration-200 group border-2 border-transparent
              ${sidebarCollapsed ? 'justify-center' : ''}
            `}
          >
            <span className="shrink-0 text-muted group-hover:text-error">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            {!sidebarCollapsed && (
              <span className="text-xs font-black uppercase">Log out</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
