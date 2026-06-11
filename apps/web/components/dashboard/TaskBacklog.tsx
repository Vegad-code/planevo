'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import {
  Package, CaretDown, CaretUp, Clock,
  ArrowRight, DotsSixVertical, ArrowSquareOut
} from '@phosphor-icons/react';
import { type Task } from '@/types/tasks';

interface TaskBacklogProps {
  onScheduleAll: (tasks: Task[]) => void;
  onScheduleOne: (task: Task) => void;
  isProcessing: boolean;
  scheduledTaskIds: string[];
}

function BacklogItem({ task, onSchedule, index }: { task: Task; onSchedule: (t: Task) => void; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.05, once: true });

  const energyColor = {
    low: 'bg-[var(--color-sage-soft)] text-[var(--color-sage)] border-[var(--color-sage)]/30',
    medium: 'bg-[var(--color-honey-soft)] text-[var(--color-honey-deep)] border-[var(--color-honey)]/30',
    high: 'bg-[var(--color-rose-soft)] text-[var(--color-rose)] border-[var(--color-rose)]/30',
  }[task.energy_level_required || 'medium'];

  return (
    <motion.div
      ref={ref}
      draggable
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onDragStart={(e: any) => {
        // We set the drag data to the task JSON so the drop target knows what task it is
        e.dataTransfer.setData('application/json', JSON.stringify(task));
        e.dataTransfer.effectAllowed = 'move';

        // Optional: create a drag image or just rely on default element dragging
        e.currentTarget.style.opacity = '0.5';
      }}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onDragEnd={(e: any) => {
        e.currentTarget.style.opacity = '1';
      }}
      initial={{ scale: 0.95, opacity: 0, y: 8 }}
      animate={inView ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.95, opacity: 0, y: 8 }}
      transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.15) }}
      className="group flex items-center gap-3 p-3 bg-[var(--color-paper)] rounded-[16px] border border-[var(--color-line)] hover:border-[var(--color-line-strong)] hover:bg-[var(--color-cream-2)] transition-all hover:shadow-sm cursor-grab active:cursor-grabbing"
    >
      <DotsSixVertical className="w-4 h-4 text-[var(--color-ink-soft)] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-[var(--color-ink)] truncate">
          {task.title}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          {task.estimated_minutes && (
            <span className="flex items-center gap-1 font-mono text-[10px] tracking-wide text-[var(--color-ink-soft)]">
              <Clock className="w-3 h-3" />
              {task.estimated_minutes}m
            </span>
          )}
          <span className={`font-mono text-[10px] tracking-wide px-1.5 py-0.5 rounded-full border ${energyColor}`}>
            {task.energy_level_required || 'med'}
          </span>
          {task.due_date && (
            <span className="flex items-center gap-1 font-mono text-[10px] tracking-wide text-[var(--color-ink-soft)] bg-[var(--color-cream-2)] px-1.5 py-0.5 rounded-full border border-[var(--color-line)]">
              {task.due_date}
            </span>
          )}
          {task.external_url && (
            <a
              href={task.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-mono text-[10px] tracking-wide text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] bg-[var(--color-cream-2)] px-1.5 py-0.5 rounded-full border border-[var(--color-line)] transition-colors"
            >
              <ArrowSquareOut className="w-3 h-3" />
              Source
            </a>
          )}
        </div>
      </div>

      <button
        onClick={() => onSchedule(task)}
        className="p-2 rounded-full bg-[var(--color-cream-2)] text-[var(--color-ink)] hover:bg-[var(--color-line-strong)] transition-all active:scale-90 opacity-0 group-hover:opacity-100 border border-[var(--color-line)]"
        title="Send to Schedule"
      >
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export default function TaskBacklog({ onScheduleAll, onScheduleOne, isProcessing, scheduledTaskIds = [] }: TaskBacklogProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const supabase = createClient();

  const loadUnscheduledTasks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', false)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    const { data: sourceItems } = await supabase
      .from('source_items')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    let allTasks: Task[] = [];
    if (data) allTasks = [...(data as Task[])];

    if (sourceItems) {
      const mappedSources = sourceItems.map(item => ({
        id: item.external_id,
        user_id: item.user_id,
        title: item.title || 'Untitled',
        description: item.description,
        due_date: item.due_date,
        priority: 'medium',
        estimated_minutes: 30,
        completed: false,
        completed_at: null,
        created_at: item.created_at,
        updated_at: item.updated_at,
        deleted_at: null,
        external_id: item.external_id,
        external_url: item.url,
        best_time_of_day: 'anytime',
        energy_level_required: 'medium',
        is_recurring: false,
        recurrence_pattern: null,
        parent_task_id: null,
        provider: item.provider
      } as Task));
      allTasks = [...allTasks, ...mappedSources];
    }

    setTasks(allTasks);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    requestAnimationFrame(() => {
      void loadUnscheduledTasks();
    });
  }, [loadUnscheduledTasks]);

  const handleScheduleOne = (task: Task) => {
    onScheduleOne(task);
    // Optimistically remove from Backlog
    setTasks(prev => prev.filter(t => t.id !== task.id));
  };

  const handleScheduleAll = () => {
    if (visibleTasks.length === 0) return;
    onScheduleAll(visibleTasks);
    // Optimistically clear is handled by the parent re-rendering with new scheduledTaskIds
  };

  const visibleTasks = tasks.filter(t => !scheduledTaskIds.includes(t.id));
  const unscheduledCount = visibleTasks.length;

  return (
    <div className="bg-[var(--color-paper)] border border-[var(--color-line)] rounded-[22px] overflow-hidden shadow-sm transition-all">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 bg-[var(--color-paper)] border-b border-[var(--color-line)] hover:bg-[var(--color-cream-2)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-[var(--color-ink)] flex items-center justify-center">
            <Package className="w-5 h-5 text-[var(--color-paper)]" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-medium tracking-tight text-[var(--color-ink)]">
              Task Backlog
            </h3>
            <p className="font-mono text-[11px] tracking-wide text-[var(--color-ink-soft)] mt-0.5">
              {unscheduledCount} task{unscheduledCount !== 1 ? 's' : ''} waiting
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {unscheduledCount > 0 && (
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-ink)] text-[var(--color-paper)] font-mono text-[11px] tracking-wide">
              {unscheduledCount}
            </span>
          )}
          {expanded ? (
            <CaretUp className="w-5 h-5 text-[var(--color-ink-soft)]" />
          ) : (
            <CaretDown className="w-5 h-5 text-[var(--color-ink-soft)]" />
          )}
        </div>
      </button>

      {/* Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[var(--color-ink)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : visibleTasks.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm font-medium text-[var(--color-ink-soft)]">Backlog is clear! ✅</p>
                  <p className="font-mono text-[10px] text-[var(--color-ink-soft)]/70 mt-1 uppercase tracking-wide">
                    All tasks are scheduled or completed.
                  </p>
                </div>
              ) : (
                visibleTasks.map((task, i) => (
                  <BacklogItem
                    key={task.id}
                    task={task}
                    onSchedule={handleScheduleOne}
                    index={i}
                  />
                ))
              )}
            </div>

            {/* Auto-Schedule Button */}
            {visibleTasks.length > 0 && (
              <div className="p-4 pt-0">
                <button
                  onClick={handleScheduleAll}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--color-ink)] hover:bg-[var(--color-ink-2)] text-[var(--color-paper)] rounded-[16px] font-mono text-[11px] tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Clock className="w-4 h-4" />
                  {isProcessing ? 'Scheduling...' : `Schedule All (${unscheduledCount})`}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
