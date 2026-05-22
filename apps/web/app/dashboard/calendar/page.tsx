'use client';
import { useState, useCallback } from 'react';

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

  const loading = prefsLoading;

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
      const supabase = createClient();
      await supabase.from('tasks').update({ completed: true }).eq('id', task.id);
      
      // Delay slightly and reload page to refresh backlog item list
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  const handleRangeChange = useCallback((start: Date, end: Date) => {
    loadEvents(start, end);
  }, [loadEvents]);

  const handleAutoSchedule = async (backlogTasks?: Task[]) => {
    setIsProcessing(true);
    const toastId = toast.loading('Bruno is finding optimal slots...', { id: 'auto-schedule' });

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not authenticated', { id: toastId });
        setIsProcessing(false);
        return;
      }

      let tasksToSchedule = backlogTasks;
      if (!tasksToSchedule) {
        const { data } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('completed', false)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        tasksToSchedule = (data || []) as Task[];
      }

      if (!tasksToSchedule || tasksToSchedule.length === 0) {
        toast.dismiss(toastId);
        setIsProcessing(false);
        return;
      }

      // Schedule tasks starting from tomorrow at 9 AM, filling 9 AM - 5 PM slots
      let currentPointer = new Date();
      currentPointer.setDate(currentPointer.getDate() + 1); // Start tomorrow
      currentPointer.setHours(9, 0, 0, 0);

      let count = 0;
      for (const task of tasksToSchedule) {
        if (currentPointer.getHours() >= 17) {
          currentPointer.setDate(currentPointer.getDate() + 1);
          currentPointer.setHours(9, 0, 0, 0);
        }

        const duration = task.estimated_minutes || 60;
        const endTime = new Date(currentPointer.getTime() + duration * 60 * 1000);

        const newEvent = await createEvent({
          title: task.title,
          description: task.description || undefined,
          start_time: currentPointer.toISOString(),
          end_time: endTime.toISOString(),
          source: 'schedule',
          linked_task_id: task.id,
          energy_level: task.energy_level_required as CalendarEvent['energy_level'],
        });

        if (newEvent) {
          await supabase.from('tasks').update({ completed: true }).eq('id', task.id);
          count++;
        }

        currentPointer = new Date(endTime.getTime() + 30 * 60 * 1000); // 30 min break
      }

      toast.dismiss(toastId);
      loadEvents(); 
      
      setTimeout(() => {
        window.location.reload();
      }, 800);

    } catch (err: any) {
      console.error(err);
      toast.error(`Auto-scheduling failed: ${err.message || err}`, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-2 border-[var(--color-ink)] border-t-transparent rounded-full animate-spin" />
        <h2 className="mt-6 text-sm font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
          Loading Timeline...
        </h2>
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
            {/* Start Fresh / Action buttons */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleStartFresh}
              className="text-[var(--color-ink-muted)] hover:text-red-600 hover:bg-red-50/50 text-xs font-mono uppercase tracking-wider font-bold"
            >
              <ArrowsCounterClockwise className="w-3.5 h-3.5 mr-1.5" />
              Start Fresh
            </Button>

            {/* Date navigation */}
            <div className="flex items-center gap-1 bg-[var(--color-paper)] p-1 rounded-xl border border-[var(--color-line)] shadow-sm">
              <button
                onClick={() => navigateDate('prev')}
                className="p-1.5 rounded-lg hover:bg-[var(--color-cream)] text-[var(--color-ink)] transition-colors"
                aria-label="Previous"
              >
                <CaretLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg hover:bg-[var(--color-cream)] text-[var(--color-ink)] transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => navigateDate('next')}
                className="p-1.5 rounded-lg hover:bg-[var(--color-cream)] text-[var(--color-ink)] transition-colors"
                aria-label="Next"
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
                    relative px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 z-10
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

      {/* Task Backlog Sidebar */}
      <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-6 h-full overflow-y-auto no-scrollbar hidden lg:flex">
        {/* Task Backlog Card */}
        <TaskBacklog 
          onScheduleAll={handleAutoSchedule}
          onScheduleOne={(task) => {
            toast.info(`Drag "${task.title}" onto the calendar grid to schedule it.`);
          }}
          isProcessing={isProcessing}
        />

        {/* Bruno Helper Card */}
        <div className="bg-[#2c221a] text-[#fdfbf7] rounded-[22px] p-6 border border-[#3e3227] shadow-lg flex flex-col gap-4 relative overflow-hidden group">
          {/* Subtle background glow/bear print */}
          <div className="absolute -right-6 -bottom-6 opacity-[0.03] pointer-events-none transition-transform group-hover:scale-110 duration-500">
            <span className="text-[120px] select-none">🐻</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#fdfbf7]/10 flex items-center justify-center border border-[#fdfbf7]/20">
              <span className="text-sm">🐻</span>
            </div>
            <span className="font-mono text-[10px] tracking-widest text-[#fdfbf7]/60 uppercase">Bruno helper</span>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-xl font-bold tracking-tight text-[#fdfbf7] leading-snug">
              Let Bruno organize your week in a single click.
            </h4>
            <p className="text-xs text-[#fdfbf7]/70 leading-relaxed font-sans">
              Analyze your energy levels, task duration, and calendar openings to construct the perfect schedule.
            </p>
          </div>

          <button
            onClick={() => handleAutoSchedule()}
            disabled={isProcessing}
            className="w-full mt-2 py-3 px-4 bg-[#fdfbf7] hover:bg-[#f4ebe1] disabled:opacity-50 text-[#2c221a] font-mono text-[11px] font-bold tracking-wider uppercase rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-[#2c221a] border-t-transparent rounded-full animate-spin" />
                <span>Scheduling...</span>
              </>
            ) : (
              <>
                <span>Auto-schedule</span>
              </>
            )}
          </button>
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
