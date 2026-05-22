'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Broom } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import type { Task, BestTimeOfDay, EnergyLevel, TaskPriority } from '@/types/tasks';
import { useTaskGroups } from '@/hooks/useTaskGroups';
import { useTaskAI } from '@/hooks/useTaskAI';
import { useTaskActions } from '@/hooks/useTaskActions';
import { showToast } from '@/hooks/use-toast';
import TaskGroup from './TaskGroup';
import ShameFreeRescheduleModal from './ShameFreeRescheduleModal';
import BrunoAvatar from '@/components/bruno/BrunoAvatar';
import { calculateUserStats } from '@/lib/stats';
import { useFocusStore } from '@/store/useFocusStore';
import { useRouter } from 'next/navigation';

export default function EnhancedTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWhyModal, setShowWhyModal] = useState(false);

  // Tabs for source-based filtering
  const [activeTab, setActiveTab] = useState<'all' | 'canvas' | 'calendar' | 'personal'>('all');

  // Reschedule modal
  const [rescheduleTaskId, setRescheduleTaskId] = useState<string | null>(null);
  const rescheduleTask = tasks.find(t => t.id === rescheduleTaskId);

  // Add task form
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newEstimatedMinutes, setNewEstimatedMinutes] = useState(30);
  const [newBestTime, setNewBestTime] = useState<BestTimeOfDay>('anytime');
  const [newEnergy, setNewEnergy] = useState<EnergyLevel>('medium');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newDueDate, setNewDueDate] = useState('');

  const supabase = createClient();
  const router = useRouter();
  const setActiveTask = useFocusStore((state) => state.setActiveTask);

  const { aiResponse, aiLoading, aiError, fetchAIPriorities, invalidateCache } = useTaskAI();

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (data) setTasks(data as Task[]);
    setLoading(false);
  }, [supabase]);

  const handleRefresh = useCallback(() => {
    invalidateCache();
    fetchTasks();
  }, [invalidateCache, fetchTasks]);

  const { 
    saving, 
    addTask, 
    toggleComplete, 
    deleteTask, 
    rescheduleTask: doReschedule, 
    moveToWaiting, 
    breakDownTask, 
    startFresh 
  } = useTaskActions(handleRefresh);

  // User stats
  const stats = useMemo(() => calculateUserStats(tasks), [tasks]);

  // Fetch tasks on mount
  useEffect(() => { 
    fetchTasks(); 
  }, [fetchTasks]);

  // Fetch AI priorities when tasks change
  useEffect(() => {
    if (tasks.length > 0) fetchAIPriorities(tasks);
  }, [tasks, fetchAIPriorities]);

  // Dynamic source-based tasks partitioning
  const canvasTasks = useMemo(() => tasks.filter(t => t.external_url?.includes('canvas') || t.external_url?.includes('instructure')), [tasks]);
  const calendarTasks = useMemo(() => tasks.filter(t => t.external_url?.includes('calendar') || t.external_url?.includes('google.com/calendar')), [tasks]);
  const personalTasks = useMemo(() => tasks.filter(t => !t.external_url?.includes('canvas') && !t.external_url?.includes('instructure') && !t.external_url?.includes('calendar') && !t.external_url?.includes('google.com/calendar')), [tasks]);

  const counts = useMemo(() => ({
    all: tasks.length,
    canvas: canvasTasks.length,
    calendar: calendarTasks.length,
    personal: personalTasks.length,
  }), [tasks, canvasTasks, calendarTasks, personalTasks]);

  const filteredTasks = useMemo(() => {
    if (activeTab === 'canvas') return canvasTasks;
    if (activeTab === 'calendar') return calendarTasks;
    if (activeTab === 'personal') return personalTasks;
    return tasks;
  }, [activeTab, tasks, canvasTasks, calendarTasks, personalTasks]);

  // Groups for the list view based on filtered tasks
  const groups = useTaskGroups(filteredTasks, aiResponse);

  // Top high priority task for the banner reasoning
  const topHighPriorityTask = useMemo(() => {
    return tasks.find(t => !t.completed && t.priority === 'high') || tasks.find(t => !t.completed);
  }, [tasks]);

  // General counts for header subtitle
  const openCount = useMemo(() => tasks.filter(t => !t.completed).length, [tasks]);
  const dueThisWeekCount = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return tasks.filter(t => {
      if (t.completed || !t.due_date) return false;
      const d = new Date(t.due_date);
      return d >= today && d <= nextWeek;
    }).length;
  }, [tasks]);

  // Handlers
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const result = await addTask({
      title: newTitle,
      description: newDescription,
      estimated_minutes: newEstimatedMinutes,
      best_time_of_day: newBestTime,
      energy_level_required: newEnergy,
      due_date: newDueDate || undefined,
      priority: newPriority,
    });
    if (result.error) {
      showToast.error('Task Action Failed', result.error);
    } else {
      setNewTitle(''); setNewDescription(''); setNewEstimatedMinutes(30);
      setNewBestTime('anytime'); setNewEnergy('medium'); setNewPriority('medium'); setNewDueDate('');
      setShowAddModal(false);
    }
  };

  const handleBreakDown = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const result = await breakDownTask(taskId);
    if (result.error) {
      showToast.error('Task Action Failed', result.error);
    } else {
      showToast.success('Task broken down into subtasks! 🌱');
    }
  };

  const handleFocus = useCallback((task: Task) => {
    setActiveTask(task);
    router.push('/dashboard/focus');
  }, [setActiveTask, router]);

  const handleStartFresh = async () => {
    if (tasks.length === 0) return;
    
    if (!window.confirm('Are you sure you want to delete ALL tasks and start fresh? This cannot be undone.')) return;

    const result = await startFresh();
    if (result.error) {
      showToast.error('Fresh Start Failed', result.error);
    } else {
      showToast.success('Your workspace has been cleared! 🌱');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[var(--color-honey)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-1">
      {/* Breadcrumb Info */}
      <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-dark-muted)]/80 uppercase">
        TASKS · ALL SOURCES
      </div>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-medium tracking-tight text-[var(--color-text-dark)] leading-tight">
            Everything <span className="font-serif italic text-[var(--color-honey)]">on your plate.</span>
          </h1>
          <p className="text-xs text-[var(--color-text-dark-muted)]/90 font-normal">
            {openCount} open · {dueThisWeekCount} due this week. Bruno keeps the urgent stuff up top so you don't have to scan.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Consistency Stats (mockup-style dual columns) */}
          <div className="flex items-center gap-4 px-4.5 py-2.5 bg-[var(--color-card-dark)] border border-[var(--color-border-dark)] rounded-[18px]">
            <div className="flex flex-col">
              <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-text-dark-muted)] leading-none mb-1">Consistency</span>
              <span className="text-[14px] font-bold text-[var(--color-text-dark)]">{stats.consistencyScore}%</span>
            </div>
            <div className="w-px h-7 bg-[var(--color-border-dark)]" />
            <div className="flex flex-col">
              <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-text-dark-muted)] leading-none mb-1">Streak</span>
              <span className="text-[14px] font-bold text-[var(--color-honey)]">{stats.currentStreak}d</span>
            </div>
          </div>

          {/* Add Task Primary Pill Button */}
          <button
            id="tasks-add-button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[var(--color-text-dark)] hover:bg-[var(--color-text-dark-muted)] text-[var(--color-bg-dark)] rounded-full text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Plus size={14} weight="bold" />
            Add task
          </button>
        </div>
      </div>

      {/* Capsule Filtering Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border-dark)]/50 pb-4">
        {(['all', 'canvas', 'calendar', 'personal'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const count = counts[tab];
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-all cursor-pointer border
                ${isActive
                  ? 'bg-[var(--color-text-dark)] text-[var(--color-bg-dark)] border-[var(--color-text-dark)] shadow-sm'
                  : 'bg-transparent text-[var(--color-text-dark-muted)] border-[var(--color-border-dark)] hover:text-[var(--color-text-dark)] hover:border-[var(--color-border-dark)]'
                }
              `}
            >
              {tab}
              <span className={`
                text-[10px] font-mono leading-none px-1.5 py-0.5 rounded-[4px]
                ${isActive ? 'bg-[var(--color-bg-dark)]/15 text-[var(--color-bg-dark)]' : 'bg-[var(--color-card-dark-hover)]/40 text-[var(--color-text-dark-muted)]'}
              `}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Monospace Sort Header & Clean Start Fresh */}
      <div className="flex items-center justify-between py-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-dark-muted)]/70">
          SORT / Bruno priority ⬇
        </span>
        {tasks.length > 0 && (
          <button
            onClick={handleStartFresh}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-red-500/20 hover:border-red-500/50 rounded-full text-red-500/60 hover:text-red-500 text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer"
            title="Delete all tasks"
          >
            <Broom size={12} weight="regular" />
            Start fresh
          </button>
        )}
      </div>

      {/* Bruno Auto-Sorted Banner Alert */}
      {tasks.length > 0 && !aiLoading && (
        <div className="bg-[var(--color-card-dark)] border border-[var(--color-border-dark)] rounded-[20px] p-4 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4.5">
            <div className="w-10 h-10 rounded-full bg-[var(--color-card-dark-hover)] border border-[var(--color-border-dark)] flex items-center justify-center shrink-0">
              <BrunoAvatar mood="happy" size="sm" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-honey)] font-bold">
                BRUNO · AUTO-SORTED
              </div>
              <p className="text-xs text-[var(--color-text-dark)] leading-normal">
                {topHighPriorityTask ? (
                  <>
                    Your <span className="italic">"{topHighPriorityTask.title}"</span> moved up. Thursday creeps up faster than you think.
                  </>
                ) : (
                  "Your daily workload has been arranged cleanly. No outstanding priority conflicts detected."
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowWhyModal(true)}
            className="border border-[var(--color-border-dark)] text-[var(--color-text-dark-muted)] hover:text-[var(--color-text-dark)] hover:border-[var(--color-text-dark)] px-3.5 py-1 rounded-full text-xs font-mono transition-colors shrink-0 cursor-pointer"
          >
            Why?
          </button>
        </div>
      )}

      {/* AI loading status */}
      {aiLoading && (
        <div className="flex items-center gap-2.5 text-xs text-[var(--color-text-dark-muted)] font-mono py-1">
          <div className="w-3.5 h-3.5 border border-amber-400 border-t-transparent rounded-full animate-spin" />
          AI is organizing your tasks...
        </div>
      )}
      {aiError && (
        <div className="text-xs text-[var(--color-text-dark-muted)] bg-[var(--color-card-dark)] border border-[var(--color-border-dark)] rounded-lg px-3 py-2">
          {aiError} — using smart fallback sorting
        </div>
      )}
      {aiResponse?.encouraging_message && (
        <div className="text-xs text-[var(--color-text-dark-muted)] italic py-1 font-serif">
          "{aiResponse.encouraging_message}"
        </div>
      )}

      {/* Task List Groups */}
      {filteredTasks.length === 0 ? (
        <div className="bg-[var(--color-card-dark)] border border-[var(--color-border-dark)] rounded-[22px] p-12 flex flex-col items-center justify-center text-center">
          <BrunoAvatar mood="happy" size="lg" />
          <h2 className="mt-4 text-lg font-medium text-[var(--color-text-dark)] font-serif italic">No tasks yet</h2>
          <p className="mt-2 text-[var(--color-text-dark-muted)] text-sm max-w-sm">
            Nothing in this section! Enjoy the calm, or add something new.
          </p>
          <button id="tasks-empty-add-button" onClick={() => setShowAddModal(true)}
            className="mt-6 px-6 py-3 bg-[var(--color-text-dark)] text-[var(--color-bg-dark)] rounded-full text-xs font-semibold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer">
            + Create your first task
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {groups.map(group => (
            <TaskGroup
              key={group.id}
              group={group}
              onToggleComplete={toggleComplete}
              onDelete={deleteTask}
              onReschedule={(id) => setRescheduleTaskId(id)}
              onBreakDown={handleBreakDown}
              onMoveToWaiting={moveToWaiting}
              onFocus={handleFocus}
            />
          ))}
        </div>
      )}

      {/* Why Modal */}
      <AnimatePresence>
        {showWhyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowWhyModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)] rounded-[22px] p-6 z-10 shadow-2xl"
            >
              <h2 className="text-lg font-serif italic font-semibold text-[var(--color-honey)] mb-2">
                How Bruno sorts your workspace.
              </h2>
              <div className="space-y-3.5 text-xs text-[var(--color-text-dark-muted)] font-sans leading-relaxed">
                <p>
                  Bruno automatically analyzes your tasks based on priority tags, proximity to due dates, and contextual details to establish an optimized timeline.
                </p>
                <p>
                  Critical tasks are elevated to the top of the queue, while lower-priority elements are deferred, preventing decision fatigue.
                </p>
                <p>
                  Tasks from Canvas, Calendar, and your personal backlogs are harmonized, ensuring you have a unified stream of actionable steps.
                </p>
              </div>
              <button
                onClick={() => setShowWhyModal(false)}
                className="mt-6 w-full py-2.5 bg-[var(--color-text-dark)] hover:bg-[var(--color-text-dark-muted)] text-[var(--color-bg-dark)] text-xs font-semibold uppercase tracking-wider rounded-[14px] transition-colors cursor-pointer"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reschedule Modal */}
      <ShameFreeRescheduleModal
        isOpen={!!rescheduleTaskId}
        onClose={() => setRescheduleTaskId(null)}
        onReschedule={(date) => { if (rescheduleTaskId) doReschedule(rescheduleTaskId, date); }}
        taskTitle={rescheduleTask?.title || ''}
      />

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md bg-[var(--color-bg-dark)] border border-[var(--color-border-dark)] rounded-[22px] p-6 z-10 shadow-2xl">
            <h2 className="text-xl font-medium text-[var(--color-text-dark)] mb-4">Add new task</h2>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono tracking-widest text-[var(--color-text-dark-muted)] uppercase mb-1.5">What do you need to do?</label>
                <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Finish chapter 3 summary" required autoFocus
                  className="w-full px-4 py-2.5 bg-[var(--color-card-dark)] border border-[var(--color-border-dark)] rounded-[12px] text-[var(--color-text-dark)] placeholder-[var(--color-text-dark-muted)]/50 focus:outline-none focus:border-[var(--color-text-dark)] transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-mono tracking-widest text-[var(--color-text-dark-muted)] uppercase mb-1.5">Notes (optional)</label>
                <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)}
                  placeholder="Any extra details..." rows={2}
                  className="w-full px-4 py-2.5 bg-[var(--color-card-dark)] border border-[var(--color-border-dark)] rounded-[12px] text-[var(--color-text-dark)] placeholder-[var(--color-text-dark-muted)]/50 focus:outline-none focus:border-[var(--color-text-dark)] transition-colors resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono tracking-widest text-[var(--color-text-dark-muted)] uppercase mb-1.5">Time estimate</label>
                  <select value={newEstimatedMinutes} onChange={e => setNewEstimatedMinutes(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-[var(--color-card-dark)] border border-[var(--color-border-dark)] rounded-[12px] text-[var(--color-text-dark)] focus:outline-none focus:border-[var(--color-text-dark)] transition-colors">
                    <option value={5}>5 min</option><option value={10}>10 min</option>
                    <option value={15}>15 min</option><option value={30}>30 min</option>
                    <option value={45}>45 min</option><option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option><option value={120}>2 hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono tracking-widest text-[var(--color-text-dark-muted)] uppercase mb-1.5">Best time</label>
                  <select value={newBestTime} onChange={e => setNewBestTime(e.target.value as BestTimeOfDay)}
                    className="w-full px-4 py-2.5 bg-[var(--color-card-dark)] border border-[var(--color-border-dark)] rounded-[12px] text-[var(--color-text-dark)] focus:outline-none focus:border-[var(--color-text-dark)] transition-colors">
                    <option value="anytime">Anytime</option><option value="morning">☀️ Morning</option>
                    <option value="afternoon">🌤️ Afternoon</option><option value="evening">🌙 Evening</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-[11px] font-mono tracking-widest text-[var(--color-text-dark-muted)] uppercase mb-1.5">Priority</label>
                  <select value={newPriority} onChange={e => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2.5 bg-[var(--color-card-dark)] border border-[var(--color-border-dark)] rounded-[12px] text-[var(--color-text-dark)] focus:outline-none focus:border-[var(--color-text-dark)] transition-colors text-xs">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-[11px] font-mono tracking-widest text-[var(--color-text-dark-muted)] uppercase mb-1.5">Energy</label>
                  <select value={newEnergy} onChange={e => setNewEnergy(e.target.value as EnergyLevel)}
                    className="w-full px-3 py-2.5 bg-[var(--color-card-dark)] border border-[var(--color-border-dark)] rounded-[12px] text-[var(--color-text-dark)] focus:outline-none focus:border-[var(--color-text-dark)] transition-colors text-xs">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-[11px] font-mono tracking-widest text-[var(--color-text-dark-muted)] uppercase mb-1.5">Due date</label>
                  <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[var(--color-card-dark)] border border-[var(--color-border-dark)] rounded-[12px] text-[var(--color-text-dark)] focus:outline-none focus:border-[var(--color-text-dark)] transition-colors text-xs" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-[var(--color-card-dark)] hover:bg-[var(--color-card-dark-hover)] text-[var(--color-text-dark-muted)] font-medium rounded-[16px] border border-[var(--color-border-dark)] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-[var(--color-text-dark)] hover:bg-[var(--color-text-dark-muted)] text-[var(--color-bg-dark)] font-medium rounded-[16px] border border-[var(--color-text-dark)] transition-colors disabled:opacity-50">
                  {saving ? 'Adding...' : 'Add Task'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
