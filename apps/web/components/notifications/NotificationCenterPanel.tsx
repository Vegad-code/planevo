'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BrunoMark } from '@/components/dashboard/home/BrunoMark';
import { NotificationCard } from '@/components/notifications/NotificationCard';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { cn } from '@/lib/utils';

export function NotificationCenterPanel() {
  const {
    isOpen,
    close,
    isLoading,
    groups,
    notifications,
    syncError,
    markAllRead,
    openNotification,
    dismiss,
  } = useNotifications();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, close]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="Close notifications"
        className="absolute inset-0 bg-black/50 backdrop-blur-xl"
        onClick={close}
      />
      <div
        ref={panelRef}
        className={cn(
          'absolute inset-x-0 top-0 mx-auto w-full max-w-lg',
          'animate-in slide-in-from-top duration-300',
        )}
      >
        <div className="glass-card rounded-b-3xl border-t-0 shadow-2xl max-h-[75vh] flex flex-col overflow-hidden m-0">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--glass-border)]">
            <h2 className="font-serif text-xl text-[var(--color-ink)]">Notifications</h2>
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-xs font-mono uppercase tracking-wider text-[var(--color-accent-warm)] hover:opacity-80 transition-opacity"
            >
              Mark all read
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
            {isLoading && notifications.length === 0 ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 rounded-2xl bg-[var(--color-line)]/30 animate-pulse"
                  />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                <BrunoMark size={48} mood="happy" />
                {syncError ? (
                  <>
                    <p className="font-serif text-lg text-[var(--color-ink)]">
                      Notifications aren&apos;t ready yet
                    </p>
                    <p className="text-sm text-[var(--color-ink-faint)] max-w-xs">
                      {syncError}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-serif text-lg text-[var(--color-ink)]">
                      You&apos;re all caught up
                    </p>
                    <p className="text-sm text-[var(--color-ink-faint)]">
                      Bruno will let you know when something needs attention.
                    </p>
                  </>
                )}
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.label}>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-faint)] mb-2 px-1">
                    {group.label}
                  </p>
                  <div className="flex flex-col gap-2">
                    {group.notifications.map((n) => (
                      <NotificationCard
                        key={n.id}
                        notification={n}
                        onOpen={openNotification}
                        onDismiss={(id) => void dismiss(id)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
