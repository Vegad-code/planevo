'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Broom, ArrowsClockwise } from '@phosphor-icons/react';
import { useProIntegrations } from '@/hooks/useProIntegrations';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Task, BestTimeOfDay, EnergyLevel, TaskPriority } from '@/types/tasks';
import { useTaskGroups } from '@/hooks/useTaskGroups';
import { useTaskAI } from '@/hooks/useTaskAI';
import { useTaskActions } from '@/hooks/useTaskActions';
import { showToast } from '@/hooks/use-toast';
import TaskGroup from './TaskGroup';
import ShameFreeRescheduleModal from './ShameFreeRescheduleModal';
import { BrunoThinkingIllustration } from '@/components/bruno/BrunoThinkingIllustration';
import BrunoAvatar from '@/components/bruno/BrunoAvatar';
import { calculateUserStats } from '@/lib/stats';
import { useFocusStore } from '@/store/useFocusStore';
import { useRouter } from 'next/navigation';
import { parseTaskInput } from '@/lib/taskParser';
import { useTasksQuery } from '@/hooks/useTasksQuery';
import { useTaskOptimisticEvents } from '@/hooks/useTaskOptimisticEvents';
import { useSupabaseTableRealtime } from '@/hooks/useSupabaseTableRealtime';

export default function EnhancedTasks() {
  const { tasks, loading, refresh, setTasks, userId } = useTasksQuery();
  useTaskOptimisticEvents(setTasks);
  useSupabaseTableRealtime({
    userId,
    tables: ['tasks', 'source_items'],
    onChange: refresh,
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showWhyModal, setShowWhyModal] = useState(false);
  const [showStartFreshConfirm, setShowStartFreshConfirm] = useState(false);

  // Tabs for source-based filtering
  const [activeTab, setActiveTab] = useState<'all' | 'canvas' | 'calendar' | 'work' | 'personal'>('all');

  const { connectedProviders, syncing, syncAll } = useProIntegrations();
  const hasWorkIntegrations = connectedProviders.length > 0;

  // Reschedule modal
  const [rescheduleTaskId, setRescheduleTaskId] = useState<string | null>(null);
  const rescheduleTask = tasks.find(t => t.id === rescheduleTaskId);

  // Add task form (NLP + Overrides)
  const [taskInput, setTaskInput] = useState('');
  const [overridePriority, setOverridePriority] = useState<TaskPriority | null>(null);
  const [overrideDueDate, setOverrideDueDate] = useState<string | null>(null);
  const [overrideTime, setOverrideTime] = useState<number | null>(null);
  const [showExtraOptions, setShowExtraOptions] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState('daily');

  // Hide Completed tasks toggle
  const [hideCompleted, setHideCompleted] = useState(false);

  const router = useRouter();
  const setActiveTask = useFocusStore((state) => state.setActiveTask);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { aiResponse, aiLoading, aiError, fetchAIPriorities, invalidateCache } = useTaskAI();

  const handleRefresh = useCallback(() => {
    invalidateCache();
    refresh();
  }, [invalidateCache, refresh]);

  const {
    saving,
    addTask,
    toggleComplete,
    deleteTask,
    rescheduleTask: doReschedule,
    moveToWaiting,
    breakDownTask,
    startFresh
  } = useTaskActions({ onRefresh: handleRefresh, setTasks });

  // User stats
  const stats = useMemo(() => calculateUserStats(tasks), [tasks]);

  // Fetch AI priorities when tasks change
  useEffect(() => {
    if (tasks.length > 0) fetchAIPriorities(tasks);
  }, [tasks, fetchAIPriorities]);

  // Dynamic source-based tasks partitioning
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const canvasTasks = useMemo(() => tasks.filter(t => (t as any).provider === 'canvas' || t.external_url?.includes('canvas') || t.external_url?.includes('instructure')), [tasks]);
  const calendarTasks = useMemo(() => tasks.filter(t => t.external_url?.includes('calendar') || t.external_url?.includes('google.com/calendar')), [tasks]);
  const workProviders = ['notion', 'slack', 'linear'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workTasks = useMemo(() => tasks.filter(t => workProviders.includes((t as any).provider)), [tasks]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const personalTasks = useMemo(() => tasks.filter(t => !(t as any).provider && !t.external_url?.includes('canvas') && !t.external_url?.includes('instructure') && !t.external_url?.includes('calendar') && !t.external_url?.includes('google.com/calendar')), [tasks]);

  const counts = useMemo(() => ({
    all: tasks.length,
    canvas: canvasTasks.length,
    calendar: calendarTasks.length,
    work: workTasks.length,
    personal: personalTasks.length,
  }), [tasks, canvasTasks, calendarTasks, workTasks, personalTasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (activeTab === 'canvas') result = canvasTasks;
    else if (activeTab === 'calendar') result = calendarTasks;
    else if (activeTab === 'work') result = workTasks;
    else if (activeTab === 'personal') result = personalTasks;

    if (hideCompleted) {
      result = result.filter(t => !t.completed);
    }
    return result;
  }, [activeTab, tasks, canvasTasks, calendarTasks, workTasks, personalTasks, hideCompleted]);

  const handleSyncWork = useCallback(async () => {
    await syncAll();
    handleRefresh();
  }, [syncAll, handleRefresh]);

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
    if (!taskInput.trim()) return;

    const parsed = parseTaskInput(taskInput);

    const result = await addTask({
      title: parsed.title,
      estimated_minutes: overrideTime ?? parsed.estimatedMinutes ?? 30,
      best_time_of_day: 'anytime',
      energy_level_required: 'medium',
      due_date: overrideDueDate || parsed.dueDate || undefined,
      priority: overridePriority ?? parsed.priority ?? 'medium',
      is_recurring: isRecurring,
      recurrence_pattern: isRecurring ? recurrencePattern : undefined,
    });

    if (result.error) {
      showToast.error('Task Action Failed', result.error);
    } else {
      setTaskInput('');
      setOverridePriority(null);
      setOverrideDueDate(null);
      setOverrideTime(null);
      setIsRecurring(false);
      setRecurrencePattern('daily');
      setShowAddModal(false);
      setShowExtraOptions(false);
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

  const handleStartFreshClick = () => {
    if (tasks.length === 0) return;
    setShowStartFreshConfirm(true);
  };

  const confirmStartFresh = async () => {
    setShowStartFreshConfirm(false);

    const result = await startFresh();
    if (result.error) {
      showToast.error('Fresh Start Failed', result.error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto px-1 animate-pulse fade-in duration-500 pb-12">
        <div className="font-mono text-[10px] w-32 h-3 bg-[var(--color-line)] rounded-full mb-6"></div>
        <div className="flex items-start justify-between flex-wrap gap-4 pb-2">
          <div className="space-y-3">
            <div className="w-64 h-10 md:w-80 md:h-12 bg-[var(--color-line)] rounded-xl"></div>
            <div className="w-48 h-4 bg-[var(--color-line)] rounded-full"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32 h-12 bg-[var(--color-settings-card)] border border-[var(--color-line)] rounded-[18px]"></div>
            <div className="w-28 h-10 bg-[var(--color-line)] rounded-full"></div>
          </div>
        </div>
        <div className="flex items-center gap-2 border-b border-[var(--color-line)] pb-4">
          <div className="w-16 h-8 bg-[var(--color-line)] rounded-full"></div>
          <div className="w-20 h-8 bg-[var(--color-line)] rounded-full"></div>
        </div>
        <div className="space-y-4 pt-2">
          <div className="w-32 h-5 bg-[var(--color-line)] rounded-md mb-2"></div>
          {[1, 2, 3, 4].map(i => (
             <div key={i} className="bg-[var(--color-settings-card)] border border-[var(--color-line)] rounded-[20px] p-4 flex gap-4 h-24">
               <div className="w-6 h-6 rounded-full border border-[var(--color-line)] mt-1"></div>
               <div className="flex-1 space-y-3">
                 <div className="w-3/4 h-5 bg-[var(--color-line)] rounded-md"></div>
                 <div className="w-1/2 h-3 bg-[var(--color-line)] rounded-md"></div>
               </div>
             </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6">
      {/* Header and Horizontal Tabs */}
      <div className="flex flex-col gap-6 pb-6 border-b border-[var(--color-line)] mb-8">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="space-y-1">
            <div className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-ink-faint)] uppercase mb-2">
              WORKSPACE · {activeTab.toUpperCase()}
            </div>
            <h1 className="text-3xl font-medium tracking-tight text-[var(--color-ink)] leading-tight">
              Everything <span className="font-serif italic text-[var(--color-honey-deep)]">on your plate.</span>
            </h1>
            <p className="text-xs text-[var(--color-ink-soft)] font-normal">
              {openCount} open · {dueThisWeekCount} due this week.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 px-4.5 py-2.5 bg-[var(--color-settings-card)] border border-[var(--color-line)] rounded-[18px] shadow-sm">
              <div className="flex flex-col">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-ink-faint)] leading-none mb-1">Consistency</span>
                <span className="text-[14px] font-bold text-[var(--color-ink)]">{stats.consistencyScore}%</span>
              </div>
              <div className="w-px h-7 bg-[var(--color-line)]" />
              <div className="flex flex-col">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-ink-faint)] leading-none mb-1">Streak</span>
                <span className="text-[14px] font-bold text-[var(--color-honey-deep)]">{stats.currentStreak}d</span>
              </div>
            </div>
            {hasWorkIntegrations && (
              <button
                onClick={handleSyncWork}
                disabled={syncing}
                title="Sync Notion, Slack, and Linear"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-[var(--color-settings-card)] border border-[var(--color-line)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream)] rounded-full text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                <ArrowsClockwise size={15} weight="bold" className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing...' : 'Sync work'}
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-[var(--color-ink)] hover:bg-[var(--color-ink-soft)] text-[var(--color-paper)] rounded-full text-sm font-medium transition-colors cursor-pointer shadow-md"
            >
              <Plus size={16} weight="bold" />
              Add task
            </button>
          </div>
        </div>

        {/* Filters/View Options replacing Sidebar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
          {/* Sources Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto hide-scrollbar">
            {(['all', 'canvas', 'calendar', ...(hasWorkIntegrations ? ['work' as const] : []), 'personal'] as const).map((tab) => {
              const isActive = activeTab === tab;
              const count = counts[tab];
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium capitalize transition-all cursor-pointer whitespace-nowrap
                    ${isActive
                      ? 'bg-[var(--color-ink)] text-[var(--color-paper)] shadow-md'
                      : 'bg-[var(--color-settings-card)] border border-[var(--color-line)] text-[var(--color-ink-soft)] hover:bg-[var(--color-cream)] hover:text-[var(--color-ink)]'
                    }
                  `}
                >
                  {tab}
                  <span className={`
                    text-[10px] font-mono px-1.5 py-0.5 rounded-[4px]
                    ${isActive ? 'bg-[var(--color-paper)] text-[var(--color-ink)]' : 'bg-[var(--color-paper)] text-[var(--color-ink-faint)]'}
                  `}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View Options */}
          <div className="flex items-center gap-6 shrink-0">
            <label className="flex items-center gap-3 cursor-pointer group">
              <span className="text-sm font-medium text-[var(--color-ink-soft)] group-hover:text-[var(--color-ink)] transition-colors">Hide Completed</span>
              <div className={`w-8 h-4 rounded-full transition-colors relative ${hideCompleted ? 'bg-[var(--color-honey)]' : 'bg-[var(--color-line-strong)]'}`}>
                <input type="checkbox" className="sr-only" checked={hideCompleted} onChange={(e) => setHideCompleted(e.target.checked)} />
                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${hideCompleted ? 'translate-x-4' : ''}`} />
              </div>
            </label>
            {tasks.length > 0 && (
              <button
                onClick={handleStartFreshClick}
                className="flex items-center gap-1.5 text-sm font-medium text-red-500/80 hover:text-red-600 transition-colors cursor-pointer"
              >
                Start Fresh
                <Broom size={14} weight="regular" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-6">
        {/* Bruno Banner */}
        {tasks.length > 0 && !aiLoading && (
          <div className="bg-[var(--color-settings-card)] border border-[var(--color-line)] rounded-[20px] p-4 flex items-center justify-between gap-4 shadow-sm mb-2">
            <div className="flex items-center gap-4.5">
              <div className="w-10 h-10 rounded-full bg-[var(--color-paper)] border border-[var(--color-line)] flex items-center justify-center shrink-0">
                <BrunoAvatar mood="happy" size="sm" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-honey-deep)] font-bold">
                  BRUNO · AUTO-SORTED
                </div>
                <p className="text-xs text-[var(--color-ink)] leading-normal">
                  {topHighPriorityTask ? (
                    <>Your <span className="italic">&quot;{topHighPriorityTask.title}&quot;</span> moved up. Let&apos;s knock it out.</>
                  ) : (
                    "Your workload is cleanly organized for the day."
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowWhyModal(true)}
              className="border border-[var(--color-line)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)] px-3.5 py-1 rounded-full text-xs font-mono transition-colors shrink-0 cursor-pointer"
            >
              Why?
            </button>
          </div>
        )}

        {/* AI Status */}
        {aiLoading && (
          <div className="flex items-center gap-2.5 text-xs text-[var(--color-ink-soft)] font-mono py-1 mb-2">
            <div className="w-3.5 h-3.5 border border-[var(--color-honey-deep)] border-t-transparent rounded-full animate-spin" />
            AI is organizing your tasks...
          </div>
        )}

        {/* Task List */}
        {filteredTasks.length === 0 ? (
          <div className="bg-transparent border border-[var(--color-line)]/60 rounded-[22px] p-12 flex flex-col items-center justify-center text-center">
            <BrunoThinkingIllustration maxHeight={160} />
            <h2 className="mt-4 text-lg font-medium text-[var(--color-ink)] font-serif italic">
              {activeTab !== 'all' ? `All caught up on ${activeTab}!` : 'No tasks yet'}
            </h2>
            <p className="mt-2 text-[var(--color-ink-soft)] text-sm max-w-sm">
              Enjoy the calm, or hit add task to put something new on your plate.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
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
      </div>

      {/* Start Fresh Confirmation Modal */}
      <AnimatePresence>
        {showStartFreshConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowStartFreshConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[var(--color-settings-card)] border border-[var(--color-line)] rounded-[22px] p-6 z-10 shadow-2xl"
            >
              <h2 className="text-lg font-serif italic font-semibold text-red-600 mb-2">
                Start fresh?
              </h2>
              <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed mb-6">
                Are you sure you want to delete all{' '}
                <span className="font-semibold text-[var(--color-ink)]">{tasks.length} tasks</span>{' '}
                and start fresh? This cannot be undone.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowStartFreshConfirm(false)}
                  className="flex-1 py-2.5 rounded-[14px] font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmStartFresh}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-[14px] font-medium text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Clearing...' : 'Delete all tasks'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Why Modal */}
      <AnimatePresence>
        {showWhyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowWhyModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[var(--color-settings-card)] border border-[var(--color-line)] rounded-[22px] p-6 z-10 shadow-2xl"
            >
              <h2 className="text-lg font-serif italic font-semibold text-[var(--color-honey-deep)] mb-2">
                How Bruno sorts your workspace.
              </h2>
              <div className="space-y-3.5 text-xs text-[var(--color-ink-soft)] font-sans leading-relaxed">
                <p>Bruno automatically analyzes your tasks based on priority tags, proximity to due dates, and contextual details to establish an optimized timeline.</p>
                <p>Critical tasks are elevated to the top of the queue, while lower-priority elements are deferred, preventing decision fatigue.</p>
              </div>
              <button
                onClick={() => setShowWhyModal(false)}
                className="mt-6 w-full py-2.5 bg-[var(--color-ink)] hover:bg-[var(--color-ink-soft)] text-[var(--color-paper)] text-xs font-semibold uppercase tracking-wider rounded-[14px] transition-colors cursor-pointer"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ShameFreeRescheduleModal
        isOpen={!!rescheduleTaskId}
        onClose={() => setRescheduleTaskId(null)}
        onReschedule={(date) => { if (rescheduleTaskId) doReschedule(rescheduleTaskId, date); }}
        taskTitle={rescheduleTask?.title || ''}
      />

      {/* Simplified Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-32 px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="relative w-full max-w-2xl bg-[var(--color-settings-card)] border border-[var(--color-line)] rounded-[22px] p-4 z-10 shadow-2xl">
            <form onSubmit={handleAddTask} className="flex flex-col">
              <input
                type="text"
                value={taskInput}
                onChange={e => setTaskInput(e.target.value)}
                placeholder="Finish biology reading tomorrow at 4pm #Personal ~30m"
                required autoFocus
                className="w-full px-4 pt-4 pb-6 bg-transparent text-lg font-medium text-[var(--color-ink)] placeholder-[var(--color-ink-faint)] focus:outline-none"
              />

              {/* Extra Options Toggle & Hints Row */}
              <div className="flex items-center gap-2 px-4 pb-4">
                <button type="button" onClick={() => setShowExtraOptions(!showExtraOptions)} className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] flex items-center gap-1.5 bg-[var(--color-paper)] border border-[var(--color-line)] rounded-md px-2 py-1 transition-colors cursor-pointer">
                  <Plus size={14} weight="bold" />
                  <span className="text-xs font-medium">Options</span>
                </button>
                {overrideDueDate && <span className="text-[10px] font-mono bg-[var(--color-paper)] border border-[var(--color-line)] px-2 py-1 rounded text-[var(--color-ink)]">Due: {overrideDueDate}</span>}
                {overridePriority && <span className="text-[10px] font-mono bg-[var(--color-paper)] border border-[var(--color-line)] px-2 py-1 rounded text-[var(--color-ink)]">{overridePriority}</span>}
              </div>

              {/* Extra Collapsible Options */}
              <AnimatePresence>
                {showExtraOptions && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-[var(--color-line)] mx-4 pt-4 mb-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono tracking-widest text-[var(--color-ink-faint)] uppercase mb-1.5">Priority</label>
                        <select value={overridePriority || ''} onChange={e => setOverridePriority(e.target.value as TaskPriority || null)} className="w-full px-2 py-1.5 bg-[var(--color-settings-bg)] border border-[var(--color-line)] rounded text-[var(--color-ink)] text-xs focus:outline-none focus:border-[var(--color-ink-soft)]">
                          <option value="">Auto/Parse</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono tracking-widest text-[var(--color-ink-faint)] uppercase mb-1.5">Est. Time (min)</label>
                        <input type="number" value={overrideTime || ''} onChange={e => setOverrideTime(parseInt(e.target.value) || null)} placeholder="Auto/Parse" className="w-full px-2 py-1.5 bg-[var(--color-settings-bg)] border border-[var(--color-line)] rounded text-[var(--color-ink)] text-xs focus:outline-none focus:border-[var(--color-ink-soft)]" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-mono tracking-widest text-[var(--color-ink-faint)] uppercase mb-1.5">Explicit Due Date</label>
                        <input type="date" value={overrideDueDate || ''} onChange={e => setOverrideDueDate(e.target.value || null)} className="w-full px-2 py-1.5 bg-[var(--color-settings-bg)] border border-[var(--color-line)] rounded text-[var(--color-ink)] text-xs focus:outline-none focus:border-[var(--color-ink-soft)]" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-end gap-2 px-4 pt-4 border-t border-[var(--color-line)]">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-xs font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={saving || !taskInput.trim()} className="px-6 py-2 bg-[var(--color-ink)] hover:bg-[var(--color-ink-soft)] text-[var(--color-paper)] rounded-full text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer">
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
