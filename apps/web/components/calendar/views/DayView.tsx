'use client';

import { useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOTION } from '@/lib/calendar/motion';
import { computeDayLayout, pixelToTime } from '@/lib/calendar/layoutEngine';
import TimeGrid from '../timeline/TimeGrid';
import NowIndicator from '../timeline/NowIndicator';
import EventCard from '../cards/EventCard';
import type { CalendarEvent } from '@/types/calendar';
import { CloudSun } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  estimated_minutes?: number;
  energy_level_required?: string;
}

interface DayViewProps {
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
  onTaskDrop?: (task: Task, time: Date) => void;
}

const HOUR_HEIGHT = 72;

export default function DayView({
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
}: DayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const totalHeight = (dayEndHour - dayStartHour) * HOUR_HEIGHT;

  // Separate all-day and timed events
  const allDayEvents = events.filter((e) => e.is_all_day);
  const timedEvents = events.filter((e) => !e.is_all_day);

  // Compute layout positions for timed events
  const layoutEvents = useMemo(
    () => computeDayLayout(timedEvents, dayStartHour),
    [timedEvents, dayStartHour]
  );

  // Auto-scroll to "now" on mount
  useEffect(() => {
    if (!scrollRef.current) return;
    const now = new Date();
    const nowOffset =
      (now.getHours() + now.getMinutes() / 60 - dayStartHour) * HOUR_HEIGHT;
    // Position the now-line at roughly 1/3 from top
    const scrollTarget = Math.max(
      0,
      nowOffset - scrollRef.current.clientHeight / 3
    );
    scrollRef.current.scrollTo({ top: scrollTarget, behavior: 'smooth' });
  }, [dayStartHour]);

  // Handle clicking empty space to create a new event
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onEmptySlotClick) return;
    // Don't trigger if click came from a card
    if ((e.target as HTMLElement).closest('[data-event-card]')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalMinutes = (y / HOUR_HEIGHT) * 60 + dayStartHour * 60;
    const snapped = Math.round(totalMinutes / 15) * 15;
    const clickTime = new Date(date);
    clickTime.setHours(Math.floor(snapped / 60), snapped % 60, 0, 0);
    onEmptySlotClick(clickTime);
  };

  // Handle drag-to-reschedule
  const handleDragEnd = useCallback(
    (eventId: string, _deltaX: number, deltaY: number) => {
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

      // Ensure the event doesn't shrink below 15 minutes
      const start = new Date(event.start_time);
      if (newEnd.getTime() - start.getTime() < 15 * 60 * 1000) {
        return;
      }

      onEventResize(eventId, newEnd);
    },
    [events, onEventResize]
  );

  // Find gaps between events for "What's next?" prompts
  const gaps = useMemo(() => {
    if (timedEvents.length === 0) return [];
    const sorted = [...timedEvents].sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    const result: { top: number; height: number }[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const endCurrent = new Date(sorted[i].end_time);
      const startNext = new Date(sorted[i + 1].start_time);
      const gapMinutes =
        (startNext.getTime() - endCurrent.getTime()) / (1000 * 60);
      if (gapMinutes >= 30) {
        const gapTop =
          (endCurrent.getHours() +
            endCurrent.getMinutes() / 60 -
            dayStartHour) *
          HOUR_HEIGHT;
        const gapHeight = (gapMinutes / 60) * HOUR_HEIGHT;
        result.push({ top: gapTop, height: gapHeight });
      }
    }
    return result;
  }, [timedEvents, dayStartHour]);

  return (
    <motion.div
      key={date.toDateString()}
      {...MOTION.viewSwitch}
      className="flex flex-col h-full"
    >
      {/* All-day events strip */}
      {allDayEvents.length > 0 && (
        <div className="border-b border-surface-200 px-4 py-2.5 space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            All Day
          </span>
          {allDayEvents.map((event) => (
            <div
              key={event.id}
              onClick={() => onEventClick?.(event)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-surface-100 transition-colors"
              style={{
                borderLeft: `3px solid ${getSourceColorInline(event.source)}`,
              }}
            >
              {event.icon && <span className="text-sm">{event.icon}</span>}
              <span className="text-sm font-semibold text-foreground truncate">
                {event.title}
              </span>
              <span className="text-[9px] font-bold uppercase text-muted-foreground ml-auto shrink-0">
                {event.source.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Scrollable timeline area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative"
        style={{ scrollbarWidth: 'none' }}
      >
        <div
          className="relative"
          style={{
            height: `${totalHeight}px`,
            paddingLeft: 'var(--gutter-width, 64px)', // gutter for time labels
          }}
          onClick={handleTimelineClick}
          onDragOver={(e) => {
            // Only allow drops that are tasks
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => {
            e.preventDefault();
            const data = e.dataTransfer.getData('application/json');
            if (data && onTaskDrop) {
              try {
                const task = JSON.parse(data);
                if (task.id) { // Simple validation
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const time = pixelToTime(y, dayStartHour, date);
                  onTaskDrop(task, time);
                }
              } catch (err: unknown) {
                console.error('Failed to parse dropped task', err as Error);
              }
            }
          }}
        >
          {/* Time grid — labels, rail, gridlines */}
          <div
            style={{
              position: 'absolute',
              left: '64px',
              right: '0',
              top: 0,
              bottom: 0,
            }}
          >
            <TimeGrid
              startHour={dayStartHour}
              endHour={dayEndHour}
              timeFormat={timeFormat}
            />
          </div>

          {/* Now indicator */}
          <div
            style={{
              position: 'absolute',
              left: '64px',
              right: '0',
              top: 0,
              bottom: 0,
            }}
          >
            <NowIndicator
              dayStartHour={dayStartHour}
              hourHeight={HOUR_HEIGHT}
            />
          </div>

          {/* Gap prompts — "Interval over. What's next?" */}
          {gaps.map((gap, i) => (
            <div
              key={`gap-${i}`}
              className="absolute flex items-center justify-center pointer-events-none"
              style={{
                left: '80px',
                right: '16px',
                top: `${gap.top + gap.height / 2 - 10}px`,
              }}
            >
              <span className="text-[11px] text-muted-foreground/50 italic select-none">
                Interval over. What&apos;s next?
              </span>
            </div>
          ))}

          {/* Event cards */}
          <div
            className="absolute top-0 bottom-0"
            style={{ left: 'calc(var(--gutter-width, 64px) + 16px)', right: '8px' }}
            data-event-container
          >
            <AnimatePresence mode="popLayout">
              {layoutEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={
                    onEventClick ? () => onEventClick(event) : undefined
                  }
                  onComplete={onEventComplete}
                  onDragEnd={handleDragEnd}
                  onResizeEnd={handleResizeEnd}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Empty state overlay — Floating capsule style */}
      <AnimatePresence>
        {events.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-none z-10 w-full max-w-sm px-4"
          >
            <div className="bg-card/90 backdrop-blur-xl p-6 rounded-[32px] border border-border shadow-2xl flex flex-col items-center text-center pointer-events-auto">
              <div className="w-12 h-12 bg-brand-500/20 rounded-2xl flex items-center justify-center mb-4">
                <CloudSun className="w-6 h-6 text-brand-500" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-foreground mb-1">
                Nothing scheduled yet
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your timeline is wide open. Tap anywhere or hit the <span className="text-brand-500 font-bold">+</span> to add your first task.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Inline helper to avoid import cycle
function getSourceColorInline(source: string): string {
  const map: Record<string, string> = {
    manual: 'var(--color-manual)',
    google_calendar: 'var(--color-google)',
    canvas: 'var(--color-canvas)',
    blueprint: 'var(--color-blueprint)',
    schedule: 'var(--color-ollie)',
    cargo_bay: 'var(--color-cargo)',
    focus_block: 'var(--color-focus)',
    rollover: 'var(--color-rollover)',
  };
  return map[source] || 'var(--color-manual)';
}
