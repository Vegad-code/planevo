'use client';

import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { MOTION } from '@/lib/calendar/motion';
import CalendarHeader from './CalendarHeader';
import DayView from './views/DayView';
import WeekView from './views/WeekView';
import MonthView from './views/MonthView';
import ListView from './views/ListView';
import type { CalendarEvent, CalendarPreferences } from '@/types/calendar';
import type { Task } from '@/types/tasks';
import { Plus } from '@phosphor-icons/react';

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
  const setSelectedDate = onDateChange;
  const setActiveView = onViewChange;

  // Trigger range change callback
  useEffect(() => {
    if (!onRangeChange) return;

    let start = startOfDay(selectedDate);
    let end = endOfDay(selectedDate);

    if (activeView === 'week') {
      const weekStart = preferences.week_starts_on === 'monday' ? 1 : 0;
      start = startOfWeek(selectedDate, { weekStartsOn: weekStart });
      end = endOfWeek(selectedDate, { weekStartsOn: weekStart });
    } else if (activeView === 'month') {
      start = startOfMonth(selectedDate);
      end = endOfMonth(selectedDate);
    } else if (activeView === 'list') {
      end = addDays(start, 30);
    }

    onRangeChange(start, end);
  }, [selectedDate, activeView, onRangeChange, preferences.week_starts_on]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      
      switch (e.key.toLowerCase()) {
        case 't':
          setSelectedDate(new Date());
          break;
        case 'd':
          setActiveView('day');
          break;
        case 'w':
          setActiveView('week');
          break;
        case 'm':
          setActiveView('month');
          break;
        case 'l':
          setActiveView('list');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter events for the selected date range based on active view
  const filteredEvents = useCallback(() => {
    let start = startOfDay(selectedDate);
    let end = endOfDay(selectedDate);

    if (activeView === 'week') {
      start = startOfWeek(selectedDate, { weekStartsOn: preferences.week_starts_on === 'monday' ? 1 : 0 });
      end = endOfWeek(selectedDate, { weekStartsOn: preferences.week_starts_on === 'monday' ? 1 : 0 });
    } else if (activeView === 'month') {
      start = startOfMonth(selectedDate);
      end = endOfMonth(selectedDate);
    } else if (activeView === 'list') {
      // List view shows next 30 days
      end = addDays(start, 30);
    }

    return events.filter((event) => {
      // Apply source visibility filters
      if (!preferences.show_google_calendar && event.source === 'google_calendar') return false;
      if (!preferences.show_canvas && event.source === 'canvas') return false;
      if (!preferences.show_blueprint && event.source === 'blueprint') return false;
      if (!preferences.show_schedule && event.source === 'schedule') return false;
      if (!preferences.show_cargo_bay && event.source === 'cargo_bay') return false;
      if (!preferences.show_focus_blocks && event.source === 'focus_block') return false;
      if (!preferences.show_completed && event.is_completed) return false;

      // Date filter
      if (event.is_all_day) {
        const eventDate = new Date(event.start_time);
        return eventDate >= start && eventDate <= end;
      }

      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      return eventStart < end && eventEnd > start;
    });
  }, [events, selectedDate, preferences, activeView])();

  const handleEmptySlotClick = (time: Date) => {
    onCreateEvent?.(time);
  };

  return (
    <div 
      className="flex flex-col h-full w-full bg-[var(--color-paper)] border border-[var(--color-line)] rounded-[22px] overflow-hidden shadow-sm transition-all"
      style={{ '--gutter-width': 'clamp(48px, 8vw, 64px)' } as React.CSSProperties}
    >
      {/* Header — Only render if activeView is 'day' to show the horizontal week strip */}
      {activeView === 'day' && (
        <div className="p-4 border-b border-[var(--color-line)] bg-[var(--color-paper)]">
          <CalendarHeader
            selectedDate={selectedDate}
            activeView={activeView}
            onDateChange={setSelectedDate}
            onViewChange={setActiveView}
          />
        </div>
      )}

      {/* View content */}
      <div className="flex-1 relative overflow-hidden min-h-[500px]">
        <AnimatePresence mode="wait">
          {activeView === 'day' && (
            <motion.div key="day" {...MOTION.viewSwitch} className="absolute inset-0">
              <DayView
                date={selectedDate}
                events={filteredEvents}
                dayStartHour={preferences.day_start_hour}
                dayEndHour={preferences.day_end_hour}
                timeFormat={preferences.time_format}
                onEventClick={onEventClick}
                onEventComplete={onEventComplete}
                onEmptySlotClick={handleEmptySlotClick}
                onEventReschedule={onEventReschedule}
                onEventResize={onEventResize}
                onTaskDrop={onTaskDrop}
              />
            </motion.div>
          )}

          {activeView === 'week' && (
            <motion.div key="week" {...MOTION.viewSwitch} className="absolute inset-0">
              <WeekView
                date={selectedDate}
                events={filteredEvents}
                dayStartHour={preferences.day_start_hour}
                dayEndHour={preferences.day_end_hour}
                timeFormat={preferences.time_format}
                onEventClick={onEventClick}
                onEventComplete={onEventComplete}
                onEmptySlotClick={handleEmptySlotClick}
                onEventReschedule={onEventReschedule}
                onEventResize={onEventResize}
                onTaskDrop={onTaskDrop}
              />
            </motion.div>
          )}

          {activeView === 'month' && (
            <motion.div key="month" {...MOTION.viewSwitch} className="absolute inset-0">
              <MonthView
                date={selectedDate}
                events={filteredEvents}
                onDayClick={(date) => {
                  setSelectedDate(date);
                  setActiveView('day');
                }}
              />
            </motion.div>
          )}

          {activeView === 'list' && (
            <motion.div key="list" {...MOTION.viewSwitch} className="absolute inset-0">
              <ListView
                date={selectedDate}
                events={filteredEvents}
                onEventClick={onEventClick}
                onEventComplete={onEventComplete}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FAB — Floating Action Button for quick task creation */}
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
