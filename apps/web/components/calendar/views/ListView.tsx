'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, isSameDay } from 'date-fns';
import { MOTION } from '@/lib/calendar/motion';
import EventCard from '../cards/EventCard';
import type { CalendarEvent } from '@/types/calendar';

interface ListViewProps {
  date: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onEventComplete?: (id: string) => void;
}

export default function ListView({
  date,
  events,
  onEventClick,
  onEventComplete,
}: ListViewProps) {
  // Group events by day
  const groupedEvents = useMemo(() => {
    // Sort all events by start time first
    const sorted = [...events].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    const groups: { day: Date; events: CalendarEvent[] }[] = [];
    
    sorted.forEach((event) => {
      const eventDate = new Date(event.start_time);
      const existingGroup = groups.find((g) => isSameDay(g.day, eventDate));
      
      if (existingGroup) {
        existingGroup.events.push(event);
      } else {
        groups.push({ day: eventDate, events: [event] });
      }
    });

    return groups;
  }, [events]);

  if (groupedEvents.length === 0) {
    return (
      <motion.div
        key="list-empty"
        {...MOTION.viewSwitch}
        className="flex flex-col items-center justify-center h-full text-center p-8 bg-[var(--color-paper)]"
      >
        <div className="w-16 h-16 rounded-full bg-[var(--color-cream-2)] flex items-center justify-center mb-4">
          <span className="text-2xl">🌴</span>
        </div>
        <h3 className="text-xl font-bold text-[var(--color-ink)] mb-2">No upcoming events</h3>
        <p className="text-[var(--color-ink-soft)] max-w-sm">
          Your schedule is clear for the next 30 days. Enjoy the whitespace.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={date.toDateString()}
      {...MOTION.viewSwitch}
      className="flex flex-col h-full overflow-y-auto bg-[var(--color-paper)]"
      style={{ scrollbarWidth: 'none' }}
    >
      <div className="p-6 max-w-3xl mx-auto w-full space-y-10">
        {groupedEvents.map((group) => (
          <div key={group.day.toISOString()} className="space-y-4">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-ink-faint)] border-b border-[var(--color-line)] pb-2 sticky top-0 bg-[var(--color-paper)] z-10">
              {format(group.day, 'EEEE, MMMM do')}
            </h2>
            <div className="space-y-3">
              {group.events.map((event) => (
                <div key={event.id} className="relative h-auto min-h-[96px]">
                  <EventCard
                    event={{ ...event, top: 0, height: 96, column: 0, totalColumns: 1 }}
                    onClick={() => onEventClick?.(event)}
                    onComplete={onEventComplete}
                    style={{ position: 'relative', top: 'auto', left: 'auto', width: '100%', height: 'auto', minHeight: '96px' }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
