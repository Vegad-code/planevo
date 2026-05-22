'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Task, TaskPriority, BestTimeOfDay } from '@/types/tasks';
import { TIME_OF_DAY_INFO, formatDuration } from '@/lib/taskHelpers';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onDelete: (taskId: string) => void;
  onReschedule: (taskId: string) => void;
  onBreakDown?: (taskId: string) => void;
  onMoveToWaiting?: (taskId: string) => void;
  onFocus?: (task: Task) => void;
  isJustOneThingMode?: boolean;
  showCompletionToast?: (message: string) => void;
}

const TaskCard = React.memo(function TaskCard({
  task,
  onToggleComplete,
  onDelete,
  onReschedule,
  onBreakDown,
  onMoveToWaiting,
  onFocus,
  isJustOneThingMode = false,
  showCompletionToast,
}: TaskCardProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [swipeX, setSwipeX] = useState(0);

  const handleComplete = useCallback(() => {
    if (isCompleting) return;
    setIsCompleting(true);

    // Trigger completion after animation
    setTimeout(() => {
      onToggleComplete(task.id, !!task.completed);
      if (!task.completed && showCompletionToast) {
        const messages = ['Nice work! 🌱', 'You got this! ⚡', 'One step closer! 🎉', 'Crushed it! 🌱', 'Keep growing! 🌱'];
        showCompletionToast(messages[Math.floor(Math.random() * messages.length)]);
      }
      setIsCompleting(false);
    }, task.completed ? 100 : 400);
  }, [task.id, task.completed, isCompleting, onToggleComplete, showCompletionToast]);

  // Format due date to compact representation, e.g. "Mon"
  const getDueString = (dateStr: string | null | undefined): string | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    if (d.toDateString() === today.toDateString()) {
      return 'today';
    }
    if (d.toDateString() === tomorrow.toDateString()) {
      return 'tomorrow';
    }
    
    // Short weekday name
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[d.getDay()];
  };

  const getSourceLabel = (url: string | null | undefined): string => {
    if (!url) return 'Personal';
    if (url.includes('canvas') || url.includes('instructure')) return 'Canvas';
    if (url.includes('calendar') || url.includes('google.com/calendar')) return 'Calendar';
    return 'Personal';
  };

  const sourceLabel = getSourceLabel(task.external_url);
  const dueString = getDueString(task.due_date);
  const durationLabel = formatDuration(task.estimated_minutes ?? null);

  const timeInfo = (task.best_time_of_day && TIME_OF_DAY_INFO[task.best_time_of_day as BestTimeOfDay]) 
    ? TIME_OF_DAY_INFO[task.best_time_of_day as BestTimeOfDay] 
    : null;

  // Custom priority pill formatting
  const renderPriorityBadge = () => {
    const priority = task.priority as TaskPriority || 'medium';
    
    let colorClasses = '';
    if (priority === 'critical') {
      colorClasses = 'bg-red-50 text-red-700 border border-red-200';
    } else if (priority === 'high') {
      colorClasses = 'bg-[var(--color-rose-soft)]/20 text-[var(--color-rose)] border border-[var(--color-rose)]/25';
    } else if (priority === 'medium') {
      colorClasses = 'bg-[var(--color-honey-soft)]/20 text-[var(--color-honey)] border border-[var(--color-honey)]/25';
    } else {
      colorClasses = 'bg-[var(--color-sage-soft)]/20 text-[var(--color-sage)] border border-[var(--color-sage)]/25';
    }

    return (
      <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-[4px] uppercase shrink-0 ${colorClasses}`}>
        {priority}
      </span>
    );
  };

  if (isJustOneThingMode) {
    // Large single-card mode styling for widgets
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-[var(--color-paper)] border border-[var(--color-line-strong)] rounded-[22px] shadow-sm relative group"
      >
        <div className="flex items-start gap-4">
          <button
            onClick={handleComplete}
            className={`w-6 h-6 mt-1 shrink-0 border flex items-center justify-center cursor-pointer transition-colors rounded-[8px] ${
              task.completed 
                ? 'bg-[var(--color-ink)] border-[var(--color-ink)] text-[var(--color-paper)]' 
                : 'border-[var(--color-line-strong)] hover:border-[var(--color-ink)]'
            }`}
          >
            {task.completed && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <h3 className={`text-xl font-medium leading-snug ${task.completed ? 'line-through text-[var(--color-ink-soft)]/60' : 'text-[var(--color-ink)]'}`}>
              {task.title}
            </h3>
            {task.description && (
              <p className="text-sm text-[var(--color-ink-soft)] mt-1">{task.description}</p>
            )}
            <div className="flex items-center gap-3 mt-4 text-xs text-[var(--color-ink-soft)]/75 font-mono">
              <span>{sourceLabel}</span>
              {dueString && <span>• due {dueString}</span>}
              {durationLabel && <span>• {durationLabel}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {renderPriorityBadge()}
          </div>
        </div>
      </motion.div>
    );
  }

  // Standard row-based styling for Tasks lists
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{
        opacity: isCompleting && !task.completed ? 0.4 : 1,
        y: 0,
        height: 'auto',
      }}
      exit={{ opacity: 0, height: 0, padding: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="relative group border-t border-[var(--color-line)]/50 first:border-t-0 last:rounded-b-[19px]"
      onContextMenu={(e) => {
        e.preventDefault();
        setShowContextMenu(true);
      }}
    >
      {/* Swipe hint background */}
      {swipeX > 40 && (
        <div className="absolute inset-0 flex items-center justify-end pr-4 bg-[var(--color-honey-soft)]/5">
          <span className="text-[10px] font-mono text-[var(--color-honey)] uppercase tracking-widest">Reschedule →</span>
        </div>
      )}

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 120 }}
        dragElastic={0.15}
        onDrag={(_, info) => setSwipeX(info.offset.x)}
        onDragEnd={(_, info) => {
          if (info.offset.x > 85) {
            onReschedule(task.id);
          }
          setSwipeX(0);
        }}
        style={{ x: 0 }}
        className={`
          relative flex items-center justify-between gap-3 px-4 py-3.5
          bg-transparent transition-colors duration-150
          hover:bg-[var(--color-cream)]/20
          ${task.is_ai_suggested ? 'bg-[var(--color-honey-soft)]/5' : ''}
          group-last:rounded-b-[19px]
        `}
      >
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          {/* Left: Custom Checkbox */}
          <button
            onClick={handleComplete}
            aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
            className={`
              w-5 h-5 shrink-0 border flex items-center justify-center
              transition-all duration-150 ease-in-out cursor-pointer rounded-[6px]
              ${task.completed
                ? 'bg-transparent border-[var(--color-line-strong)] text-[var(--color-sage)]'
                : 'border-[var(--color-line-strong)]/80 hover:border-[var(--color-ink)] text-transparent'
              }
            `}
          >
            <AnimatePresence>
              {(task.completed || isCompleting) && (
                <motion.svg
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.12 }}
                  width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </motion.svg>
              )}
            </AnimatePresence>
          </button>

          {/* Center: Title & Metadata */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`
                  text-sm sm:text-[15px] font-medium leading-snug truncate
                  ${task.completed ? 'line-through text-[var(--color-ink-soft)]/60' : 'text-[var(--color-ink)]'}
                `}
              >
                {task.title}
              </span>
            </div>

            {/* Metadata line: e.g. • Canvas due · Mon today ~90m */}
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5 text-xs text-[var(--color-ink-soft)]/75">
              <span className="font-medium text-[var(--color-ink-soft)]/90">• {sourceLabel}</span>
              {dueString && (
                <>
                  <span className="text-[var(--color-line)]">·</span>
                  <span>due {dueString}</span>
                </>
              )}
              {durationLabel && (
                <>
                  <span className="text-[var(--color-line)]">·</span>
                  <span>~{durationLabel}</span>
                </>
              )}
              {(task.is_ai_suggested || (task.rescheduled_count ?? 0) > 0) && (
                <>
                  <span className="text-[var(--color-line)]">·</span>
                  <span className="text-[9px] font-bold text-[var(--color-honey)] uppercase tracking-wider">
                    MOVED BY BRUNO
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Priority pill + Actions menu */}
        <div className="flex items-center gap-3 shrink-0">
          {renderPriorityBadge()}

          {/* Triple-dot menu button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowContextMenu((prev) => !prev);
            }}
            className="text-[var(--color-ink-soft)]/60 hover:text-[var(--color-ink)] transition-colors p-1 cursor-pointer"
            aria-label="More options"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              <circle cx="6" cy="12" r="1.5" fill="currentColor" />
              <circle cx="18" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </button>
        </div>
      </motion.div>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {showContextMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowContextMenu(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-2 top-full mt-1 z-50 w-52 bg-[var(--color-paper)] border border-[var(--color-line-strong)] rounded-[16px] shadow-xl py-1.5"
            >
              {onFocus && (
                <button
                  onClick={() => { onFocus(task); setShowContextMenu(false); }}
                  className="w-full text-left px-4 py-2 text-xs text-[var(--color-ink)] font-medium hover:bg-[var(--color-cream)]/20 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                  Focus on this
                </button>
              )}
              {onBreakDown && (
                <button
                  onClick={() => { onBreakDown(task.id); setShowContextMenu(false); }}
                  className="w-full text-left px-4 py-2 text-xs text-[var(--color-ink)] hover:bg-[var(--color-cream)]/20 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="6" y1="3" x2="6" y2="15" />
                    <circle cx="18" cy="6" r="3" />
                    <circle cx="6" cy="18" r="3" />
                    <path d="M18 9a9 9 0 01-9 9" />
                  </svg>
                  Ask Bruno to break down
                </button>
              )}
              <button
                onClick={() => { onReschedule(task.id); setShowContextMenu(false); }}
                className="w-full text-left px-4 py-2 text-xs text-[var(--color-ink)] hover:bg-[var(--color-cream)]/20 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                </svg>
                Reschedule...
              </button>
              {onMoveToWaiting && (
                <button
                  onClick={() => { onMoveToWaiting(task.id); setShowContextMenu(false); }}
                  className="w-full text-left px-4 py-2 text-xs text-[var(--color-ink)] hover:bg-[var(--color-cream)]/20 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="10" y1="12" x2="14" y2="12" />
                  </svg>
                  Move to Backlog
                </button>
              )}
              <div className="border-t border-[var(--color-line)] my-1" />
              <button
                onClick={() => { onDelete(task.id); setShowContextMenu(false); }}
                className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-500/10 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Delete
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default TaskCard;
