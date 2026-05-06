'use client';

import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
} from 'date-fns';

type CalendarView = 'day' | 'week' | 'month' | 'list';

interface CalendarHeaderProps {
  selectedDate: Date;
  activeView: CalendarView;
  onDateChange: (date: Date) => void;
  onViewChange: (view: CalendarView) => void;
}

const views: { key: CalendarView; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'list', label: 'List' },
];

export default function CalendarHeader({
  selectedDate,
  activeView,
  onDateChange,
  onViewChange,
}: CalendarHeaderProps) {
  // Navigate prev/next based on active view
  const navigate = (direction: 'prev' | 'next') => {
    const delta = direction === 'next' ? 1 : -1;
    switch (activeView) {
      case 'day':
        onDateChange(addDays(selectedDate, delta));
        break;
      case 'week':
        onDateChange(addDays(selectedDate, delta * 7));
        break;
      case 'month':
        const newMonth = new Date(selectedDate);
        newMonth.setMonth(newMonth.getMonth() + delta);
        onDateChange(newMonth);
        break;
      case 'list':
        onDateChange(addDays(selectedDate, delta));
        break;
    }
  };

  // Date strip — horizontal mini-calendar for the current week
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Format the header date text
  const headerText = (() => {
    switch (activeView) {
      case 'day':
        return (
          <>
            <span className="sm:hidden font-black">{format(selectedDate, 'MMM d')}</span>
            <span className="hidden sm:inline">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
          </>
        );
      case 'week':
        return (
          <>
            <span className="sm:hidden font-black">{format(weekStart, 'MMM d')} - {format(weekEnd, 'd')}</span>
            <span className="hidden sm:inline">{format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}</span>
          </>
        );
      case 'month':
        return format(selectedDate, 'MMMM yyyy');
      case 'list':
        return 'Upcoming';
    }
  })();

  return (
    <div className="space-y-3">
      {/* Top bar: date nav + view switcher */}
      <div className="flex items-center justify-between gap-4">
        {/* Left: Nav arrows + date label */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('prev')}
            className="p-2 rounded-xl hover:bg-surface-100 transition-colors text-foreground"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              if (!isToday(selectedDate)) onDateChange(new Date());
            }}
            className="text-lg font-bold text-foreground hover:text-brand-500 transition-colors select-none"
            title="Jump to today"
          >
            {headerText}
          </button>

          <button
            onClick={() => navigate('next')}
            className="p-2 rounded-xl hover:bg-surface-100 transition-colors text-foreground"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {!isToday(selectedDate) && (
            <button
              onClick={() => onDateChange(new Date())}
              className="ml-2 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-brand-500/10 text-brand-600 hover:bg-brand-500/20 transition-colors"
            >
              Today
            </button>
          )}
        </div>

        {/* Right: View switcher — segmented control with sliding pill */}
        <div className="flex bg-surface-100 p-1 rounded-xl border border-surface-200 relative">
          {views.map((view) => (
            <button
              key={view.key}
              onClick={() => onViewChange(view.key)}
              className={`
                relative z-10 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors
                ${activeView === view.key
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              {activeView === view.key && (
                <motion.div
                  layoutId="calendar-view-pill"
                  className="absolute inset-0 bg-card shadow-sm rounded-lg border border-surface-200"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{view.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Date strip — Structured-style horizontal week view */}
      {activeView === 'day' && (
        <div className="flex items-center gap-1 px-1">
          {weekDays.map((day) => {
            const selected = isSameDay(day, selectedDate);
            const today = isToday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => onDateChange(day)}
                className={`
                  flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all
                  ${selected
                    ? 'bg-brand-500 text-white shadow-md'
                    : today
                      ? 'bg-brand-500/10 text-brand-600 hover:bg-brand-500/20'
                      : 'hover:bg-surface-100 text-foreground'
                  }
                `}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wide ${selected ? 'text-white/80' : 'text-muted-foreground'}`}>
                  {format(day, 'EEE')}
                </span>
                <span className={`text-base font-black ${selected ? 'text-white' : ''}`}>
                  {format(day, 'd')}
                </span>

                {/* Activity dots placeholder */}
                <div className="flex gap-0.5 mt-0.5">
                  {/* These could be populated from event counts per day */}
                  {today && !selected && (
                    <div className="w-1 h-1 rounded-full bg-brand-500" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
