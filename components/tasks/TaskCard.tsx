'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Task } from '@/types/database';
import { PRIORITY_COLORS, TIME_OF_DAY_INFO, formatDuration, formatDueDate } from '@/lib/taskHelpers';

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

  const titleSize = isJustOneThingMode ? 'text-2xl' : 'text-base';
  const titleWeight = task.priority === 'high' ? 'font-bold' : 'font-semibold';

  const handleComplete = useCallback(() => {
    if (isCompleting) return;
    setIsCompleting(true);

    // Trigger completion after animation
    setTimeout(() => {
      onToggleComplete(task.id, task.completed);
      if (!task.completed && showCompletionToast) {
        const messages = ['Nice work! 🌱', 'You got this! ⚡', 'One step closer! 🎉', 'Crushed it! 🌱', 'Keep growing! 🌱'];
        showCompletionToast(messages[Math.floor(Math.random() * messages.length)]);
      }
      setIsCompleting(false);
    }, task.completed ? 100 : 500);
  }, [task.id, task.completed, isCompleting, onToggleComplete, showCompletionToast]);

  const dueLabel = formatDueDate(task.due_date);
  const durationLabel = formatDuration(task.estimated_minutes);
  const timeInfo = TIME_OF_DAY_INFO[task.best_time_of_day];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: isCompleting && !task.completed ? 0.5 : 1,
        y: 0,
        height: 'auto',
      }}
      exit={{ opacity: 0, height: 0, marginBottom: 0, padding: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative group"
      onContextMenu={(e) => {
        e.preventDefault();
        setShowContextMenu(true);
      }}
    >
      {/* Swipe hint background */}
      {swipeX > 40 && (
        <div className="absolute inset-0 flex items-center justify-end pr-4 bg-[#4ECDC4]/10 border border-[#4ECDC4]/30"
          style={{ borderRadius: 0 }}
        >
          <span className="text-xs font-bold text-[#4ECDC4] uppercase tracking-wider">Reschedule →</span>
        </div>
      )}

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 120 }}
        dragElastic={0.1}
        onDrag={(_, info) => setSwipeX(info.offset.x)}
        onDragEnd={(_, info) => {
          if (info.offset.x > 80) {
            onReschedule(task.id);
          }
          setSwipeX(0);
        }}
        style={{ x: 0 }}
        className={`
          relative flex items-start gap-3 p-4
          bg-card border-2 border-border
          transition-colors duration-200
          hover:border-brand-500/50
          ${task.is_ai_suggested ? 'border-amber-500/30 shadow-[0_0_12px_rgba(245,185,66,0.08)]' : ''}
        `}
      >
        {/* Left: Checkbox */}
        <button
          onClick={handleComplete}
          aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
          className={`
            w-6 h-6 mt-0.5 shrink-0 border-2 flex items-center justify-center
            transition-all duration-150 ease-in-out cursor-pointer
            ${task.completed
              ? 'bg-[#4ECDC4] border-[#4ECDC4]'
              : 'border-[#4ECDC4] hover:bg-[#4ECDC4]/10'
            }
          `}
          style={{ borderRadius: '6px' }}
        >
          <AnimatePresence>
            {(task.completed || isCompleting) && (
              <motion.svg
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.15, ease: 'easeInOut' }}
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </motion.svg>
            )}
          </AnimatePresence>
        </button>

        {/* Middle: Title + metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`
                ${titleSize} ${titleWeight} leading-snug
                ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}
                transition-colors duration-100
              `}
              style={{ lineHeight: 1.4 }}
            >
              {task.title}
            </span>
            {task.is_ai_suggested && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20" style={{ borderRadius: '4px' }}>
                ✨ AI pick
              </span>
            )}
          </div>

          {task.description && !isJustOneThingMode && (
            <p className="text-xs text-[#888] mt-0.5 truncate">{task.description}</p>
          )}
          {task.description && isJustOneThingMode && (
            <p className="text-sm text-[#999] mt-2 leading-relaxed">{task.description}</p>
          )}

          {/* Metadata pills */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {durationLabel && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                ⏱️ {durationLabel}
              </span>
            )}
            {timeInfo && task.best_time_of_day !== 'anytime' && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                {timeInfo.emoji} {timeInfo.label}
              </span>
            )}
            {dueLabel && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                📅 {dueLabel}
              </span>
            )}
            {task.is_recurring && task.consistency_score !== null && task.consistency_score !== undefined && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                🔁 {task.consistency_score}%
              </span>
            )}
          </div>
        </div>

        {/* Right: Priority bar + delete */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Priority color bar */}
          <div
            className="w-1 h-10 rounded-full"
            style={{ backgroundColor: PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium }}
            title={`${task.priority} priority`}
          />

          {/* Delete (always visible but subtle, pops on hover) */}
          <button
            onClick={() => onDelete(task.id)}
            className="opacity-30 group-hover:opacity-100 text-[#555] hover:text-red-400 transition-all p-1"
            aria-label="Delete task"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </motion.div>

      {/* Context menu (long press) */}
      <AnimatePresence>
        {showContextMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowContextMenu(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-1 z-50 w-56 bg-card border-2 border-border shadow-lg py-1"
            >
              {onFocus && (
                <button
                  onClick={() => { onFocus(task); setShowContextMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-brand-400 font-bold hover:bg-muted/10 flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                  Focus on this
                </button>
              )}
              {onBreakDown && (
                <button
                  onClick={() => { onBreakDown(task.id); setShowContextMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted/10 flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="6" y1="3" x2="6" y2="15" />
                    <circle cx="18" cy="6" r="3" />
                    <circle cx="6" cy="18" r="3" />
                    <path d="M18 9a9 9 0 01-9 9" />
                  </svg>
                  Break down into steps
                </button>
              )}
              <button
                onClick={() => { onReschedule(task.id); setShowContextMenu(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted/10 flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Reschedule
              </button>
              {onMoveToWaiting && (
                <button
                  onClick={() => { onMoveToWaiting(task.id); setShowContextMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted/10 flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="10" y1="15" x2="10" y2="9" />
                    <line x1="14" y1="15" x2="14" y2="9" />
                  </svg>
                  Move to Waiting
                </button>
              )}
              <div className="border-t border-border my-1" />
              <button
                onClick={() => { onDelete(task.id); setShowContextMenu(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-error hover:bg-error/10 flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
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
