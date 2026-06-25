'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { ensureUserProfile } from '@/lib/supabase/ensure-profile';
import {
  Package,
  Clock,
  ArrowRight,
  DotsSixVertical,
  ArrowSquareOut,
  Plus,
} from '@phosphor-icons/react';
import { type Task } from '@/types/tasks';
import type { CalendarEvent } from '@/types/calendar';
import ScheduleTaskPopover from '@/components/calendar/ScheduleTaskPopover';
import { Input } from '@/components/ui/input';

interface TaskBacklogProps {
  variant?: 'standalone' | 'embedded';
  onScheduleAll: (tasks: Task[]) => void;
  onScheduleOne: (task: Task, time?: Date) => void;
  onAskBruno?: (task: Task) => void;
  onDragStartTask?: (task: Task | null) => void;
  isProcessing: boolean;
  scheduledTaskIds: string[];
  selectedDate?: Date;
  events?: CalendarEvent[];
  dayStartHour?: number;
  dayEndHour?: number;
  onTaskCreated?: () => void;
}

function BacklogItem({
  task,
  onScheduleClick,
  onDragStartTask,
  index,
}: {
  task: Task;
  onScheduleClick: (t: Task) => void;
  onDragStartTask: (task: Task | null) => void;
  index: number;
}) {
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
      onDragStart={() => {
        onDragStartTask(task);
      }}
      onDragEnd={() => {
        onDragStartTask(null);
      }}
      initial={{ scale: 0.95, opacity: 0, y: 8 }}
      animate={inView ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.95, opacity: 0, y: 8 }}
      transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.15) }}
      className="group relative flex items-center gap-3 p-3 bg-[var(--color-paper)] rounded-[16px] border border-[var(--color-line)] hover:border-[var(--color-line-strong)] hover:bg-[var(--color-cream-2)] transition-all hover:shadow-sm cursor-grab active:cursor-grabbing"
    >
      {task.color && (
        <span
          className="absolute left-0 top-2 bottom-2 w-1 rounded-full"
          style={{ backgroundColor: task.color }}
          aria-hidden
        />
      )}
      <DotsSixVertical className="w-4 h-4 text-[var(--color-ink-soft)] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-[var(--color-ink)] truncate">{task.title}</h4>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.estimated_minutes && (
            <span className="flex items-center gap-1 font-mono text-[10px] tracking-wide text-[var(--color-ink-soft)]">
              <Clock className="w-3 h-3" />
              {task.estimated_minutes}m
            </span>
          )}
          <span
            className={`font-mono text-[10px] tracking-wide px-1.5 py-0.5 rounded-full border ${energyColor}`}
          >
            {task.energy_level_required || 'med'}
          </span>
          {task.due_date && (
            <span className="font-mono text-[10px] tracking-wide text-[var(--color-ink-soft)] bg-[var(--color-cream-2)] px-1.5 py-0.5 rounded-full border border-[var(--color-line)]">
              {task.due_date}
            </span>
          )}
          {task.external_url && (
            <a
              href={task.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-mono text-[10px] tracking-wide text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] bg-[var(--color-cream-2)] px-1.5 py-0.5 rounded-full border border-[var(--color-line)] transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ArrowSquareOut className="w-3 h-3" />
              Source
            </a>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onScheduleClick(task)}
        className="p-2 rounded-full bg-[var(--color-cream-2)] text-[var(--color-ink)] hover:bg-[var(--color-line-strong)] transition-all active:scale-90 opacity-0 group-hover:opacity-100 border border-[var(--color-line)]"
        title="Schedule task"
      >
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export default function TaskBacklog({
  variant = 'standalone',
  onScheduleAll,
  onScheduleOne,
  onAskBruno,
  onDragStartTask = () => {},
  isProcessing,
  scheduledTaskIds = [],
  selectedDate = new Date(),
  events = [],
  dayStartHour = 6,
  dayEndHour = 22,
  onTaskCreated,
}: TaskBacklogProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [schedulingTask, setSchedulingTask] = useState<Task | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const supabase = createClient();
  const embedded = variant === 'embedded';

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
      const mappedSources = sourceItems.map(
        (item) =>
          ({
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
            provider: item.provider,
          }) as Task
      );
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

  const handleScheduleAt = (task: Task, time: Date) => {
    onScheduleOne(task, time);
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    setSchedulingTask(null);
  };

  const handleScheduleAll = () => {
    if (visibleTasks.length === 0) return;
    onScheduleAll(visibleTasks);
  };

  const handleQuickAdd = async () => {
    const title = quickAddTitle.trim();
    if (!title || addingTask) return;

    setAddingTask(true);
    try {
      const { user, error: profileError } = await ensureUserProfile(supabase);
      if (profileError || !user) return;

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title,
          estimated_minutes: 30,
          status: 'todo',
          completed: false,
          priority: 'medium',
          energy_level_required: 'medium',
          best_time_of_day: 'anytime',
        })
        .select('*')
        .single();

      if (error || !data) return;

      const newTask = data as Task;
      setTasks((prev) => [newTask, ...prev]);
      setQuickAddTitle('');
      setSchedulingTask(newTask);
      onTaskCreated?.();
    } finally {
      setAddingTask(false);
    }
  };

  const visibleTasks = tasks.filter((t) => !scheduledTaskIds.includes(t.id));
  const unscheduledCount = visibleTasks.length;

  const body = (
    <>
      {embedded && (
        <div className="p-3 border-b border-[var(--color-line)] shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-[var(--color-ink)]" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-ink)]">
              Backlog
            </span>
            {unscheduledCount > 0 && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-[var(--color-ink)] text-[var(--color-cream)]">
                {unscheduledCount}
              </span>
            )}
          </div>
          <form
            className="flex gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              void handleQuickAdd();
            }}
          >
            <Input
              value={quickAddTitle}
              onChange={(e) => setQuickAddTitle(e.target.value)}
              placeholder="Add task…"
              className="h-8 text-sm font-mono"
              disabled={addingTask}
            />
            <button
              type="submit"
              disabled={!quickAddTitle.trim() || addingTask}
              className="shrink-0 p-2 rounded-lg bg-[var(--color-ink)] text-[var(--color-cream)] disabled:opacity-40"
              aria-label="Add task"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      <div
        className={`flex-1 overflow-y-auto no-scrollbar ${
          embedded ? 'p-3' : 'p-4 space-y-2 max-h-[300px]'
        } ${embedded ? 'space-y-2' : ''}`}
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-[var(--color-ink)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visibleTasks.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-[var(--color-ink-soft)]">Backlog is clear!</p>
            <p className="font-mono text-[10px] text-[var(--color-ink-soft)]/70 mt-1 uppercase tracking-wide">
              All tasks are scheduled or completed.
            </p>
          </div>
        ) : (
          visibleTasks.map((task, i) => (
            <BacklogItem
              key={task.id}
              task={task}
              onScheduleClick={setSchedulingTask}
              onDragStartTask={onDragStartTask}
              index={i}
            />
          ))
        )}
      </div>

      {schedulingTask && (
        <ScheduleTaskPopover
          task={schedulingTask}
          selectedDate={selectedDate}
          events={events}
          dayStartHour={dayStartHour}
          dayEndHour={dayEndHour}
          onSchedule={handleScheduleAt}
          onAskBruno={onAskBruno}
          onClose={() => setSchedulingTask(null)}
        />
      )}

      {visibleTasks.length > 0 && (
        <div className={`shrink-0 ${embedded ? 'p-3 pt-0' : 'p-4 pt-0'}`}>
          <button
            type="button"
            onClick={handleScheduleAll}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--color-ink)] hover:bg-[var(--color-ink-2)] text-[var(--color-paper)] rounded-[16px] font-mono text-[11px] tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Clock className="w-4 h-4" />
            {isProcessing ? 'Scheduling...' : `Schedule All (${unscheduledCount})`}
          </button>
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-hidden">{body}</div>
    );
  }

  return (
    <div className="bg-[var(--color-paper)] border border-[var(--color-line)] rounded-[22px] overflow-hidden shadow-sm transition-all">
      <button
        type="button"
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
        {unscheduledCount > 0 && (
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-ink)] text-[var(--color-paper)] font-mono text-[11px] tracking-wide">
            {unscheduledCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            {body}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
