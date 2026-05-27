'use client';

import React, { useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import CalendarHeader from './CalendarHeader';
import type { CalendarEvent, CalendarPreferences } from '@/types/calendar';
import type { Task } from '@/types/tasks';
import { Plus } from '@phosphor-icons/react';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

type CalendarView = 'day' | 'week' | 'month' | 'list';

interface CalendarShellProps {
  events: CalendarEvent[];
  preferences: CalendarPreferences;
  selectedDate: Date;
  activeView: CalendarView;
  onDateChange: (date: Date) => void;
  onViewChange: (view: CalendarView) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onEventComplete?: (id: string) => void;
  onCreateEvent?: (time?: Date) => void;
  onEventReschedule?: (eventId: string, newStart: Date, newEnd: Date) => void;
  onEventResize?: (eventId: string, newEnd: Date) => void;
  onTaskDrop?: (task: Task, time: Date) => void;
  onRangeChange?: (start: Date, end: Date) => void;
}

export default function CalendarShell({
  events,
  preferences,
  selectedDate,
  activeView,
  onDateChange,
  onViewChange,
  onEventClick,
  onEventComplete,
  onCreateEvent,
  onEventReschedule,
  onEventResize,
  onTaskDrop,
  onRangeChange,
}: CalendarShellProps) {

  // Map planevo events to react-big-calendar format
  const rbcEvents = useMemo(() => {
    return events.map((ev) => ({
      id: ev.id,
      title: ev.title,
      start: new Date(ev.start_time),
      end: new Date(ev.end_time),
      allDay: ev.is_all_day,
      resource: ev, // Store the original event data here
    }));
  }, [events]);

  // Handle Drag & Drop Reschedule
  const handleEventDrop = useCallback(
    ({ event, start, end, isAllDay }: any) => {
      if (onEventReschedule && event.id) {
        onEventReschedule(event.id as string, start, end);
      }
    },
    [onEventReschedule]
  );

  // Handle Resize
  const handleEventResize = useCallback(
    ({ event, start, end }: any) => {
      if (onEventResize && event.id) {
        onEventResize(event.id as string, end);
      }
    },
    [onEventResize]
  );

  // Handle Selection (Create Event)
  const handleSelectSlot = useCallback(
    ({ start }: any) => {
      if (onCreateEvent) {
        onCreateEvent(start);
      }
    },
    [onCreateEvent]
  );

  // Map activeView string to RBC View
  const rbcView = useMemo(() => {
    switch (activeView) {
      case 'day': return Views.DAY;
      case 'week': return Views.WEEK;
      case 'month': return Views.MONTH;
      case 'list': return Views.AGENDA;
      default: return Views.WEEK;
    }
  }, [activeView]);

  const handleNavigate = (newDate: Date) => {
    onDateChange(newDate);
  };

  const handleViewChange = (newView: any) => {
    // Map back to our view types if necessary, though we control it via CalendarHeader
    if (newView === Views.DAY) onViewChange('day');
    else if (newView === Views.WEEK) onViewChange('week');
    else if (newView === Views.MONTH) onViewChange('month');
    else if (newView === Views.AGENDA) onViewChange('list');
  };

  // Custom event styling based on original metadata
  const eventPropGetter = useCallback(
    (event: any) => {
      const originalEv = event.resource as CalendarEvent;
      let backgroundColor = 'var(--color-ink-soft)'; // default manual

      if (originalEv) {
        if (originalEv.source === 'google_calendar') backgroundColor = 'var(--color-google)';
        else if (originalEv.source === 'canvas') backgroundColor = 'var(--color-canvas)';
        else if (originalEv.source === 'blueprint') backgroundColor = 'var(--color-blueprint)';
        else if (originalEv.source === 'cargo_bay') backgroundColor = 'var(--color-cargo)';
        else if (originalEv.source === 'focus_block') backgroundColor = 'var(--color-focus)';
      }

      return {
        style: {
          backgroundColor,
          color: '#fff',
          borderRadius: '8px',
          border: 'none',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        },
      };
    },
    []
  );

  return (
    <div 
      className="flex flex-col h-full w-full bg-[var(--color-paper)] border border-[var(--color-line)] rounded-[22px] overflow-hidden shadow-sm transition-all"
    >
      {/* We keep the custom header outside the RBC instance so we have full UI control */}
      <div className="p-4 border-b border-[var(--color-line)] bg-[var(--color-paper)]">
        <CalendarHeader
          selectedDate={selectedDate}
          activeView={activeView}
          onDateChange={onDateChange}
          onViewChange={onViewChange}
        />
      </div>

      <div className="flex-1 relative p-4 min-h-[600px] overflow-hidden">
        <DnDCalendar
          localizer={localizer}
          events={rbcEvents}
          date={selectedDate}
          view={rbcView}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={(event: any) => onEventClick?.(event.resource)}
          selectable
          resizable
          step={15}
          timeslots={4}
          min={new Date(1970, 1, 1, preferences.day_start_hour || 0, 0, 0)}
          max={new Date(1970, 1, 1, preferences.day_end_hour || 23, 59, 59)}
          eventPropGetter={eventPropGetter}
          // Hide the built-in toolbar since we use our own CalendarHeader
          toolbar={false}
          style={{ height: '100%', width: '100%' }}
        />
      </div>

      <button
        onClick={() => onCreateEvent?.()}
        className="
          fixed bottom-8 right-8 z-50
          w-14 h-14 rounded-full
          bg-[var(--color-ink)] hover:bg-[var(--color-ink-2)]
          text-[var(--color-cream)] shadow-lg
          flex items-center justify-center
          transition-all duration-200
          hover:scale-105 active:scale-95
        "
        aria-label="Add new event"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
