'use client';

import { useRef, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { addDays, startOfWeek, format, isSameDay } from 'date-fns';
import { MOTION } from '@/lib/calendar/motion';
import { computeDayLayout } from '@/lib/calendar/layoutEngine';
import TimeGrid from '../timeline/TimeGrid';
import EventCard from '../cards/EventCard';
import type { CalendarEvent } from '@/types/calendar';

interface WeekViewProps {
  date: Date;
  events: CalendarEvent[];
  dayStartHour: number;
  dayEndHour: number;
  timeFormat: '12h' | '24h';
  onEventClick?: (event: CalendarEvent) => void;
  onEventComplete?: (id: string) => void;
  onEmptySlotClick?: (time: Date) => void;
  onEventReschedule?: (eventId: string, newStart: Date, newEnd: Date) => void;
  onEventResize?: (eventId: string, newEnd: Date) => void;
  onTaskDrop?: (task: any, time: Date) => void;
}

const HOUR_HEIGHT = 72;

export default function WeekView({
  date,
  events,
  dayStartHour,
  dayEndHour,
  timeFormat,
  onEventClick,
  onEventComplete,
  onEmptySlotClick,
  onEventReschedule,
  onEventResize,
  onTaskDrop,
}: WeekViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const totalHeight = (dayEndHour - dayStartHour) * HOUR_HEIGHT;

  // Handle drag-to-reschedule
  const handleDragEnd = useCallback(
    (eventId: string, deltaY: number) => {
      if (!onEventReschedule) return;
      const event = events.find((e) => e.id === eventId);
      if (!event) return;

      const deltaMinutes = (deltaY / HOUR_HEIGHT) * 60;
      const snappedDelta = Math.round(deltaMinutes / 15) * 15;

      const originalStart = new Date(event.start_time);
      const originalEnd = new Date(event.end_time);
      const durationMs = originalEnd.getTime() - originalStart.getTime();

      const newStart = new Date(originalStart.getTime() + snappedDelta * 60 * 1000);
      const newEnd = new Date(newStart.getTime() + durationMs);

      onEventReschedule(eventId, newStart, newEnd);
    },
    [events, onEventReschedule]
  );

  // Handle bottom-edge resize
  const handleResizeEnd = useCallback(
    (eventId: string, deltaHeight: number) => {
      if (!onEventResize) return;
      const event = events.find((e) => e.id === eventId);
      if (!event) return;

      const deltaMinutes = (deltaHeight / HOUR_HEIGHT) * 60;
      const snappedDelta = Math.round(deltaMinutes / 15) * 15;

      const originalEnd = new Date(event.end_time);
      const newEnd = new Date(originalEnd.getTime() + snappedDelta * 60 * 1000);

      const start = new Date(event.start_time);
      if (newEnd.getTime() - start.getTime() < 15 * 60 * 1000) {
        return;
      }

      onEventResize(eventId, newEnd);
    },
    [events, onEventResize]
  );

  // Derive the 7 days of the currently selected week
  const days = useMemo(() => {
    const start = startOfWeek(date); // assumes Sunday start by default
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [date]);

  // Auto-scroll to current hour on mount
  useEffect(() => {
    if (!scrollRef.current) return;
    const now = new Date();
    const nowOffset = Math.max(0, (now.getHours() + now.getMinutes() / 60 - dayStartHour) * HOUR_HEIGHT);
    const scrollTarget = Math.max(0, nowOffset - scrollRef.current.clientHeight / 3);
    scrollRef.current.scrollTo({ top: scrollTarget, behavior: 'smooth' });
  }, [dayStartHour]);

  return (
    <motion.div
      key={date.toDateString()}
      {...MOTION.viewSwitch}
      className="flex flex-col h-full overflow-hidden"
    >
      {/* Header: Days of the Week */}
      <div className="flex border-b border-border pl-[var(--gutter-width,64px)]">
        {days.map((day) => {
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              className="flex-1 text-center py-2 border-l border-border first:border-l-0"
            >
              <div className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? 'text-brand-500' : 'text-muted-foreground'}`}>
                {format(day, 'EEE')}
              </div>
              <div className={`text-xl font-black mt-1 ${isToday ? 'text-brand-500' : 'text-foreground'}`}>
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable Timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative" style={{ scrollbarWidth: 'none' }}>
        <div className="relative" style={{ height: `${totalHeight}px`, paddingLeft: 'var(--gutter-width, 64px)' }}>
          {/* Background Grid */}
          <div className="absolute left-[var(--gutter-width,64px)] right-0 top-0 bottom-0">
            <TimeGrid startHour={dayStartHour} endHour={dayEndHour} timeFormat={timeFormat} />
          </div>

          {/* 7 Columns for Days */}
          <div className="absolute left-[var(--gutter-width,64px)] right-0 top-0 bottom-0 flex">
            {days.map((day) => {
              // Filter events for this specific day
              const dayEvents = events.filter((e) => {
                if (e.is_all_day) {
                  return isSameDay(new Date(e.start_time), day);
                }
                const eStart = new Date(e.start_time);
                const eEnd = new Date(e.end_time);
                // Check if event overlaps with this day
                const dStart = new Date(day);
                dStart.setHours(0, 0, 0, 0);
                const dEnd = new Date(day);
                dEnd.setHours(23, 59, 59, 999);
                return eStart < dEnd && eEnd > dStart;
              });

              // Compute layout
              const layoutEvents = computeDayLayout(dayEvents, dayStartHour);

              return (
                <div
                  key={day.toISOString()}
                  className="flex-1 relative border-l border-border first:border-l-0"
                  onClick={(e) => {
                    if (!onEmptySlotClick) return;
                    if ((e.target as HTMLElement).closest('[data-event-card]')) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const totalMinutes = (y / HOUR_HEIGHT) * 60 + dayStartHour * 60;
                    const snapped = Math.round(totalMinutes / 15) * 15;
                    const clickTime = new Date(day);
                    clickTime.setHours(Math.floor(snapped / 60), snapped % 60, 0, 0);
                    onEmptySlotClick(clickTime);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const data = e.dataTransfer.getData('application/json');
                    if (data && onTaskDrop) {
                      try {
                        const task = JSON.parse(data);
                        if (task.id) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const y = e.clientY - rect.top;
                          const totalMinutes = (y / HOUR_HEIGHT) * 60 + dayStartHour * 60;
                          const snapped = Math.round(totalMinutes / 15) * 15;
                          const dropTime = new Date(day);
                          dropTime.setHours(Math.floor(snapped / 60), snapped % 60, 0, 0);
                          onTaskDrop(task, dropTime);
                        }
                      } catch (err) {
                        console.error('Failed to parse dropped task in week view', err);
                      }
                    }
                  }}
                >
                  {layoutEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => onEventClick?.(event)}
                      onComplete={onEventComplete}
                      onDragEnd={handleDragEnd}
                      onResizeEnd={handleResizeEnd}
                      isCompact={true}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
