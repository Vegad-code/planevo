'use client';

import type { ComponentType } from 'react';
import {
  CalendarBlank,
  CheckSquare,
  GraduationCap,
  Info,
  X,
} from '@phosphor-icons/react';
import { BrunoMark } from '@/components/dashboard/home/BrunoMark';
import { GlassPanel } from '@/components/ui/glass-panel';
import { cn } from '@/lib/utils';
import type { AppNotification, NotificationKind } from '@/lib/notifications/inbox';

const KIND_ICON: Record<
  Exclude<NotificationKind, 'bruno_insight'>,
  ComponentType<{ size?: number; weight?: 'fill' | 'bold' | 'regular'; className?: string }>
> = {
  task: CheckSquare,
  event: CalendarBlank,
  assignment: GraduationCap,
  system: Info,
};

interface NotificationCardProps {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
  onDismiss: (id: string) => void;
}

export function NotificationCard({ notification, onOpen, onDismiss }: NotificationCardProps) {
  const Icon = notification.kind !== 'bruno_insight' ? KIND_ICON[notification.kind] : null;
  const isUnread = !notification.readAt;

  return (
    <GlassPanel
      variant="card"
      interactive
      className={cn(
        'relative p-4 flex gap-3 text-left w-full',
        isUnread && 'border-[var(--color-accent-warm)]/25',
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className="flex gap-3 flex-1 min-w-0 text-left"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-raised)] border border-[var(--glass-border)]">
          {notification.kind === 'bruno_insight' ? (
            <BrunoMark size={24} />
          ) : Icon ? (
            <Icon size={18} weight="fill" className="text-[var(--color-accent-warm)]" />
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-semibold text-[var(--color-ink)] truncate">
              {notification.title}
            </span>
            <span className="text-[10px] text-[var(--color-ink-faint)] shrink-0 font-mono uppercase tracking-wide">
              {notification.relativeTime}
            </span>
          </div>
          {notification.subtitle && (
            <p className="text-[11px] text-[var(--color-ink-faint)] mt-0.5 font-mono uppercase tracking-wider">
              {notification.subtitle}
            </p>
          )}
          <p className="text-sm text-[var(--color-ink-soft)] mt-1.5 leading-snug line-clamp-3">
            {notification.body}
          </p>
          {notification.kind === 'bruno_insight' && (
            <p className="text-[11px] text-[var(--color-accent-warm)] mt-2 font-medium">
              Prep your day →
            </p>
          )}
        </div>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notification.id);
        }}
        aria-label="Dismiss notification"
        className="absolute top-3 right-3 p-1 rounded-full text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] hover:bg-[var(--color-line)]/40 transition-colors"
      >
        <X size={14} />
      </button>
    </GlassPanel>
  );
}
