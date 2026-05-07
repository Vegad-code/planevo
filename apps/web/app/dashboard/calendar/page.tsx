'use client';
import { useState, useCallback } from 'react';

import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useCalendarPreferences } from '@/hooks/useCalendarPreferences';
import CalendarShell from '@/components/calendar/CalendarShell';
import TaskBacklog from '@/components/dashboard/TaskBacklog';
import EventDialog from '@/components/calendar/dialogs/EventDialog';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { CalendarEvent } from '@/types/calendar';
import QuickAddSidebar from '@/components/calendar/dialogs/QuickAddSidebar';

interface Task {
  id: string;
  title: string;
  description?: string;
  estimated_minutes?: number;
  energy_level_required?: string;
}

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

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const loading = prefsLoading;

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleEventComplete = async (id: string) => {
    await completeEvent(id);
    const event = events.find(e => e.id === id);
    if (event && !event.is_completed) {
      toast.success('Task complete! 🎯', {
        description: event.title,
      });
    }
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
    const newEvent = await createEvent(data);
    if (newEvent) {
      toast.success('Event scheduled to timeline');
    }
  };


  const handleReschedule = async (eventId: string, newStart: Date, newEnd: Date) => {
    await rescheduleEvent(eventId, newStart, newEnd);
    toast.success('Rescheduled', {
      description: `Moved to ${newStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
    });
  };

  const handleResize = async (eventId: string, newEnd: Date) => {
    await resizeEvent(eventId, newEnd);
    toast.success('Duration updated', {
      description: `Ends at ${newEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
    });
  };

  const handleStartFresh = async () => {
    if (window.confirm("Are you sure you want to clear your timeline? This will delete all calendar events.")) {
      await clearAll();
      toast.success("Timeline cleared. Fresh start!");
    }
  };

  const handleUpdateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    await updateEvent(id, updates);
    toast.success("Event updated");
  };

  const handleTaskDrop = async (task: Task, time: Date) => {
    // 1 hour default
    const endTime = new Date(time.getTime() + (task.estimated_minutes || 60) * 60 * 1000); 
    const newEvent = await createEvent({
      title: task.title,
      description: task.description,
      start_time: time.toISOString(),
      end_time: endTime.toISOString(),
      source: 'cargo',
      linked_task_id: task.id,
      energy_level: task.energy_level_required,
    });
    
    if (newEvent) {
      toast.success('Scheduled from Backlog', {
        description: `${task.title} at ${time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
      });
      // Mark task as scheduled/completed in DB so it doesn't show in CargoBay anymore
      const supabase = createClient();
      await supabase.from('tasks').update({ completed: true }).eq('id', task.id);
    }
  };

  const handleRangeChange = useCallback((start: Date, end: Date) => {
    loadEvents(start, end);
  }, [loadEvents]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <h2 className="mt-6 text-xl font-black text-foreground uppercase tracking-tighter">
          Loading Calendar...
        </h2>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full animate-fade-in bg-background">
      <div className="flex-1 flex flex-col min-w-0 p-0">
        <div className="p-6 pb-2 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter leading-none mb-1">
              Calendar
            </h1>
            <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">
              Your unified timeline
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleStartFresh}
            className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20 shadow-sm"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Start Fresh
          </Button>
        </div>

        <div className="flex-1 flex min-h-0 relative">
          <CalendarShell
            events={events}
            preferences={preferences}
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
      <div className="w-[320px] shrink-0 border-l border-border bg-surface-50/50 flex flex-col h-full overflow-hidden hidden lg:flex">
        <div className="p-4 h-full flex flex-col">
          <TaskBacklog 
            onScheduleAll={() => toast.info('Auto-schedule disabled in calendar view')}
            onScheduleOne={() => toast.info('Drag item onto the calendar')}
            isProcessing={false}
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
          toast.success("Event deleted");
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
