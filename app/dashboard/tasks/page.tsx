'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ensureUserProfile } from '@/lib/supabase/ensure-profile';
import OllieAvatar from '@/components/ollie/OllieAvatar';
import Link from 'next/link';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  created_at: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setTasks(data as Task[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSaving(true);

    try {
      const { user, error: profileError } = await ensureUserProfile(supabase);
      if (profileError || !user) {
        console.error("Auth/profile error:", profileError);
        alert("Please log in again.");
        return;
      }

      // @ts-expect-error - Database type doesn't resolve tasks Insert correctly
      const { error } = await supabase.from('tasks').insert({
        user_id: user.id,
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        priority: newPriority,
        due_date: newDueDate || null,
        status: 'todo',
      });

      if (error) {
        console.error("Insert error:", JSON.stringify(error, null, 2));
        alert("Failed to add task: " + (error.message || error.details || JSON.stringify(error)));
      } else {
        setNewTitle('');
        setNewDescription('');
        setNewPriority('medium');
        setNewDueDate('');
        setShowAddModal(false);
        fetchTasks();
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(taskId: string, currentStatus: string) {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    // @ts-expect-error - Database type doesn't resolve tasks Update correctly
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    fetchTasks();
  }

  async function deleteTask(taskId: string) {
    await supabase.from('tasks').delete().eq('id', taskId);
    fetchTasks();
  }

  const priorityColors = {
    low: 'text-slate-400 bg-slate-500/10',
    medium: 'text-blue-400 bg-blue-500/10',
    high: 'text-amber-400 bg-amber-500/10',
    urgent: 'text-red-400 bg-red-500/10',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Tasks</h1>
        <button
          id="tasks-add-button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-xl transition-all duration-200 hover:shadow-[var(--shadow-glow)] active:scale-[0.98] flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Task
        </button>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-12 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <OllieAvatar mood="happy" size="lg" />
          <h2 className="mt-4 text-lg font-semibold text-white">No tasks yet</h2>
          <p className="mt-2 text-slate-400 text-sm max-w-sm">
            Nothing on the list! Enjoy the calm, or add something new. I&apos;ll help you stay on track.
          </p>
          <button
            id="tasks-empty-add-button"
            onClick={() => setShowAddModal(true)}
            className="mt-6 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl transition-all duration-200 hover:shadow-[var(--shadow-glow)] active:scale-[0.98]"
          >
            + Create your first task
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`glass rounded-xl p-4 flex items-center gap-4 group hover:bg-surface-700/50 transition-colors ${
                task.status === 'done' ? 'opacity-60' : ''
              }`}
            >
              <button
                onClick={() => toggleTask(task.id, task.status)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                  task.status === 'done'
                    ? 'bg-brand-500 border-brand-500 text-white'
                    : 'border-slate-500 hover:border-brand-400'
                }`}
              >
                {task.status === 'done' && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-slate-500' : 'text-white'}`}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{task.description}</p>
                )}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[task.priority]}`}>
                {task.priority}
              </span>
              {task.due_date && (
                <span className="text-xs text-slate-500">
                  {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
              <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-1"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-md glass rounded-2xl p-6 animate-fade-in-up">
            <h2 className="text-xl font-bold text-white mb-4">Add new task</h2>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">What do you need to do?</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Finish chapter 3 summary"
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 bg-surface-700 border border-surface-500 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes (optional)</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Any extra details..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-surface-700 border border-surface-500 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')}
                    className="w-full px-4 py-2.5 bg-surface-700 border border-surface-500 rounded-xl text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Due date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-700 border border-surface-500 rounded-xl text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-surface-700 hover:bg-surface-600 text-slate-300 font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
