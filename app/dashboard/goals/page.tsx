'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ensureUserProfile } from '@/lib/supabase/ensure-profile';
import OllieAvatar from '@/components/ollie/OllieAvatar';

interface Goal {
  id: string;
  title: string;
  deadline: string | null;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  const fetchGoals = useCallback(async () => {
    const { data } = await supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setGoals(data as Goal[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  async function handleAddGoal(e: React.FormEvent) {
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

      // @ts-expect-error - Database type doesn't resolve goals Insert correctly
      const { error } = await supabase.from('goals').insert({
        user_id: user.id,
        title: newTitle.trim(),
        deadline: newTargetDate || null,
        status: 'active',
      });

      if (error) {
        console.error("Insert error:", JSON.stringify(error, null, 2));
        alert("Failed to add goal: " + (error.message || error.details || JSON.stringify(error)));
      } else {
        setNewTitle('');
        setNewTargetDate('');
        setShowAddModal(false);
        fetchGoals();
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteGoal(goalId: string) {
    await supabase.from('goals').delete().eq('id', goalId);
    fetchGoals();
  }

  async function toggleGoalStatus(goalId: string, currentStatus: string) {
    const newStatus = currentStatus === 'completed' ? 'active' : 'completed';
    // @ts-expect-error - Database type doesn't resolve goals Update correctly
    await supabase.from('goals').update({ status: newStatus }).eq('id', goalId);
    fetchGoals();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Goals</h1>
        <button
          id="goals-add-button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-xl transition-all duration-200 hover:shadow-[var(--shadow-glow)] active:scale-[0.98] flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Goal
        </button>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-12 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : goals.length === 0 ? (
        <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <OllieAvatar mood="thinking" size="lg" />
          <h2 className="mt-4 text-lg font-semibold text-white">No goals set</h2>
          <p className="mt-2 text-slate-400 text-sm max-w-sm">
            What&apos;s something big you&apos;d like to achieve? Tell me, and I&apos;ll break it down into bite-sized steps.
          </p>
          <button
            id="goals-empty-add-button"
            onClick={() => setShowAddModal(true)}
            className="mt-6 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl transition-all duration-200 hover:shadow-[var(--shadow-glow)] active:scale-[0.98]"
          >
            + Set your first goal
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((goal) => (
            <div key={goal.id} className="glass rounded-2xl p-6 group hover:border-brand-500/20 border border-transparent transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className={`font-semibold ${goal.status === 'completed' ? 'line-through text-slate-500' : 'text-white'}`}>
                    {goal.title}
                  </h3>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => toggleGoalStatus(goal.id, goal.status)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      goal.status === 'completed'
                        ? 'text-brand-400 bg-brand-500/10'
                        : 'text-slate-500 hover:text-brand-400 hover:bg-brand-500/10'
                    }`}
                    title={goal.status === 'completed' ? 'Mark as active' : 'Mark as completed'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  goal.status === 'completed' ? 'text-brand-400 bg-brand-500/10' : 'text-blue-400 bg-blue-500/10'
                }`}>{goal.status}</span>
                {goal.deadline && (
                  <span className="text-xs text-slate-500">
                    Deadline: {new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-md glass rounded-2xl p-6 animate-fade-in-up">
            <h2 className="text-xl font-bold text-white mb-4">Set a new goal</h2>
            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">What&apos;s the goal?</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Learn conversational Spanish"
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 bg-surface-700 border border-surface-500 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Target date</label>
                <input
                  type="date"
                  value={newTargetDate}
                  onChange={(e) => setNewTargetDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-700 border border-surface-500 rounded-xl text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
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
                  {saving ? 'Creating...' : 'Set Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
