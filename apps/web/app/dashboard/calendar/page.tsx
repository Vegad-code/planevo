'use client';
import { useState, useCallback, useEffect, useMemo } from 'react';

import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useCalendarPreferences } from '@/hooks/useCalendarPreferences';
import CalendarShell from '@/components/calendar/CalendarShell';
import TaskBacklog from '@/components/dashboard/TaskBacklog';
import EventDialog from '@/components/calendar/dialogs/EventDialog';
import { Button } from '@/components/ui/button';
import { ArrowsCounterClockwise, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { CalendarEvent } from '@/types/calendar';
import type { Task } from '@/types/tasks';
import QuickAddSidebar from '@/components/calendar/dialogs/QuickAddSidebar';
import { format, startOfWeek, addDays } from 'date-fns';
import { useRegisterBrunoContext } from '@/components/bruno/BrunoProvider';

interface QuickAddData {
  title: string;
  start_time: string;
  end_time: string;
  description: string;
  is_all_day: boolean;
  is_completed: boolean;
  source: string;
  metadata: {
    subtasks: Array<{ title: string; completed: boolean }>;
  };
}

export default function CalendarPage() {
  const {
    events,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    loading: eventsLoading,
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
  const [activeView, setActiveView] = useState<'day' | 'week' | 'month' | 'list'>('week');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [backlogCount, setBacklogCount] = useState<number>(0);
  const supabase = createClient();

  const loading = prefsLoading;
  const contextLabel = useMemo(() => {
    if (activeView === 'week') {
      return `Calendar - Week of ${format(
        startOfWeek(selectedDate, { weekStartsOn: 1 }),
        'MMM d'
      )}`;
    }

    if (activeView === 'month') {
      return `Calendar - ${format(selectedDate, 'MMMM yyyy')}`;
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await supabase
        .from('users')
        .select('google_calendar_connected')
        .eq('id', session.user.id)
        .single();
      if (data?.google_calendar_connected) {
        setGoogleConnected(true);
      }
    }
    checkGoogleConnection();
  }, [supabase]);

  useEffect(() => {
    async function loadBacklogCount() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', user.id)
        .eq('completed', false)
        .is('deleted_at', null);

      if (data) {
        const scheduledIds = events.map(e => e.linked_task_id).filter(Boolean) as string[];
        const unscheduledTasks = data.filter(t => !scheduledIds.includes(t.id));
        setBacklogCount(unscheduledTasks.length);
      }
    }
    loadBacklogCount();
  }, [supabase, events]);

  const navigateDate = (direction: 'prev' | 'next') => {
    const delta = direction === 'next' ? 1 : -1;
    switch (activeView) {
      case 'day':
        setSelectedDate(prev => addDays(prev, delta));
        break;
      case 'week':
        setSelectedDate(prev => addDays(prev, delta * 7));
        break;
      case 'month':
        const newMonth = new Date(selectedDate);
        newMonth.setMonth(newMonth.getMonth() + delta);
        setSelectedDate(newMonth);
        break;
      case 'list':
        setSelectedDate(prev => addDays(prev, delta));
        break;
    }
  };

  const getSubheadText = () => {
    try {
      switch (activeView) {
        case 'week':
          return `CALENDAR · WEEK OF ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMMM d').toUpperCase()}`;
        case 'day':
          return `CALENDAR · ${format(selectedDate, 'EEEE · MMMM d').toUpperCase()}`;
        case 'month':
          return `CALENDAR · ${format(selectedDate, 'MMMM yyyy').toUpperCase()}`;
        case 'list':
          return 'CALENDAR · UPCOMING SCHEDULE';
      }
    } catch {
      return 'CALENDAR';
    }
  };

  const getTitle = () => {
    switch (activeView) {
      case 'week':
        return <>Your <span className="font-serif italic text-[var(--color-honey-deep)] font-normal">week</span>, unified.</>;
      case 'day':
        return <>Your <span className="font-serif italic text-[var(--color-honey-deep)] font-normal">day</span>, unified.</>;
      case 'month':
        return <>Your <span className="font-serif italic text-[var(--color-honey-deep)] font-normal">month</span>, unified.</>;
      case 'list':
        return <>Your <span className="font-serif italic text-[var(--color-honey-deep)] font-normal">timeline</span>, unified.</>;
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleEventComplete = async (id: string) => {
    await completeEvent(id);
  };

  const handleCreateEvent = async (time?: Date) => {
    if (time) {
      const endTime = new Date(time.getTime() + 60 * 60 * 1000); // 1 hour default
      const newEvent = await createEvent({
        title: 'New Event',
        start_time: time.toISOString(),
        end_time: endTime.toISOString(),
        source: 'manual',
      });
      if (newEvent) {
        setSelectedEvent(newEvent);
      }
    } else {
      setIsQuickAddOpen(true);
    }
  };

  const handleQuickAddSave = async (data: QuickAddData) => {
    await createEvent(data as Partial<CalendarEvent>);
  };

  const handleReschedule = async (eventId: string, newStart: Date, newEnd: Date) => {
    await rescheduleEvent(eventId, newStart, newEnd);
  };

  const handleResize = async (eventId: string, newEnd: Date) => {
    await resizeEvent(eventId, newEnd);
  };

  const handleStartFresh = async () => {
    if (window.confirm("Are you sure you want to clear your timeline? This will delete all calendar events.")) {
      await clearAll();
    }
  };

  const handleUpdateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    await updateEvent(id, updates);
  };

  const handleReExtractGoogle = async () => {
    setIsProcessing(true);
    const toastId = toast.loading('Re-extracting events from Google Calendar...', { id: 're-extract' });
    try {
      const response = await fetch('/api/integrations/google/sync?force=true', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to re-extract events');
      }
      const data = await response.json();
      toast.success(data.message || 'Events re-extracted successfully', { id: toastId });
      loadEvents(); 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
      toast.error(`Re-extract failed: ${err.message || err}`, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTaskDrop = async (task: Task, time: Date) => {
    const endTime = new Date(time.getTime() + (task.estimated_minutes || 60) * 60 * 1000); 
    const newEvent = await createEvent({
      title: task.title,
      description: task.description || undefined,
      start_time: time.toISOString(),
      end_time: endTime.toISOString(),
      source: 'cargo_bay',
      linked_task_id: task.id,
      energy_level: task.energy_level_required as CalendarEvent['energy_level'],
    });
    
    if (newEvent) {
      toast.success(`Scheduled "${task.title}"`, {
        action: {
          label: 'Undo',
          onClick: async () => {
            await deleteEvent(newEvent.id);
            toast.info(`Removed "${task.title}" from schedule`);
          }
        }
      });
    }
  };

  const handleRangeChange = useCallback((start: Date, end: Date) => {
    loadEvents(start, end);
  }, [loadEvents]);

  // Initial load
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate schedule from Bruno');
      }

      const data = await response.json();
      toast.success(data.message || 'Schedule generated successfully', { id: toastId });
      loadEvents(); 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
      toast.error(`Auto-scheduling failed: ${err.message || err}`, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };




  if (loading) {
    return (
      <div className="flex flex-col lg:flex-row gap-8 h-full w-full animate-pulse fade-in duration-500 pb-12">
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header Skeleton */}
          <div className="pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
            <div>
              <div className="w-32 h-3 bg-[var(--color-line-strong)] rounded-full mb-3"></div>
              <div className="w-64 h-10 md:w-80 md:h-12 bg-[var(--color-line-strong)] rounded-xl"></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-24 h-8 bg-[var(--color-line-strong)] rounded-md"></div>
              <div className="w-28 h-8 bg-[var(--color-line-strong)] rounded-xl"></div>
              <div className="w-48 h-8 bg-[var(--color-line-strong)] rounded-xl"></div>
            </div>
          </div>
          {/* Calendar Grid Skeleton */}
          <div className="flex-1 min-h-[600px] border border-[var(--color-line)] rounded-[22px] bg-[var(--color-paper)] p-6">
            <div className="w-full h-full flex flex-col">
              <div className="flex border-b border-[var(--color-line)] pb-4 mb-4 gap-4">
                <div className="w-16 h-8"></div>
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-8 h-3 bg-[var(--color-line-strong)] rounded-full"></div>
                    <div className="w-10 h-10 bg-[var(--color-cream)] rounded-full"></div>
                  </div>
                ))}
              </div>
              <div className="flex-1 flex gap-4">
                <div className="w-16 flex flex-col gap-8 pt-4">
                  {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-10 h-3 bg-[var(--color-line-strong)] rounded-full self-end"></div>)}
                </div>
                <div className="flex-1 grid grid-cols-7 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7].map(i => (
                    <div key={i} className="h-full border-l border-[var(--color-line)] relative">
                       {i === 2 && <div className="absolute top-10 left-2 right-2 h-24 bg-[var(--color-cream-2)] rounded-lg"></div>}
                       {i === 4 && <div className="absolute top-32 left-2 right-2 h-16 bg-[var(--color-cream-2)] rounded-lg"></div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Sidebar Skeleton */}
        <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-6 h-full hidden lg:flex">
          <div className="bg-[var(--color-paper)] border border-[var(--color-line)] rounded-[22px] p-6 h-[400px]"></div>
          <div className="bg-[#2c221a] rounded-[22px] p-6 h-48 opacity-80"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full w-full animate-fade-in pb-12">
      {/* Main Calendar Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Editorial Title Section */}
        <div className="pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
          <div>
            <span className="font-mono text-[10px] tracking-widest text-[var(--color-ink-muted)] uppercase block mb-1">
              {getSubheadText()}
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-[var(--color-ink)] font-sans leading-none">
              {getTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {googleConnected && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleReExtractGoogle}
                disabled={isProcessing}
                className="text-[var(--color-blue)] hover:text-blue-600 hover:bg-blue-50/50 text-xs font-mono uppercase tracking-wider font-bold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 mr-2"
              >
                <ArrowsCounterClockwise className={`w-3.5 h-3.5 mr-1.5 ${isProcessing ? 'animate-spin' : ''}`} />
                Sync Google
              </Button>
            )}
            {/* Start Fresh / Action buttons */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleStartFresh}
              className="text-[var(--color-ink-muted)] hover:text-red-600 hover:bg-red-50/50 text-xs font-mono uppercase tracking-wider font-bold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
            >
              <ArrowsCounterClockwise className="w-3.5 h-3.5 mr-1.5" />
              Start Fresh
            </Button>

            {/* Date navigation */}
            <div className="flex items-center gap-1 bg-[var(--color-paper)] p-1 rounded-xl border border-[var(--color-line)] shadow-sm">
              <button
                onClick={() => navigateDate('prev')}
                className="p-1.5 rounded-lg hover:bg-[var(--color-cream)] text-[var(--color-ink)] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-ink)]"
                aria-label="Previous date range"
              >
                <CaretLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg hover:bg-[var(--color-cream)] text-[var(--color-ink)] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-ink)]"
              >
                Today
              </button>
              <button
                onClick={() => navigateDate('next')}
                className="p-1.5 rounded-lg hover:bg-[var(--color-cream)] text-[var(--color-ink)] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-ink)]"
                aria-label="Next date range"
              >
                <CaretRight className="w-4 h-4" />
              </button>
            </div>

            {/* View Switcher Pills */}
            <div className="flex bg-[var(--color-paper)] p-1 rounded-xl border border-[var(--color-line)] shadow-sm relative">
              {(['day', 'week', 'month', 'list'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  className={`
                    relative px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 z-10 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]
                    ${activeView === view
                      ? 'text-[var(--color-cream)] bg-[var(--color-ink)] shadow-sm'
                      : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                    }
                  `}
                >
                  <span className="relative z-10">{view}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar Shell Grid */}
        <div className="flex-1 min-h-[600px] relative">
          <CalendarShell
            events={events}
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
          />
        </div>
      </div>

      {/* Sidebar (Task Backlog) */}
      <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-4 h-full lg:h-[80vh]">
        <div className="flex items-center justify-center gap-2 bg-[var(--color-ink)] px-3 py-2.5 rounded-xl border border-[var(--color-line)] shadow-sm text-[var(--color-cream)] shrink-0">
          <span className="text-xs font-mono font-bold uppercase tracking-wider">
            Task Backlog
          </span>
          {backlogCount > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] font-sans font-bold rounded-full bg-[var(--color-paper)] text-[var(--color-ink)]">
              {backlogCount}
            </span>
          )}
        </div>

        <div className="flex-1 min-h-0">
          <TaskBacklog
            onScheduleAll={handleAutoSchedule}
            onScheduleOne={(task) => {
              toast.info(`Drag "${task.title}" onto the calendar grid to schedule it.`);
            }}
            isProcessing={isProcessing}
            scheduledTaskIds={events.map(e => e.linked_task_id).filter(Boolean) as string[]}
          />
        </div>
      </div>

      <EventDialog
        isOpen={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
        event={selectedEvent}
        onSave={handleUpdateEvent}
        onDelete={async (id) => {
          await deleteEvent(id);
          setSelectedEvent(null);
        }}
      />
      <QuickAddSidebar 
        isOpen={isQuickAddOpen}
        onOpenChange={setIsQuickAddOpen}
        onSave={handleQuickAddSave}
      />
    </div>
  );
}
