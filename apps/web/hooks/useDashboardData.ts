'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import {
  calculateMomentumStats,
  type DailyMetric,
  type MomentumStats,
} from '@/lib/stats';
import type { ScheduleBlock } from '@/lib/ai/agentic-scheduler';
import type { CalendarEvent } from '@/types/calendar';
import type { Task } from '@/types/tasks';
import { useOnBecameVisible } from '@/hooks/useDocumentVisible';
import { useTaskOptimisticEvents } from '@/hooks/useTaskOptimisticEvents';
import { queryKeys } from '@/lib/query/keys';
import {
  DASHBOARD_INSIGHT_CACHE_KEY,
  GOOGLE_AUTO_SYNC_LOCK_KEY,
  isDocumentVisible,
  readCachedJson,
  releaseTabLock,
  tryAcquireTabLock,
  writeCachedJson,
} from '@/lib/tab-coordination';
import { buildAgendaItems } from '@/lib/dashboard/agenda';
import {
  getDashboardMode,
  getPriorityAlerts,
  getSetupSteps,
} from '@/lib/dashboard/dashboard-mode';
import type {
  DashboardConnections,
  NextAction,
  ParsedScheduleBlock,
  TimeOfDay,
  WorkItem,
} from '@/lib/dashboard/types';
import type { CanvasAssignmentPreview } from '@/lib/dashboard/home-preview';

function getTimeOfDay(): TimeOfDay {
  const hours = new Date().getHours();
  if (hours < 12) return 'morning';
  if (hours < 17) return 'afternoon';
  return 'evening';
}

function mapCalendarBlocks(blocks: CalendarEvent[]): ScheduleBlock[] {
  return blocks.map((g) => ({
    id: g.id,
    title: g.title,
    time: format(new Date(g.start_time), 'HH:mm'),
    duration: g.end_time
      ? Math.round(
          (new Date(g.end_time).getTime() - new Date(g.start_time).getTime()) / 60000
        )
      : 30,
    type: g.energy_level === 'low' ? ('break' as const) : ('focus' as const),
    description: g.description || '',
    status: (g.status && g.status !== 'confirmed'
      ? g.status
      : (g.metadata as { status?: string } | undefined)?.status || g.status) as ScheduleBlock['status'],
    is_ai_suggested:
      g.is_ai_suggested ??
      (g.metadata as { is_ai_suggested?: boolean } | undefined)?.is_ai_suggested ??
      true,
    startTime: new Date(g.start_time),
    endTime: g.end_time
      ? new Date(g.end_time)
      : new Date(new Date(g.start_time).getTime() + 30 * 60000),
  }));
}

function parseSchedule(schedule: ScheduleBlock[] | null): ParsedScheduleBlock[] | null {
  if (!schedule) return null;
  return schedule
    .map((b) => {
      const start =
        b.startTime ||
        (b as ScheduleBlock & { suggested_start?: string }).suggested_start ||
        (b as ScheduleBlock & { start_time?: string }).start_time;
      const end =
        b.endTime ||
        (b as ScheduleBlock & { suggested_end?: string }).suggested_end ||
        (b as ScheduleBlock & { end_time?: string }).end_time;
      const startDate = start ? new Date(start) : null;
      const endDate = end ? new Date(end) : null;
      if (!startDate || isNaN(startDate.getTime())) return null;
      return {
        ...b,
        startTime: startDate,
        endTime: endDate || new Date(startDate.getTime() + (b.duration || 30) * 60000),
      };
    })
    .filter((b): b is ParsedScheduleBlock => b !== null);
}

export function useDashboardData() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const userIdRef = useRef<string | null>(null);

  const [userName, setUserName] = useState('');
  const [timeOfDay] = useState<TimeOfDay>(getTimeOfDay);
  const [tasks, setTasks] = useState<Task[]>([]);
  useTaskOptimisticEvents(setTasks);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [canvasAssignments, setCanvasAssignments] = useState<CanvasAssignmentPreview[]>([]);
  const [schedule, setSchedule] = useState<ScheduleBlock[] | null>(null);
  const [thisWeekEvents, setThisWeekEvents] = useState<CalendarEvent[]>([]);
  const [insight, setInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(true);
  const [connections, setConnections] = useState<DashboardConnections>({
    canvasConnected: false,
    canvasDueCount: 0,
    googleConnected: false,
    googleLastSyncedAt: null,
    googleSyncFrequency: 'hourly',
  });
  const [loading, setLoading] = useState(true);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [momentumStats, setMomentumStats] = useState<MomentumStats>({
    focusTimeMinutes: 0,
    tasksCrushed: 0,
    tasksPlanned: 0,
    upcomingDeadlines: 0,
    consistencyPercent: 0,
  });

  const fetchAll = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      const todayEnd = new Date(new Date().setHours(23, 59, 59, 999)).toISOString();
      const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgoStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const [
        { data: profile },
        { data: integrationAccounts },
        { data: taskRows },
        { data: blocks },
        { data: canvasAssignmentRows },
        { data: metricsRows },
        { data: thisWeekEventsData },
        { data: workItemRows },
      ] = await Promise.all([
        supabase
          .from('users')
          .select('name, google_calendar_last_synced_at, scheduling_preferences')
          .eq('id', user.id)
          .single(),
        supabase
          .from('integration_accounts_public' as 'integration_accounts')
          .select('provider, status, last_synced_at')
          .eq('user_id', user.id),
        supabase
          .from('tasks')
          .select('*')
          .is('deleted_at', null)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .neq('status', 'rejected')
          .gte('start_time', todayStart)
          .lte('start_time', todayEnd)
          .order('start_time', { ascending: true }),
        supabase
          .from('canvas_assignments')
          .select('id, name, course_name, due_at, html_url')
          .eq('user_id', user.id)
          .gte('due_at', new Date().toISOString())
          .lte('due_at', sevenDaysOut)
          .order('due_at', { ascending: true })
          .limit(8),
        supabase
          .from('daily_user_metrics')
          .select('date, focus_time_seconds, tasks_completed, tasks_planned')
          .eq('user_id', user.id)
          .gte('date', sevenDaysAgoStr)
          .order('date', { ascending: false }),
        supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .neq('status', 'rejected')
          .gte('start_time', new Date().toISOString())
          .lte('start_time', sevenDaysOut)
          .order('start_time', { ascending: true })
          .limit(10),
        supabase
          .from('source_items')
          .select('id, provider, title, description, due_date, url, completed')
          .eq('user_id', user.id)
          .in('provider', ['notion', 'slack', 'linear'])
          .is('deleted_at', null)
          .order('due_date', { ascending: true, nullsFirst: false })
          .limit(20),
      ]);

      if (profile?.name) setUserName(profile.name);

      const canvasAccount = integrationAccounts?.find(
        (a: { provider: string }) => a.provider === 'canvas'
      );
      const googleAccount = integrationAccounts?.find(
        (a: { provider: string }) => a.provider === 'google_calendar'
      );

      const schedulingPrefs = profile?.scheduling_preferences as
        | { google_sync_frequency?: string }
        | null
        | undefined;

      const typedCanvas = (canvasAssignmentRows || []) as CanvasAssignmentPreview[];

      setConnections({
        canvasConnected: canvasAccount?.status === 'connected',
        canvasDueCount: typedCanvas.length,
        googleConnected: googleAccount?.status === 'connected',
        googleLastSyncedAt:
          googleAccount?.last_synced_at || profile?.google_calendar_last_synced_at || null,
        googleSyncFrequency: schedulingPrefs?.google_sync_frequency || 'hourly',
      });

      const typedTasks = (taskRows || []) as Task[];
      userIdRef.current = user.id;
      setTasks(typedTasks);
      queryClient.setQueryData(queryKeys.tasks(user.id), typedTasks);
      setCanvasAssignments(typedCanvas);
      setThisWeekEvents((thisWeekEventsData || []) as CalendarEvent[]);
      setWorkItems(
        ((workItemRows || []) as unknown as WorkItem[]).filter((w) => !w.completed)
      );
      setDailyMetrics((metricsRows || []) as DailyMetric[]);

      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      const upcomingDeadlineCount = typedTasks.filter((t) => {
        if (t.completed || !t.due_date) return false;
        const due = new Date(t.due_date);
        return due >= new Date() && due <= threeDaysFromNow;
      }).length;

      const todayDateStr = new Date().toISOString().split('T')[0];
      const tasksPlannedTodayCount = typedTasks.filter((t) => {
        if (t.completed && t.completed_at) {
          return new Date(t.completed_at).toISOString().split('T')[0] === todayDateStr;
        }
        if (!t.completed && t.due_date) {
          return new Date(t.due_date).toISOString().split('T')[0] <= todayDateStr;
        }
        return false;
      }).length;

      setMomentumStats(
        calculateMomentumStats(
          (metricsRows || []) as DailyMetric[],
          upcomingDeadlineCount,
          tasksPlannedTodayCount
        )
      );

      if (blocks && blocks.length > 0) {
        setSchedule(mapCalendarBlocks(blocks as CalendarEvent[]));
      } else {
        setSchedule(null);
      }
    } catch (err) {
      console.error('[useDashboardData] Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, queryClient]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const fetchInsight = useCallback(async () => {
    const cached = readCachedJson<{ insight: string }>(DASHBOARD_INSIGHT_CACHE_KEY, 10 * 60_000);
    if (cached?.insight) {
      setInsight(cached.insight);
      setInsightLoading(false);
      return;
    }

    if (!isDocumentVisible()) return;

    setInsightLoading(true);
    try {
      const insightRes = await fetch('/api/ai/insight');
      if (insightRes.ok) {
        const data = (await insightRes.json()) as { insight?: string };
        if (data.insight) {
          setInsight(data.insight);
          writeCachedJson(DASHBOARD_INSIGHT_CACHE_KEY, { insight: data.insight });
        }
      }
    } catch (e) {
      console.error('Failed to fetch AI insight', e);
    } finally {
      setInsightLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchInsight();
  }, [fetchInsight]);

  useOnBecameVisible(() => {
    void fetchInsight();
  });

  const runGoogleAutoSync = useCallback(() => {
    if (!connections.googleConnected) return;
    if (connections.googleSyncFrequency === 'manual') return;

    let shouldSync = false;
    if (!connections.googleLastSyncedAt) {
      shouldSync = true;
    } else {
      const hoursSinceSync =
        (Date.now() - new Date(connections.googleLastSyncedAt).getTime()) / (1000 * 60 * 60);
      if (connections.googleSyncFrequency === 'hourly' && hoursSinceSync >= 1) shouldSync = true;
      if (connections.googleSyncFrequency === 'daily' && hoursSinceSync >= 24) shouldSync = true;
      if (connections.googleSyncFrequency === 'weekly' && hoursSinceSync >= 24 * 7)
        shouldSync = true;
    }

    if (!shouldSync) return;
    if (!isDocumentVisible()) return;
    if (!tryAcquireTabLock(GOOGLE_AUTO_SYNC_LOCK_KEY, 5 * 60_000)) return;

    let isMounted = true;
    fetch('/api/integrations/google/sync', { method: 'POST' })
      .then((res) => res.json())
      .then(async (data: { success?: boolean; count?: number }) => {
        if (!isMounted) return;
        if (data.success && (data.count ?? 0) > 0) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.user) return;

          const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
          const todayEnd = new Date(new Date().setHours(23, 59, 59, 999)).toISOString();

          const [blocksRes, eventsRes] = await Promise.all([
            supabase
              .from('calendar_events')
              .select('*')
              .eq('user_id', session.user.id)
              .eq('is_deleted', false)
              .neq('status', 'rejected')
              .gte('start_time', todayStart)
              .lte('start_time', todayEnd)
              .order('start_time', { ascending: true }),
            supabase
              .from('calendar_events')
              .select('*')
              .eq('user_id', session.user.id)
              .eq('is_deleted', false)
              .neq('status', 'rejected')
              .gte('start_time', new Date().toISOString())
              .lte('start_time', sevenDaysOut)
              .order('start_time', { ascending: true })
              .limit(10),
          ]);

          if (!isMounted) return;

          if (blocksRes.data?.length) {
            setSchedule(mapCalendarBlocks(blocksRes.data as CalendarEvent[]));
          }
          if (eventsRes.data) {
            setThisWeekEvents(eventsRes.data as CalendarEvent[]);
          }
        }
      })
      .catch((err) => console.error('Background sync failed', err))
      .finally(() => {
        releaseTabLock(GOOGLE_AUTO_SYNC_LOCK_KEY);
      });

    return () => {
      isMounted = false;
    };
  }, [connections, supabase]);

  useEffect(() => {
    const cleanup = runGoogleAutoSync();
    return cleanup;
  }, [runGoogleAutoSync]);

  useOnBecameVisible(() => {
    runGoogleAutoSync();
  });

  const parsedSchedule = useMemo(() => parseSchedule(schedule), [schedule]);

  const nextAction = useMemo((): NextAction | null => {
    if (!parsedSchedule?.length) return null;
    const now = new Date();
    const current = parsedSchedule.find((b) => now >= b.startTime && now < b.endTime);
    if (current) return { ...current, timingStatus: 'NOW' };
    const next = parsedSchedule.find((b) => b.startTime > now);
    if (next) return { ...next, timingStatus: 'UP NEXT' };
    return { ...parsedSchedule[0], timingStatus: 'UP NEXT' };
  }, [parsedSchedule]);

  const upNextBlocks = useMemo(() => {
    if (!parsedSchedule) return [];
    const now = new Date();
    return parsedSchedule.filter((b) => b.startTime > now).slice(0, 3);
  }, [parsedSchedule]);

  const openTasks = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);

  const unscheduledTasks = useMemo(() => openTasks.slice(0, 3), [openTasks]);

  const upcomingAgenda = useMemo(
    () => buildAgendaItems(thisWeekEvents, tasks, workItems, 8),
    [thisWeekEvents, tasks, workItems]
  );

  const mode = useMemo(
    () =>
      getDashboardMode({
        hasTodayBlocks: (parsedSchedule?.length ?? 0) > 0,
        openTaskCount: openTasks.length,
        canvasDueCount: connections.canvasDueCount,
        weekAgendaCount: upcomingAgenda.length,
        connections,
      }),
    [parsedSchedule, openTasks.length, connections, upcomingAgenda.length]
  );

  const priorityAlerts = useMemo(
    () => getPriorityAlerts(tasks, connections),
    [tasks, connections]
  );

  const setupSteps = useMemo(
    () => getSetupSteps(connections, tasks.length > 0),
    [connections, tasks.length]
  );

  return {
    userName,
    timeOfDay,
    tasks,
    workItems,
    canvasAssignments,
    schedule,
    thisWeekEvents,
    insight,
    insightLoading,
    connections,
    momentumStats,
    dailyMetrics,
    loading,
    parsedSchedule,
    nextAction,
    upNextBlocks,
    upcomingAgenda,
    openTasks,
    unscheduledTasks,
    mode,
    priorityAlerts,
    setupSteps,
    setThisWeekEvents,
    setTasks,
    refresh: fetchAll,
  };
}
