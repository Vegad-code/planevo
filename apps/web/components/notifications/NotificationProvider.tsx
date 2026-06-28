'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { useBruno } from '@/components/bruno/BrunoProvider';
import { NotificationCenterPanel } from '@/components/notifications/NotificationCenterPanel';
import type {
  AppNotification,
  NotificationGroup,
} from '@/lib/notifications/inbox';

interface InboxResponse {
  notifications: AppNotification[];
  unreadCount: number;
  groups: NotificationGroup[];
  syncOk?: boolean;
  syncError?: string | null;
}

interface NotificationContextValue {
  unreadCount: number;
  notifications: AppNotification[];
  groups: NotificationGroup[];
  isOpen: boolean;
  isLoading: boolean;
  open: () => void;
  close: () => void;
  refresh: (sync?: boolean) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  syncError: string | null;
  openNotification: (notification: AppNotification) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { openBruno } = useBruno();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [groups, setGroups] = useState<NotificationGroup[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async (sync = false) => {
    setIsLoading(true);
    try {
      const url = sync ? '/api/notifications/inbox' : '/api/notifications/inbox?sync=false';
      const res = await fetch(url);
      if (!res.ok) {
        setSyncError('Could not load notifications.');
        return;
      }
      const data = (await res.json()) as InboxResponse;
      setNotifications(data.notifications);
      setGroups(data.groups);
      setUnreadCount(data.unreadCount);
      setSyncError(data.syncError ?? (data.syncOk === false ? 'Notifications are still setting up.' : null));
    } catch (e) {
      console.error('[NotificationProvider] refresh failed', e);
      setSyncError('Could not load notifications.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markRead = useCallback(
    async (id: string) => {
      const previous = notifications;
      const previousUnread = unreadCount;

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
        ),
      );
      setUnreadCount((c) => Math.max(0, c - (previous.find((n) => n.id === id && !n.readAt) ? 1 : 0)));

      try {
        const res = await fetch(`/api/notifications/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ read: true }),
        });
        if (!res.ok) {
          throw new Error('Failed to mark read');
        }
      } catch (e) {
        console.error('[NotificationProvider] markRead failed', e);
        setNotifications(previous);
        setUnreadCount(previousUnread);
      }
    },
    [notifications, unreadCount],
  );

  const markAllRead = useCallback(async () => {
    const previous = notifications;
    const previousUnread = unreadCount;
    const now = new Date().toISOString();

    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })));
    setUnreadCount(0);

    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' });
      if (!res.ok) {
        throw new Error('Failed to mark all read');
      }
    } catch (e) {
      console.error('[NotificationProvider] markAllRead failed', e);
      setNotifications(previous);
      setUnreadCount(previousUnread);
    }
  }, [notifications, unreadCount]);

  const dismiss = useCallback(async (id: string) => {
    const previousNotifications = notifications;
    const previousGroups = groups;
    const previousUnread = unreadCount;
    const wasUnread = notifications.find((n) => n.id === id && !n.readAt);

    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setGroups((prev) =>
      prev
        .map((g) => ({
          ...g,
          notifications: g.notifications.filter((n) => n.id !== id),
        }))
        .filter((g) => g.notifications.length > 0),
    );
    setUnreadCount((c) => (wasUnread ? Math.max(0, c - 1) : c));

    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismiss: true }),
      });
      if (!res.ok) {
        throw new Error('Failed to dismiss');
      }
    } catch (e) {
      console.error('[NotificationProvider] dismiss failed', e);
      setNotifications(previousNotifications);
      setGroups(previousGroups);
      setUnreadCount(previousUnread);
    }
  }, [notifications, groups, unreadCount]);

  const openNotification = useCallback(
    (notification: AppNotification) => {
      void markRead(notification.id);
      setIsOpen(false);

      if (notification.kind === 'bruno_insight') {
        openBruno({ source: 'dashboard', page: '/dashboard', label: 'Dashboard' });
        return;
      }

      if (notification.href) {
        if (notification.href.startsWith('http')) {
          window.open(notification.href, '_blank', 'noopener,noreferrer');
        } else {
          router.push(notification.href);
        }
      }
    },
    [markRead, openBruno, router],
  );

  const open = useCallback(() => {
    setIsOpen(true);
    void refresh(true);
  }, [refresh]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  useEffect(() => {
    if (!isOpen) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(() => {
      void refresh(true);
    }, 60_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isOpen, refresh]);

  const value = useMemo(
    (): NotificationContextValue => ({
      unreadCount,
      notifications,
      groups,
      isOpen,
      isLoading,
      open,
      close,
      refresh,
      markRead,
      markAllRead,
      dismiss,
      syncError,
      openNotification,
    }),
    [
      unreadCount,
      notifications,
      groups,
      isOpen,
      isLoading,
      syncError,
      open,
      close,
      refresh,
      markRead,
      markAllRead,
      dismiss,
      openNotification,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationCenterPanel />
    </NotificationContext.Provider>
  );
}
