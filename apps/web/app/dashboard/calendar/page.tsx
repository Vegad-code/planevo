'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useCalendarPreferences } from '@/hooks/useCalendarPreferences';
import CalendarShell, { type CalendarShellHandle } from '@/components/calendar/CalendarShell';
import TaskBacklog from '@/components/dashboard/TaskBacklog';
import CalendarComposer from '@/components/calendar/dialogs/CalendarComposer';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { CalendarEvent, ComposerState, CalendarComposerDraft, ComposerAnchor, CalendarView } from '@/types/calendar';
import type { Task } from '@/types/tasks';
import { format, startOfWeek, addDays, addMinutes, setHours, setMinutes, startOfDay } from 'date-fns';
import { useRegisterBrunoContext, useBruno } from '@/components/bruno/BrunoProvider';
import { useProIntegrations } from '@/hooks/useProIntegrations';
import CalendarShortcutHelp from '@/components/calendar/CalendarShortcutHelp';
import { useCalendarKeyboardShortcuts } from '@/hooks/useCalendarKeyboardShortcuts';
import { resolveTaskIdForSchedule } from '@/lib/calendar/scheduleTask';
import { findNextFreeSlot } from '@/lib/calendar/findNextFreeSlot';
import { WEEK_STARTS_ON } from '@/components/calendar/CalendarToolbar';
import { ensureUserProfile } from '@/lib/supabase/ensure-profile';

export default function CalendarPage() {
  const {
    events,
    completeEvent,
    createEvent,
    rescheduleEvent,
    resizeEvent,
    updateEvent,
    deleteEvent,
    loadEvents,
    clearAll,
  } = useCalendarEvents();
  const { preferences, loading: prefsLoading } = useCalendarPreferences();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeView, setActiveView] = useState<CalendarView>('week');
  const [viewInitialized, setViewInitialized] = useState(false);
  const [composer, setComposer] = useState<ComposerState>({ mode: 'closed' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLastSyncedAt, setGoogleLastSyncedAt] = useState<string | null>(null);
  const [backlogCount, setBacklogCount] = useState<number>(0);
  const [workItems, setWorkItems] = useState<
    Array<{
      id: string;
      provider: string;
      title: string;
      description: string | null;
      due_date: string;
      url: string | null;
      completed: boolean;
    }>
  >([]);
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [backlogOpen, setBacklogOpen] = useState(true);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [backlogRefreshKey, setBacklogRefreshKey] = useState(0);

  const shellRef = useRef<CalendarShellHandle>(null);
  const supabase = createClient();
  const { openBruno } = useBruno();
  const { connectedProviders } = useProIntegrations();

  const loading = prefsLoading;

  useEffect(() => {
    if (!prefsLoading && !viewInitialized) {
      setActiveView(preferences.default_view);
      setViewInitialized(true);
    }
  }, [prefsLoading, preferences.default_view, viewInitialized]);

  useEffect(() => {
    if (!loading && (activeView === 'day' || activeView === 'week')) {
      shellRef.current?.scrollToNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scroll once after initial load
  }, [loading]);

  const contextLabel = useMemo(() => {
    if (activeView === 'week') {
      return `Calendar - Week of ${format(
        startOfWeek(selectedDate, { weekStartsOn: WEEK_STARTS_ON }),
        'MMM d'
      )}`;
    }
    if (activeView === 'month') {
      return `Calendar - ${format(selectedDate, 'MMMM yyyy')}`;
    }
    if (activeView === 'year') {
      return `Calendar - ${format(selectedDate, 'yyyy')}`;
    }
    return `Calendar - ${format(selectedDate, 'MMM d')}`;
  }, [activeView, selectedDate]);

  const brunoPayload = useMemo(
    () => ({
      activeView,
      selectedDate: selectedDate.toISOString(),
    }),
    [activeView, selectedDate]
  );

  useRegisterBrunoContext({
    source: 'calendar',
    page: '/dashboard/calendar',
    label: contextLabel,
    payload: brunoPayload,
  });

  useEffect(() => {
    async function checkGoogleConnection() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: accounts } = await supabase
        .from('integration_accounts_public' as 'integration_accounts')
        .select('provider, status, last_synced_at')
        .eq('user_id', user.id);

      const googleAccount = accounts?.find((a) => a.provider === 'google_calendar');
      if (googleAccount?.status === 'connected') {
        setGoogleConnected(true);
        setGoogleLastSyncedAt(googleAccount.last_synced_at || null);
      }

      const { data: profile } = await supabase
        .from('users')
        .select('google_calendar_last_synced_at')
        .eq('id', user.id)
        .single();

      if (profile?.google_calendar_last_synced_at) {
        setGoogleLastSyncedAt(profile.google_calendar_last_synced_at);
      }
    }
    checkGoogleConnection();
  }, [supabase]);

  useEffect(() => {
    async function loadBacklogCount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', user.id)
        .eq('completed', false)
        .is('deleted_at', null);

      if (data) {
        const scheduledIds = events.map((e) => e.linked_task_id).filter(Boolean) as string[];
        const unscheduledTasks = data.filter((t) => !scheduledIds.includes(t.id));
        setBacklogCount(unscheduledTasks.length);
      }
    }
    loadBacklogCount();
  }, [supabase, events, backlogRefreshKey]);

  useEffect(() => {
    if (backlogCount > 0 && window.innerWidth >= 1024) {
      setBacklogOpen(true);
    }
  }, [backlogCount]);

  useEffect(() => {
    async function loadWorkItems() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('source_items')
        .select('id, provider, title, description, due_date, url, completed')
        .eq('user_id', user.id)
        .in('provider', ['notion', 'linear', 'slack'])
        .not('due_date', 'is', null)
        .is('deleted_at', null)
        .limit(200);
      if (data) setWorkItems(data.filter((w: { completed?: boolean }) => !w.completed));
    }
    loadWorkItems();
  }, [supabase]);

  const overlayEvents = useMemo<CalendarEvent[]>(() => {
    return workItems
      .filter((w) => !hiddenLayers.has(w.provider))
      .map((w) => {
        const start = new Date(w.due_date);
        const end = new Date(start.getTime() + 30 * 60 * 1000);
        return {
          id: `work_${w.id}`,
          user_id: '',
          title: w.title || 'Untitled',
          description: w.description || '',
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          is_all_day: false,
          source: w.provider as CalendarEvent['source'],
          external_id: w.url || undefined,
          is_completed: false,
          is_deleted: false,
          created_at: start.toISOString(),
          updated_at: start.toISOString(),
          metadata: { readOnly: true, url: w.url || null },
        } as CalendarEvent;
      });
  }, [workItems, hiddenLayers]);

  const mergedEvents = useMemo(
    () => [...events, ...overlayEvents],
    [events, overlayEvents]
  );

  const toggleLayer = (provider: string) => {
    setHiddenLayers((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) next.delete(provider);
      else next.add(provider);
      return next;
    });
  };

  const getDefaultCreateDraft = useCallback((): CalendarComposerDraft => {
    const slot = findNextFreeSlot({
      date: selectedDate,
      events: mergedEvents,
      durationMinutes: 60,
      dayStartHour: preferences.day_start_hour,
      dayEndHour: preferences.day_end_hour,
    });
    const start =
      slot ?? setMinutes(setHours(startOfDay(selectedDate), 9), 0);
    const end = addMinutes(start, 60);
    return {
      title: '',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    };
  }, [selectedDate, mergedEvents, preferences.day_start_hour, preferences.day_end_hour]);

  const openComposerCreate = useCallback(
    (draft: CalendarComposerDraft, anchor?: ComposerAnchor) => {
      setComposer({ mode: 'create', draft, anchor });
    },
    []
  );

  const handleCreateEvent = useCallback(
    (time?: Date, anchor?: ComposerAnchor) => {
      const useAnchor =
        anchor && (activeView === 'day' || activeView === 'week');
      if (time) {
        openComposerCreate(
          {
            title: '',
            start_time: time.toISOString(),
            end_time: addMinutes(time, 60).toISOString(),
          },
          useAnchor ? anchor : undefined
        );
      } else {
        openComposerCreate(getDefaultCreateDraft());
      }
    },
    [openComposerCreate, getDefaultCreateDraft, activeView]
  );

  const handleSaveToNotion = useCallback(
    (event: CalendarEvent) => {
      openBruno({
        source: 'calendar',
        page: '/dashboard/calendar',
        label: 'Calendar - Save to Notion',
        payload: {
          prompt: `Create a Notion page with notes for my calendar event "${event.title}" (${format(new Date(event.start_time), 'PPp')}).${event.description ? ` Context: ${event.description}` : ''}`,
        },
      });
      toast.info('Bruno is ready to save this to Notion.');
    },
    [openBruno]
  );

  const navigateDate = useCallback(
    (direction: 'prev' | 'next') => {
      const delta = direction === 'next' ? 1 : -1;
      switch (activeView) {
        case 'day':
          setSelectedDate((prev) => addDays(prev, delta));
          break;
        case 'week':
          setSelectedDate((prev) => addDays(prev, delta * 7));
          break;
        case 'month':
          setSelectedDate((prev) => {
            const next = new Date(prev);
            next.setMonth(next.getMonth() + delta);
            return next;
          });
          break;
        case 'year':
          setSelectedDate((prev) => {
            const next = new Date(prev);
            next.setFullYear(next.getFullYear() + delta);
            return next;
          });
          break;
        case 'list':
          setSelectedDate((prev) => addDays(prev, delta));
          break;
      }
    },
    [activeView]
  );

  const handleToday = useCallback(() => {
    setSelectedDate(new Date());
    shellRef.current?.scrollToNow();
  }, []);

  const handleJumpToWeekday = useCallback((dayIndex: number) => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: WEEK_STARTS_ON });
    setSelectedDate(addDays(weekStart, dayIndex));
  }, [selectedDate]);

  useCalendarKeyboardShortcuts({
    onToday: handleToday,
    onNavigate: navigateDate,
    onViewChange: setActiveView,
    onNewEvent: () => handleCreateEvent(),
    onToggleBacklog: () => setBacklogOpen((o) => !o),
    onJumpToWeekday: handleJumpToWeekday,
    onOpenShortcuts: () => setShortcutsOpen(true),
    onEscape: () => {
      setShortcutsOpen(false);
      setComposer({ mode: 'closed' });
    },
  });

  const handleEventClick = (event: CalendarEvent) => {
    if (event.metadata?.readOnly) {
      const url = event.metadata?.url || event.external_id;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    setComposer({ mode: 'edit', event });
  };

  const handleEventComplete = async (id: string) => {
    await completeEvent(id);
  };

  const handleReschedule = async (eventId: string, newStart: Date, newEnd: Date) => {
    await rescheduleEvent(eventId, newStart, newEnd);
  };

  const handleResize = async (eventId: string, newEnd: Date) => {
    await resizeEvent(eventId, newEnd);
  };

  const handleStartFresh = async () => {
    if (
      window.confirm(
        'Are you sure you want to clear your timeline? This will delete all calendar events.'
      )
    ) {
      await clearAll();
    }
  };

  const handleUpdateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    await updateEvent(id, updates);
  };

  const handleReExtractGoogle = async () => {
    setIsProcessing(true);
    const toastId = toast.loading('Syncing Google Calendar...', { id: 're-extract' });
    try {
      const response = await fetch('/api/integrations/google/sync?force=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        let message = 'Failed to sync Google Calendar';
        try {
          const parsed = JSON.parse(errBody) as { error?: string };
          if (parsed.error) message = parsed.error;
        } catch {
          // keep default
        }
        throw new Error(message);
      }
      const data = await response.json();
      toast.success(data.message || 'Google Calendar synced', { id: toastId });
      setGoogleLastSyncedAt(new Date().toISOString());
      loadEvents();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      console.error(err);
      toast.error(`Sync failed: ${message}`, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTaskDrop = async (task: Task, time: Date) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let linkedTaskId: string;
    try {
      linkedTaskId = await resolveTaskIdForSchedule(supabase, task, user.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not schedule task';
      toast.error(message);
      return;
    }

    const durationMs = (task.estimated_minutes || 60) * 60 * 1000;
    const endTime = new Date(time.getTime() + durationMs);
    const newEvent = await createEvent({
      title: task.title,
      description: task.description || undefined,
      start_time: time.toISOString(),
      end_time: endTime.toISOString(),
      source: 'cargo_bay',
      linked_task_id: linkedTaskId,
      color: task.color ?? undefined,
      energy_level: task.energy_level_required as CalendarEvent['energy_level'],
    });

    if (newEvent) {
      setBacklogRefreshKey((k) => k + 1);
      toast.success(`Scheduled "${task.title}"`, {
        action: {
          label: 'Undo',
          onClick: async () => {
            await deleteEvent(newEvent.id);
            toast.info(`Removed "${task.title}" from schedule`);
          },
        },
      });
    }
  };

  const handleAskBruno = useCallback(
    (task: Task) => {
      openBruno({
        source: 'calendar',
        page: '/dashboard/calendar',
        label: 'Calendar - Schedule task',
        payload: {
          prompt: `Find the best time slot today or this week for my task "${task.title}" (${task.estimated_minutes || 30} minutes).`,
        },
      });
    },
    [openBruno]
  );

  const handleRangeChange = useCallback(
    (start: Date, end: Date) => {
      loadEvents(start, end);
    },
    [loadEvents]
  );

  const getVisibleCalendarRange = useCallback((): [Date, Date] => {
    if (activeView === 'day' || activeView === 'list') {
      const start = startOfDay(selectedDate);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return [start, end];
    }

    if (activeView === 'week') {
      const start = startOfWeek(selectedDate, { weekStartsOn: WEEK_STARTS_ON });
      const end = addDays(start, 7);
      end.setMilliseconds(end.getMilliseconds() - 1);
      return [start, end];
    }

    if (activeView === 'year') {
      return [
        new Date(selectedDate.getFullYear(), 0, 1),
        new Date(selectedDate.getFullYear(), 11, 31, 23, 59, 59, 999),
      ];
    }

    return [
      new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
      new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      ),
    ];
  }, [activeView, selectedDate]);

  const loadVisibleCalendar = useCallback(
    (silent = true) => {
      const [start, end] = getVisibleCalendarRange();
      void loadEvents(start, end, silent);
    },
    [getVisibleCalendarRange, loadEvents]
  );

  useEffect(() => {
    const handleBrunoCalendarChange = () => {
      loadVisibleCalendar(true);
      setBacklogRefreshKey((k) => k + 1);
    };

    window.addEventListener(
      'planevo:calendar-events-changed',
      handleBrunoCalendarChange
    );
    return () => {
      window.removeEventListener(
        'planevo:calendar-events-changed',
        handleBrunoCalendarChange
      );
    };
  }, [loadVisibleCalendar]);

  useEffect(() => {
    loadVisibleCalendar(false);
  }, [loadVisibleCalendar]);

  const handleAutoSchedule = async (backlogTasks?: Task[]) => {
    setIsProcessing(true);
    const toastId = toast.loading('Bruno is finding optimal slots...', { id: 'auto-schedule' });

    try {
      const response = await fetch('/api/ai/daily-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          energyLevel: 'medium',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          localTime: new Date().toISOString(),
          backlogTasks: backlogTasks?.map((t) => ({
            id: t.id,
            title: t.title,
            estimated_minutes: t.estimated_minutes || 30,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate schedule from Bruno');
      }

      const data = await response.json();
      toast.success(data.message || 'Schedule generated successfully', { id: toastId });
      setBacklogRefreshKey((k) => k + 1);
      loadEvents();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Auto-scheduling failed';
      console.error(err);
      toast.error(`Auto-scheduling failed: ${message}`, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComposerSchedule = async (draft: CalendarComposerDraft) => {
    await createEvent({
      title: draft.title,
      start_time: draft.start_time,
      end_time: draft.end_time,
      description: draft.description,
      is_all_day: draft.is_all_day ?? false,
      color: draft.color,
      source: 'manual',
      metadata: draft.metadata,
    });
    toast.success(`Added "${draft.title}" to calendar`);
  };

  const handleComposerBacklog = async (draft: CalendarComposerDraft) => {
    const { user, error: profileError } = await ensureUserProfile(supabase);
    if (profileError || !user) {
      toast.error('Please log in again.');
      return;
    }

    const start = new Date(draft.start_time);
    const durationMins = Math.round(
      (new Date(draft.end_time).getTime() - start.getTime()) / 60000
    );

    const { error } = await supabase.from('tasks').insert({
      user_id: user.id,
      title: draft.title,
      description: draft.description || null,
      estimated_minutes: durationMins > 0 ? durationMins : 30,
      status: 'todo',
      completed: false,
      priority: 'medium',
      energy_level_required: 'medium',
      best_time_of_day: 'anytime',
      due_date: start.toISOString().split('T')[0],
    });

    if (error) {
      toast.error('Failed to add to backlog');
      return;
    }

    setBacklogRefreshKey((k) => k + 1);
    toast.success(`Added "${draft.title}" to backlog`);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full w-full animate-pulse fade-in duration-500 min-h-0">
        <div className="pb-2 shrink-0">
          <div className="w-48 h-3 bg-[var(--color-line-strong)] rounded-full" />
        </div>
        <div className="flex-1 min-h-0 border border-[var(--color-line)] rounded-[22px] bg-[var(--color-paper)] p-4">
          <div className="w-full h-10 bg-[var(--color-line-strong)] rounded-xl mb-4" />
          <div className="w-full h-full bg-[var(--color-cream)] rounded-xl opacity-50" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full animate-fade-in min-h-0">
      <div className="flex-1 min-h-0 relative">
        <CalendarShell
          ref={shellRef}
          events={mergedEvents}
          preferences={preferences}
          selectedDate={selectedDate}
          activeView={activeView}
          onDateChange={setSelectedDate}
          onViewChange={setActiveView}
          onEventClick={handleEventClick}
          onEventComplete={handleEventComplete}
          onCreateEvent={handleCreateEvent}
          onEventReschedule={handleReschedule}
          onEventResize={handleResize}
          onTaskDrop={handleTaskDrop}
          onRangeChange={handleRangeChange}
          draggedTask={draggedTask}
          onDragTaskChange={setDraggedTask}
          backlogOpen={backlogOpen}
          onToggleBacklog={() => setBacklogOpen((o) => !o)}
          backlogCount={backlogCount}
          connectedProviders={connectedProviders}
          hiddenLayers={hiddenLayers}
          onToggleLayer={toggleLayer}
          googleConnected={googleConnected}
          googleLastSyncedAt={googleLastSyncedAt}
          onSyncGoogle={handleReExtractGoogle}
          onStartFresh={handleStartFresh}
          isProcessing={isProcessing}
          onNavigate={navigateDate}
          onToday={handleToday}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          onCreate={() => handleCreateEvent()}
          backlogPanel={
            <TaskBacklog
              key={backlogRefreshKey}
              variant="embedded"
              onScheduleAll={handleAutoSchedule}
              onScheduleOne={(task, time) => {
                if (time) {
                  void handleTaskDrop(task, time);
                }
              }}
              onAskBruno={handleAskBruno}
              onDragStartTask={setDraggedTask}
              isProcessing={isProcessing}
              scheduledTaskIds={
                events.map((e) => e.linked_task_id).filter(Boolean) as string[]
              }
              selectedDate={selectedDate}
              events={mergedEvents}
              dayStartHour={preferences.day_start_hour}
              dayEndHour={preferences.day_end_hour}
              onTaskCreated={() => setBacklogRefreshKey((k) => k + 1)}
            />
          }
        />
      </div>

      <CalendarComposer
        state={composer}
        timeFormat={preferences.time_format}
        onClose={() => setComposer({ mode: 'closed' })}
        onSaveSchedule={handleComposerSchedule}
        onSaveBacklog={handleComposerBacklog}
        onSaveEdit={handleUpdateEvent}
        onDelete={async (id) => {
          await deleteEvent(id);
          setComposer({ mode: 'closed' });
        }}
        onSaveToNotion={
          connectedProviders.includes('notion') ? handleSaveToNotion : undefined
        }
      />
      <CalendarShortcutHelp open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
