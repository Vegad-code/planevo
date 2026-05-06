'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import type { Task, BestTimeOfDay, EnergyLevel } from '@/types/database';
import { useTaskGroups } from '@/hooks/useTaskGroups';
import { useTaskAI } from '@/hooks/useTaskAI';
import { useTaskActions } from '@/hooks/useTaskActions';
import { showToast } from '@/hooks/use-toast';
import TaskGroup from './TaskGroup';
import ShameFreeRescheduleModal from './ShameFreeRescheduleModal';
import OllieAvatar from '@/components/ollie/OllieAvatar';
import GardenOfDone from './GardenOfDone';
import TrashBin from '@/components/dashboard/TrashBin';
import { calculateUserStats } from '@/lib/stats';
import { useFocusStore } from '@/store/useFocusStore';
import { useRouter } from 'next/navigation';

export default function EnhancedTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Reschedule modal
  const [rescheduleTaskId, setRescheduleTaskId] = useState<string | null>(null);
  const rescheduleTask = tasks.find(t => t.id === rescheduleTaskId);

  // Add task form
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newEstimatedMinutes, setNewEstimatedMinutes] = useState(30);
  const [newBestTime, setNewBestTime] = useState<BestTimeOfDay>('anytime');
  const [newEnergy, setNewEnergy] = useState<EnergyLevel>('medium');
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

  const { saving, addTask, toggleComplete, deleteTask, doReschedule, moveToWaiting, breakDownTask, startFresh } = useTaskActions(handleRefresh);

  // User stats
  const stats = useMemo(() => calculateUserStats(tasks), [tasks]);

  // Fetch tasks on mount
  useEffect(() => { 
    requestAnimationFrame(() => {
      fetchTasks(); 
    });
  }, [fetchTasks]);

  // Fetch AI priorities when tasks change
  useEffect(() => {
    if (tasks.length > 0) fetchAIPriorities(tasks);
  }, [tasks, fetchAIPriorities]);

  // Groups for the list view
  const groups = useTaskGroups(tasks, aiResponse);

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
    });
    if (result.error) {
      showToast.error('Task Action Failed', result.error);
    } else {
      setNewTitle(''); setNewDescription(''); setNewEstimatedMinutes(30);
      setNewBestTime('anytime'); setNewEnergy('medium'); setNewDueDate('');
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
        <div className="w-8 h-8 border-2 border-[#4ECDC4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">Tasks</h1>
        <div className="flex items-center gap-3">
          {/* Consistency Stats */}
          <div className="hidden sm:flex items-center gap-4 px-4 py-2 bg-surface-800/30 border-2 border-border/50">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-muted leading-none">Consistency</span>
              <span className="text-sm font-black text-brand-400">{stats.consistencyScore}%</span>
            </div>
            <div className="w-px h-6 bg-border/50" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-muted leading-none">Streak</span>
              <span className="text-sm font-black text-amber-500">{stats.currentStreak}d</span>
            </div>
          </div>

          {/* Start Fresh */}
          {tasks.length > 0 && (
            <button
              onClick={handleStartFresh}
              className="flex items-center gap-1.5 px-3 py-2 bg-transparent border-2 border-red-500/30 text-red-400/70 hover:border-red-500 hover:text-red-500 text-xs font-bold uppercase tracking-wide transition-colors"
              title="Delete all tasks"
            >
              🧹 Start fresh
            </button>
          )}

          {/* Add Task */}
          <button
            id="tasks-add-button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#4ECDC4] hover:bg-[#45b8b0] text-white text-sm font-bold uppercase tracking-wide border-2 border-[#4ECDC4] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Task
          </button>
        </div>
      </div>

      {/* AI status */}
      {aiLoading && (
        <div className="flex items-center gap-2 text-xs text-[#888]">
          <div className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" />
          AI is organizing your tasks...
        </div>
      )}
      {aiError && (
        <div className="text-xs text-[#888] bg-[#242424] border border-[#2A2A2A] px-3 py-2">
          {aiError} — using smart fallback sorting
        </div>
      )}
      {aiResponse?.encouraging_message && (
        <div className="text-sm text-[#999] italic">{aiResponse.encouraging_message}</div>
      )}

      {tasks.length === 0 ? (
        <div className="glass p-12 flex flex-col items-center justify-center text-center">
          <OllieAvatar mood="happy" size="lg" />
          <h2 className="mt-4 text-lg font-bold text-foreground">No tasks yet</h2>
          <p className="mt-2 text-[#888] text-sm max-w-sm">
            Nothing on the list! Enjoy the calm, or add something new.
          </p>
          <button id="tasks-empty-add-button" onClick={() => setShowAddModal(true)}
            className="mt-6 px-5 py-2.5 bg-[#4ECDC4] text-white text-sm font-bold uppercase border-2 border-[#4ECDC4]">
            + Create your first task
          </button>
        </div>
      ) : (
        <div>
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

      {/* Garden of Done */}
      <GardenOfDone completedTasks={tasks} />

      {/* Recovery Section */}
      <div className="mt-12">
        <TrashBin />
      </div>

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
            className="relative w-full max-w-md bg-[#1e1e1e] border-2 border-[#2A2A2A] p-6 z-10">
            <h2 className="text-xl font-bold text-white mb-4">Add new task</h2>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#888] mb-1.5 uppercase tracking-wider">What do you need to do?</label>
                <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Finish chapter 3 summary" required autoFocus
                  className="w-full px-4 py-2.5 bg-[#242424] border-2 border-[#2A2A2A] text-white placeholder-[#555] focus:outline-none focus:border-[#4ECDC4]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#888] mb-1.5 uppercase tracking-wider">Notes (optional)</label>
                <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)}
                  placeholder="Any extra details..." rows={2}
                  className="w-full px-4 py-2.5 bg-[#242424] border-2 border-[#2A2A2A] text-white placeholder-[#555] focus:outline-none focus:border-[#4ECDC4] resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#888] mb-1.5 uppercase tracking-wider">Time estimate</label>
                  <select value={newEstimatedMinutes} onChange={e => setNewEstimatedMinutes(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-[#242424] border-2 border-[#2A2A2A] text-white focus:outline-none focus:border-[#4ECDC4]">
                    <option value={5}>5 min</option><option value={10}>10 min</option>
                    <option value={15}>15 min</option><option value={30}>30 min</option>
                    <option value={45}>45 min</option><option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option><option value={120}>2 hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#888] mb-1.5 uppercase tracking-wider">Best time</label>
                  <select value={newBestTime} onChange={e => setNewBestTime(e.target.value as BestTimeOfDay)}
                    className="w-full px-4 py-2.5 bg-[#242424] border-2 border-[#2A2A2A] text-white focus:outline-none focus:border-[#4ECDC4]">
                    <option value="anytime">Anytime</option><option value="morning">☀️ Morning</option>
                    <option value="afternoon">🌤️ Afternoon</option><option value="evening">🌙 Evening</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#888] mb-1.5 uppercase tracking-wider">Energy needed</label>
                  <select value={newEnergy} onChange={e => setNewEnergy(e.target.value as EnergyLevel)}
                    className="w-full px-4 py-2.5 bg-[#242424] border-2 border-[#2A2A2A] text-white focus:outline-none focus:border-[#4ECDC4]">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#888] mb-1.5 uppercase tracking-wider">Due date</label>
                  <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#242424] border-2 border-[#2A2A2A] text-white focus:outline-none focus:border-[#4ECDC4]" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-[#242424] hover:bg-[#2A2A2A] text-[#888] font-bold border-2 border-[#2A2A2A] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-[#4ECDC4] hover:bg-[#45b8b0] text-white font-bold border-2 border-[#4ECDC4] transition-colors disabled:opacity-50">
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
