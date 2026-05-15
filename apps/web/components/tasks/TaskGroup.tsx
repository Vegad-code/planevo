'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TaskGroup as TaskGroupType, Task } from '@/types/tasks';
import TaskCard from './TaskCard';

// Group icon mapping
const GROUP_ICONS: Record<string, React.ReactNode> = {
  flash: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  'flash-outline': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  'pause-circle': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="10" y1="15" x2="10" y2="9" />
      <line x1="14" y1="15" x2="14" y2="9" />
    </svg>
  ),
};

interface TaskGroupProps {
  group: TaskGroupType;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onDelete: (taskId: string) => void;
  onReschedule: (taskId: string) => void;
  onBreakDown?: (taskId: string) => void;
  onMoveToWaiting?: (taskId: string) => void;
  onFocus?: (task: Task) => void;
  showCompletionToast?: (message: string) => void;
}

export default function TaskGroup({
  group,
  onToggleComplete,
  onDelete,
  onReschedule,
  onBreakDown,
  onMoveToWaiting,
  onFocus,
  showCompletionToast,
}: TaskGroupProps) {
  const [collapsed, setCollapsed] = useState(group.is_collapsed);

  const completedCount = group.tasks.filter(t => t.completed).length;
  const totalCount = group.tasks.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="mb-4">
      {/* Group Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`
          w-full flex items-center justify-between
          py-3 px-4
          bg-[#2A2A2A] border-2 border-[#363636]
          hover:bg-[#333] transition-colors duration-150
          cursor-pointer select-none
        `}
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-3">
          <span className="text-[#4ECDC4]">
            {GROUP_ICONS[group.icon] || GROUP_ICONS.flash}
          </span>
          <span className="text-lg font-bold text-white" style={{ fontSize: '18px', fontWeight: 700 }}>
            {group.title}
          </span>
          <span className="text-xs font-semibold text-[#888] bg-[#363636] px-2 py-0.5" style={{ borderRadius: '4px' }}>
            {totalCount}
          </span>
          {group.ai_generated && (
            <span className="text-amber-400 text-sm" title="AI-organized group">✨</span>
          )}
        </div>
        <motion.svg
          animate={{ rotate: collapsed ? 0 : 180 }}
          transition={{ duration: 0.2 }}
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </motion.svg>
      </button>

      {/* Progress bar */}
      <div className="h-1 bg-[#1a1a1a] relative overflow-hidden">
        <motion.div
          className="h-full bg-[#4ECDC4]"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Progress text */}
      {!collapsed && (
        <div className="px-4 py-1.5 text-[11px] font-medium text-[#666]">
          {completedCount} of {totalCount} done
        </div>
      )}

      {/* Task list */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-1 pt-1">
              {group.tasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={onToggleComplete}
                  onDelete={onDelete}
                  onReschedule={onReschedule}
                  onBreakDown={onBreakDown}
                  onMoveToWaiting={onMoveToWaiting}
                  onFocus={onFocus}
                  showCompletionToast={showCompletionToast}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
