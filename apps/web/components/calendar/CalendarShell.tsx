'use client';

import React, {
  useMemo,
  useCallback,
  useState,
  useImperativeHandle,
  forwardRef,
  type ReactNode,
} from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, isToday } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { createRbcHeaderComponent } from './CalendarHeader';
import CalendarToolbar, { WEEK_STARTS_ON } from './CalendarToolbar';
import RbcEventBlock from './RbcEventBlock';
import ScheduleView from './views/ScheduleView';
import YearView from './views/YearView';
import type { CalendarEvent, CalendarPreferences, CalendarView, ComposerAnchor } from '@/types/calendar';
import type { Task } from '@/types/tasks';
import type { ProIntegrationProvider } from '@/lib/integrations/types';
import { getEventColor } from '@/lib/calendar/eventColors';
import { Plus } from '@phosphor-icons/react';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }),
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

export interface CalendarShellHandle {
  scrollToNow: () => void;
}

interface CalendarShellProps {
  events: CalendarEvent[];
  preferences: CalendarPreferences;
  selectedDate: Date;
  activeView: CalendarView;
  onDateChange: (date: Date) => void;
  onViewChange: (view: CalendarView) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onEventComplete?: (id: string) => void;
  onCreateEvent?: (time?: Date, anchor?: ComposerAnchor) => void;
  onEventReschedule?: (eventId: string, newStart: Date, newEnd: Date) => void;
  onEventResize?: (eventId: string, newEnd: Date) => void;
  onTaskDrop?: (task: Task, time: Date) => void;
  onRangeChange?: (start: Date, end: Date) => void;
  draggedTask: Task | null;
  onDragTaskChange: (task: Task | null) => void;
  backlogPanel: ReactNode;
  backlogOpen: boolean;
  onToggleBacklog: () => void;
  backlogCount: number;
  connectedProviders: ProIntegrationProvider[];
  hiddenLayers: Set<string>;
  onToggleLayer: (provider: string) => void;
  googleConnected: boolean;
  googleLastSyncedAt: string | null;
  onSyncGoogle: () => void;
  onStartFresh: () => void;
  isProcessing: boolean;
  onNavigate: (direction: 'prev' | 'next') => void;
  onToday: () => void;
  onOpenShortcuts: () => void;
  onCreate: () => void;
}

const CalendarShell = forwardRef<CalendarShellHandle, CalendarShellProps>(
  function CalendarShell(
    {
      events,
      preferences,
      selectedDate,
      activeView,
      onDateChange,
      onViewChange,
      onEventClick,
      onCreateEvent,
      onEventReschedule,
      onEventResize,
      onTaskDrop,
      onRangeChange,
      draggedTask,
      onDragTaskChange,
      backlogPanel,
      backlogOpen,
      onToggleBacklog,
      backlogCount,
      connectedProviders,
      hiddenLayers,
      onToggleLayer,
      googleConnected,
      googleLastSyncedAt,
      onSyncGoogle,
      onStartFresh,
      isProcessing,
      onNavigate,
      onToday,
      onOpenShortcuts,
      onCreate,
    },
    ref
  ) {
    const [scrollToTime, setScrollToTime] = useState(() => new Date());

    const scrollToNow = useCallback(() => {
      setScrollToTime(new Date());
    }, []);

    useImperativeHandle(ref, () => ({ scrollToNow }), [scrollToNow]);

    const rbcEvents = useMemo(
      () =>
        events.map((ev) => ({
          id: ev.id,
          title: ev.title,
          start: new Date(ev.start_time),
          end: new Date(ev.end_time),
          allDay: ev.is_all_day,
          resource: ev,
        })),
      [events]
    );

    const handleEventDrop = useCallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({ event, start, end }: any) => {
        if (onEventReschedule && event.id) {
          onEventReschedule(event.id as string, start, end);
        }
      },
      [onEventReschedule]
    );

    const handleEventResize = useCallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({ event, end }: any) => {
        if (onEventResize && event.id) {
          onEventResize(event.id as string, end);
        }
      },
      [onEventResize]
    );

    const handleSelectSlot = useCallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({ start, box }: any) => {
        const anchor: ComposerAnchor | undefined = box
          ? { x: box.x, y: box.y, width: box.width, height: box.height }
          : undefined;
        onCreateEvent?.(start, anchor);
      },
      [onCreateEvent]
    );

    const rbcView = useMemo(() => {
      switch (activeView) {
        case 'day':
          return Views.DAY;
        case 'week':
          return Views.WEEK;
        case 'month':
          return Views.MONTH;
        default:
          return Views.WEEK;
      }
    }, [activeView]);

    const showRbc = activeView === 'day' || activeView === 'week' || activeView === 'month';

    const handleNavigate = (newDate: Date) => {
      onDateChange(newDate);
    };

    const headerComponent = useMemo(
      () => createRbcHeaderComponent(selectedDate, onDateChange),
      [selectedDate, onDateChange]
    );

    const eventComponent = useMemo(
      () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function EventComponent(props: any) {
          return (
            <RbcEventBlock
              {...props}
              timeFormat={preferences.time_format}
            />
          );
        },
      [preferences.time_format]
    );

    const components = useMemo(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const base: Record<string, React.ComponentType<any>> = {
        event: eventComponent,
      };
      if (activeView === 'week' || activeView === 'day') {
        base.header = headerComponent;
      }
      return base;
    }, [activeView, headerComponent, eventComponent]);

    const eventPropGetter = useCallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (event: any) => {
        const originalEv = event.resource as CalendarEvent;
        const colors = originalEv
          ? getEventColor(originalEv)
          : { bg: '#039BE5', text: '#ffffff', border: '#039BE5' };

        return {
          style: {
            backgroundColor: colors.bg,
            color: colors.text,
            borderRadius: '8px',
            border: 'none',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            transition: 'box-shadow 150ms ease, transform 150ms ease',
          },
        };
      },
      []
    );

    const minTime = new Date(1970, 1, 1, 0, 0, 0);
    const maxTime = new Date(1970, 1, 1, 23, 59, 59);

    const dragFromOutsideItem = useCallback(() => {
      if (!draggedTask) return undefined;
      const durationMs = (draggedTask.estimated_minutes || 60) * 60 * 1000;
      const start = new Date();
      return {
        title: draggedTask.title,
        start,
        end: new Date(start.getTime() + durationMs),
      };
    }, [draggedTask]);

    const handleDropFromOutside = useCallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({ start }: any) => {
        if (draggedTask && onTaskDrop) {
          onTaskDrop(draggedTask, start);
        }
        onDragTaskChange(null);
      },
      [draggedTask, onTaskDrop, onDragTaskChange]
    );

    const showNowButton =
      (activeView === 'day' || activeView === 'week') && isToday(selectedDate);

    return (
      <div className="flex flex-col h-full w-full bg-[var(--color-paper)] border border-[var(--color-line)] rounded-[22px] overflow-hidden shadow-sm transition-all">
        <CalendarToolbar
          selectedDate={selectedDate}
          activeView={activeView}
          onNavigate={onNavigate}
          onToday={() => {
            onToday();
            scrollToNow();
          }}
          onViewChange={onViewChange}
          connectedProviders={connectedProviders}
          hiddenLayers={hiddenLayers}
          onToggleLayer={onToggleLayer}
          googleConnected={googleConnected}
          googleLastSyncedAt={googleLastSyncedAt}
          onSyncGoogle={onSyncGoogle}
          onStartFresh={onStartFresh}
          isProcessing={isProcessing}
          backlogOpen={backlogOpen}
          onToggleBacklog={onToggleBacklog}
          backlogCount={backlogCount}
          onOpenShortcuts={onOpenShortcuts}
          onCreate={onCreate}
        />

        <div className="flex flex-1 min-h-0">
          <div className="flex-1 relative min-h-0 p-2 min-w-0 flex flex-col">
            {activeView === 'list' && onEventClick && (
              <ScheduleView
                events={events}
                selectedDate={selectedDate}
                timeFormat={preferences.time_format}
                onEventClick={onEventClick}
              />
            )}

            {activeView === 'year' && (
              <YearView
                events={events}
                selectedDate={selectedDate}
                onMonthClick={(monthStart) => {
                  onDateChange(monthStart);
                  onViewChange('month');
                }}
              />
            )}

            {showRbc && (
            <DnDCalendar
              localizer={localizer}
              events={rbcEvents}
              date={selectedDate}
              view={rbcView}
              onNavigate={handleNavigate}
              getDrilldownView={() => null}
              onRangeChange={(range: Date[] | { start: Date; end: Date }) => {
                if (!onRangeChange) return;
                if (Array.isArray(range)) {
                  if (range.length > 0) {
                    onRangeChange(range[0], range[range.length - 1]);
                  }
                } else {
                  onRangeChange(range.start, range.end);
                }
              }}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              onSelectSlot={handleSelectSlot}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onSelectEvent={(event: any) => onEventClick?.(event.resource)}
              selectable
              resizable
              step={15}
              timeslots={4}
              min={minTime}
              max={maxTime}
              eventPropGetter={eventPropGetter}
              components={components}
              toolbar={false}
              scrollToTime={scrollToTime}
              enableAutoScroll
              dragFromOutsideItem={
                dragFromOutsideItem as () => object
              }
              onDropFromOutside={handleDropFromOutside}
              style={{ height: '100%', width: '100%', flex: 1, minHeight: 0 }}
            />
            )}

            {showNowButton && (
              <button
                type="button"
                onClick={scrollToNow}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-[var(--color-ink)] text-[var(--color-cream)] text-xs font-mono font-bold uppercase tracking-wider shadow-md hover:bg-[var(--color-ink-2)] transition-colors"
              >
                Now
              </button>
            )}
          </div>

          {backlogOpen && (
            <div className="w-full sm:w-72 shrink-0 border-l border-[var(--color-line)] bg-[var(--color-cream)]/30 flex flex-col min-h-0 max-h-full">
              {backlogPanel}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onCreateEvent?.()}
          className="fixed bottom-8 right-8 z-50 w-14 h-14 rounded-full bg-[var(--color-ink)] hover:bg-[var(--color-ink-2)] text-[var(--color-cream)] shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
          aria-label="Add new event"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    );
  }
);

export default CalendarShell;
