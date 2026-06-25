'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Layout,
  CheckSquare,
  Calendar,
  Notebook,
  NotePencil,
} from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { normalizePlanType } from '@/lib/auth/plan-types';

export const NAV_ITEMS = [
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
  {
    label: 'Notes',
    href: '/dashboard/notes',
    icon: <NotePencil weight="bold" size={16} />,
  },
] as const;

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
  const [mounted, setMounted] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [userName, setUserName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [planType, setPlanType] = useState('free');
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('name, plan_type, avatar_url')
          .eq('id', user.id)
          .single();
        if (profile) {
          setUserName(profile.name || 'User');
          setAvatarUrl(
            profile.avatar_url ||
              user.user_metadata?.avatar_url ||
              user.user_metadata?.picture ||
              null
          );
          const normalizedPlan = normalizePlanType(profile.plan_type);
          setPlanType(normalizedPlan);
          setIsPremium(['premium', 'trialing', 'admin', 'student'].includes(normalizedPlan));
        }
      }
    }
    fetchUser();
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'P';

  return {
    mounted,
    isPremium,
    userName,
    avatarUrl,
    planType,
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
