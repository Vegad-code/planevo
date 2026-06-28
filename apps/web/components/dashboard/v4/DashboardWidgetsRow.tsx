'use client';

import { useEffect, useMemo, useState } from 'react';
import { endOfMonth, startOfMonth } from 'date-fns';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { getDayCompletionStats } from '@/lib/dashboard/day-progress';
import type { ParsedScheduleBlock } from '@/lib/dashboard/types';
import type { CalendarEvent } from '@/types/calendar';
import type { Task } from '@/types/tasks';
import { DashboardMonthCalendar } from '@/components/dashboard/v4/DashboardMonthCalendar';
import { DashboardDayProgress } from '@/components/dashboard/v4/DashboardDayProgress';

interface DashboardInsightsRowProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  parsedSchedule: ParsedScheduleBlock[] | null;
  weekEvents: CalendarEvent[];
  tasks: Task[];
}

export function DashboardInsightsRow({
  selectedDate,
  onSelectDate,
  parsedSchedule,
  weekEvents,
  tasks,
}: DashboardInsightsRowProps) {
  const { events: monthEvents, loadEvents } = useCalendarEvents();
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selectedDate));
  const [monthLoading, setMonthLoading] = useState(true);

  useEffect(() => {
    const start = startOfMonth(visibleMonth);
    const end = endOfMonth(visibleMonth);
    let cancelled = false;

    const load = async () => {
      setMonthLoading(true);
      await loadEvents(start, end, true);
      if (!cancelled) setMonthLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [visibleMonth, loadEvents]);

  const mergedEvents = useMemo(() => {
    const map = new Map<string, CalendarEvent>();
    for (const event of weekEvents) {
      map.set(event.id, event);
    }
    for (const event of monthEvents) {
      map.set(event.id, event);
    }
    return Array.from(map.values());
  }, [weekEvents, monthEvents]);

  const stats = useMemo(
    () => getDayCompletionStats(selectedDate, parsedSchedule, mergedEvents, tasks),
    [selectedDate, parsedSchedule, mergedEvents, tasks],
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <DashboardMonthCalendar
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        visibleMonth={visibleMonth}
        onVisibleMonthChange={setVisibleMonth}
        events={mergedEvents}
        tasks={tasks}
        loading={monthLoading}
      />
      <DashboardDayProgress stats={stats} />
    </div>
  );
}

/** @deprecated Use DashboardInsightsRow */
export const DashboardWidgetsRow = DashboardInsightsRow;
