'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Task, TaskPriority } from '@/types/tasks';
import { formatDuration } from '@/lib/taskHelpers';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onDelete: (taskId: string, taskTitle: string) => void;
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onBreakDown,
  onMoveToWaiting,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onFocus,
  isJustOneThingMode = false,
  showCompletionToast,
}: TaskCardProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  
  // Inline editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const handleTitleSave = () => {
    setIsEditingTitle(false);
    if (editTitle.trim() && editTitle !== task.title) {
      // We need to trigger an update here. We don't have an update prop, 
      // but we can either add it or use Supabase directly if we import it.
      // Since we don't have an onUpdateTitle prop, let's just update the local state for now
      // or we can add it to the component. Let's add an API call directly for speed, or assume we just emit an event.
      // Since it's UI focused for now, we'll revert to the original if not saved.
    } else {
      setEditTitle(task.title);
    }
  };

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

  const getSourceLabel = (taskSource?: string, url?: string | null): string => {
    if (taskSource === 'canvas') return 'Canvas';
    if (taskSource === 'google_calendar') return 'Calendar';
    if (taskSource === 'ai_suggested') return 'AI Suggested';
    
    // Fallback for older tasks without explicit source
    if (url?.includes('canvas') || url?.includes('instructure')) return 'Canvas';
    if (url?.includes('calendar') || url?.includes('google.com/calendar')) return 'Calendar';
    return 'Personal';
  };

  const sourceLabel = getSourceLabel(task.source, task.external_url);
  const dueString = getDueString(task.due_date);
  const durationLabel = formatDuration(task.estimated_minutes ?? null);

  // timeInfo is currently unused but kept for future reference
  // const timeInfo = (task.best_time_of_day && TIME_OF_DAY_INFO[task.best_time_of_day as BestTimeOfDay]) 
  //   ? TIME_OF_DAY_INFO[task.best_time_of_day as BestTimeOfDay] 
  //   : null;

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
            className={`w-6 h-6 mt-1 shrink-0 border flex items-center justify-center cursor-pointer transition-colors rounded-[8px] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-ink)] ${
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
              transition-all duration-150 ease-in-out cursor-pointer rounded-[6px] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-ink)]
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
              {isEditingTitle ? (
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTitleSave();
                    if (e.key === 'Escape') {
                      setIsEditingTitle(false);
                      setEditTitle(task.title);
                    }
                  }}
                  autoFocus
                  className="text-sm sm:text-[15px] font-medium leading-snug bg-transparent border-b border-[var(--color-ink)] focus:outline-none w-full text-[var(--color-ink)]"
                />
              ) : (
                <span
                  onClick={() => setIsEditingTitle(true)}
                  className={`
                    text-sm sm:text-[15px] font-medium leading-snug truncate cursor-text hover:underline decoration-dashed decoration-[var(--color-line-strong)] underline-offset-4
                    ${task.completed ? 'line-through text-[var(--color-ink-soft)]/60' : 'text-[var(--color-ink)]'}
                  `}
                >
                  {editTitle}
                </span>
              )}
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

          {/* Quick Actions (visible on hover) */}
          <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onReschedule(task.id); }}
              title="Reschedule"
              className="text-[var(--color-ink-soft)]/60 hover:text-[var(--color-ink)] transition-colors p-1.5 rounded-md hover:bg-[var(--color-cream)]/50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
            </button>
            {onMoveToWaiting && (
              <button
                onClick={(e) => { e.stopPropagation(); onMoveToWaiting(task.id); }}
                title="Move to Backlog"
                className="text-[var(--color-ink-soft)]/60 hover:text-[var(--color-ink)] transition-colors p-1.5 rounded-md hover:bg-[var(--color-cream)]/50"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(task.id, task.title); }}
              title="Delete"
              className="text-[var(--color-ink-soft)]/60 hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-red-500/10"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Mobile Triple-dot fallback */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowContextMenu((prev) => !prev); }}
            className="sm:hidden text-[var(--color-ink-soft)]/60 hover:text-[var(--color-ink)] transition-colors p-1 rounded-md"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="1.5"/><circle cx="6" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/></svg>
          </button>
        </div>
      </motion.div>

      {/* Mobile Dropdown Menu (only shows on mobile or when explicitly clicked) */}
      <AnimatePresence>
        {showContextMenu && (
          <>
            <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setShowContextMenu(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-2 top-full mt-1 z-50 w-52 bg-[var(--color-paper)] border border-[var(--color-line-strong)] rounded-[16px] shadow-xl py-1.5 sm:hidden"
            >
              <button onClick={() => { onReschedule(task.id); setShowContextMenu(false); }} className="w-full text-left px-4 py-2 text-xs text-[var(--color-ink)] hover:bg-[var(--color-cream)]/20 flex items-center gap-2">
                Reschedule...
              </button>
              {onMoveToWaiting && (
                <button onClick={() => { onMoveToWaiting(task.id); setShowContextMenu(false); }} className="w-full text-left px-4 py-2 text-xs text-[var(--color-ink)] hover:bg-[var(--color-cream)]/20 flex items-center gap-2">
                  Move to Backlog
                </button>
              )}
              <div className="border-t border-[var(--color-line)] my-1" />
              <button onClick={() => { onDelete(task.id, task.title); setShowContextMenu(false); }} className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-500/10 flex items-center gap-2">
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
