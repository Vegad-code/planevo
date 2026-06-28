'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, startOfDay } from 'date-fns';
import { Clock, X } from '@phosphor-icons/react';
import { useRegisterBrunoContext } from '@/components/bruno/BrunoProvider';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useTaskActions } from '@/hooks/useTaskActions';
import { useUserProfile } from '@/components/providers/UserProfileProvider';
import { useSupabaseTableRealtime } from '@/hooks/useSupabaseTableRealtime';
import EventDialog from '@/components/calendar/dialogs/EventDialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { CalendarEvent } from '@/types/calendar';
import type { Task } from '@/types/tasks';
import { DashboardHeader } from '@/components/dashboard/home/DashboardHeader';
import { WeekStrip } from '@/components/dashboard/home/WeekStrip';
import { DashboardHero } from '@/components/dashboard/home/DashboardHero';
import { DashboardEmptyState } from '@/components/dashboard/home/DashboardEmptyState';
import { DashboardHomePreview } from '@/components/dashboard/home/DashboardHomePreview';
import { DashboardAlerts } from '@/components/dashboard/home/DashboardAlerts';
import { DashboardSkeleton } from '@/components/dashboard/home/DashboardSkeleton';
import { DashboardInsightsRow } from '@/components/dashboard/v4/DashboardWidgetsRow';

export default function DashboardPage() {
  useRegisterBrunoContext({
    source: 'dashboard',
    page: '/dashboard',
    label: 'Dashboard',
  });

  const router = useRouter();
  const { userId } = useUserProfile();
  const data = useDashboardData();
  useSupabaseTableRealtime({
    userId,
    tables: ['tasks', 'calendar_events'],
    onChange: data.refresh,
  });
  const { toggleComplete } = useTaskActions({
    onRefresh: data.refresh,
    setTasks: data.setTasks,
  });
  const { updateEvent, deleteEvent } = useCalendarEvents();

  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [selectedEventModal, setSelectedEventModal] = useState<CalendarEvent | null>(null);
  const [selectedTaskModal, setSelectedTaskModal] = useState<Task | null>(null);

  const eventDates = useMemo(
    () => data.thisWeekEvents.map((e) => new Date(e.start_time)),
    [data.thisWeekEvents]
  );

  const handleOverdueAlert = (alertId: string) => {
    const taskId = alertId.replace('overdue-', '');
    const task = data.tasks.find((t) => t.id === taskId);
    if (task) setSelectedTaskModal(task);
  };

  if (data.loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="animate-in fade-in duration-500 pb-12">
      <DashboardHeader
        userName={data.userName}
        timeOfDay={data.timeOfDay}
        blockCount={data.parsedSchedule?.length ?? 0}
        mode={data.mode}
        nextAction={data.nextAction}
        openTaskCount={data.openTasks.length}
        priorityAlerts={data.priorityAlerts}
        connections={data.connections}
      />

      <DashboardHero
        mode={data.mode}
        nextAction={data.nextAction}
        upNextBlocks={data.upNextBlocks}
      />

      <WeekStrip
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        eventDates={eventDates}
      />

      <DashboardEmptyState
        mode={data.mode}
        setupSteps={data.setupSteps}
        unscheduledTasks={data.unscheduledTasks}
      />

      <DashboardHomePreview
        mode={data.mode}
        selectedDate={selectedDate}
        tasks={data.tasks}
        parsedSchedule={data.parsedSchedule}
        weekEvents={data.thisWeekEvents}
        canvasAssignments={data.canvasAssignments}
        workItems={data.workItems}
        onViewTask={setSelectedTaskModal}
        onViewEvent={setSelectedEventModal}
        onToggleComplete={toggleComplete}
      />

      {data.priorityAlerts.length > 0 && (
        <DashboardAlerts
          alerts={data.priorityAlerts}
          onOverdueTaskClick={handleOverdueAlert}
        />
      )}

      <DashboardInsightsRow
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        parsedSchedule={data.parsedSchedule}
        weekEvents={data.thisWeekEvents}
        tasks={data.tasks}
      />

      <EventDialog
        isOpen={!!selectedEventModal}
        onOpenChange={(open) => !open && setSelectedEventModal(null)}
        event={selectedEventModal}
        onSave={async (id, updates) => {
          await updateEvent(id, updates);
          data.setThisWeekEvents((prev) =>
            prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
          );
          setSelectedEventModal(null);
        }}
        onDelete={async (id) => {
          await deleteEvent(id);
          data.setThisWeekEvents((prev) => prev.filter((e) => e.id !== id));
          setSelectedEventModal(null);
        }}
      />

      <Dialog
        open={!!selectedTaskModal}
        onOpenChange={(open) => !open && setSelectedTaskModal(null)}
      >
        <DialogContent className="p-0 overflow-hidden sm:max-w-105 bg-(--color-paper) border-line shadow-2xl rounded-3xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-(--color-rose)">●</span>
                <span className="font-mono text-[11px] text-(--color-ink-soft) tracking-wide">
                  OPEN TASK
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskModal(null)}
                aria-label="Close task modal"
                className="p-1.5 rounded-full hover:bg-(--color-cream-2) text-(--color-ink-soft) transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            <h2 className="text-2xl font-bold text-(--color-ink) mb-2">
              {selectedTaskModal?.title}
            </h2>
            {selectedTaskModal?.due_date && (
              <div className="text-[13px] text-(--color-ink-soft) mb-6 flex items-center gap-1.5">
                <Clock className="size-4" />
                Due {format(new Date(selectedTaskModal.due_date), 'MMM d, yyyy h:mm a')}
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  const id = selectedTaskModal?.id;
                  setSelectedTaskModal(null);
                  if (id) router.push(`/dashboard/deep-work?taskId=${id}`);
                }}
                className="flex-1 bg-(--color-ink) text-(--color-paper) py-2.5 rounded-full text-sm font-bold tracking-wide hover:opacity-90 transition-opacity cursor-pointer"
              >
                Focus on Task
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
