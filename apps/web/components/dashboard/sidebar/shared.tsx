'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Layout,
  CheckSquare,
  Calendar,
  Notebook,
  NotePencil,
  Command as CommandIcon,
} from '@phosphor-icons/react';
import { useUserProfileOptional } from '@/components/providers/UserProfileProvider';
import { normalizePlanType } from '@/lib/auth/plan-types';
import { FEATURES } from '@/lib/featureFlags';

export type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

// Planevo Command replaces the Daily Plan nav entry when the flag is on
// (comprehensive.md §8). The Daily Plan route itself stays mounted for rollback.
const PLAN_NAV_ITEM: NavItem = FEATURES.PLANEVO_COMMAND
  ? {
      label: 'Command',
      href: '/dashboard/command',
      icon: <CommandIcon weight="bold" size={16} />,
    }
  : {
      label: 'Daily Plan',
      href: '/dashboard/daily-plan',
      icon: <Notebook weight="bold" size={16} />,
    };

export const NAV_ITEMS: readonly NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <Layout weight="bold" size={16} />,
  },
  PLAN_NAV_ITEM,
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
  {
    label: 'Notes',
    href: '/dashboard/notes',
    icon: <NotePencil weight="bold" size={16} />,
  },
];

export function BrunoMark({ size = 28, mood = 'normal' }: { size?: number; mood?: 'normal' | 'happy' }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ flex: 'none' }}>
      <circle cx="14" cy="14" r="7" fill="var(--color-bruno-deep)" />
      <circle cx="34" cy="14" r="7" fill="var(--color-bruno-deep)" />
      <circle cx="14" cy="14" r="3.2" fill="var(--color-belly)" />
      <circle cx="34" cy="14" r="3.2" fill="var(--color-belly)" />
      <circle cx="24" cy="26" r="16" fill="var(--color-bruno)" />
      <ellipse cx="24" cy="30" rx="9" ry="7" fill="var(--color-belly)" />
      <circle cx="19" cy="23" r="1.7" fill="var(--color-bruno-ink)" />
      <circle cx="29" cy="23" r="1.7" fill="var(--color-bruno-ink)" />
      <ellipse cx="24" cy="28" rx="1.8" ry="1.3" fill="var(--color-bruno-ink)" />
      {mood === 'happy' && (
        <path
          d="M 21 32 Q 24 34 27 32"
          stroke="var(--color-bruno-ink)"
          strokeWidth="1.3"
          fill="none"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export function MobileMenuButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-xl bg-[var(--color-ink)] hover:bg-[var(--color-ink-2)] text-[var(--color-paper)] transition-colors border border-[rgba(251,246,234,0.1)]"
      aria-label="Open navigation menu"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  );
}

export function MobileOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-40 lg:hidden"
      onClick={onClose}
    />
  );
}

export interface SidebarProfile {
  mounted: boolean;
  isPremium: boolean;
  userName: string;
  avatarUrl: string | null;
  planType: string;
  initials: string;
  handleLogout: () => Promise<void>;
}

export function useSidebarProfile(): SidebarProfile {
  const cached = useUserProfileOptional();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const normalizedPlan = normalizePlanType(cached?.planType ?? 'free');
  const isPremium =
    cached?.isPremium ??
    ['premium', 'trialing', 'admin', 'student'].includes(normalizedPlan);

  const initials = (cached?.userName ?? '')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'P';

  const handleLogout = useMemo(
    () => cached?.handleLogout ?? (async () => {}),
    [cached]
  );

  return {
    mounted,
    isPremium,
    userName: cached?.userName ?? '',
    avatarUrl: cached?.avatarUrl ?? null,
    planType: normalizedPlan,
    initials,
    handleLogout,
  };
}

export function SidebarAvatar({
  avatarUrl,
  userName,
  initials,
  collapsed,
  className = '',
}: {
  avatarUrl: string | null;
  userName: string;
  initials: string;
  collapsed?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`shrink-0 bg-[var(--color-honey)] text-[var(--color-ink)] font-semibold flex items-center justify-center font-mono overflow-hidden ${
        collapsed ? 'w-8 h-8 rounded-lg text-[12px]' : 'w-8 h-8 rounded-lg text-[12px]'
      } ${className}`}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        initials
      )}
    </div>
  );
}
