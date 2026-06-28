'use client';

import { Bell } from '@phosphor-icons/react';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { unreadCount, isOpen, open } = useNotifications();

  return (
    <button
      type="button"
      onClick={open}
      aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      aria-expanded={isOpen}
      className={cn(
        'relative flex h-10 w-10 items-center justify-center rounded-xl glass-panel',
        'text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors',
        className,
      )}
    >
      <Bell size={18} weight={unreadCount > 0 ? 'fill' : 'regular'} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--color-accent-warm)] px-1 text-[10px] font-bold text-[var(--color-accent-cream)]">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
