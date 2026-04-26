'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import OllieBubble from '@/components/ollie/OllieBubble';
import OllieAvatar from '@/components/ollie/OllieAvatar';
import { getRandomGreeting, getTimeOfDay } from '@/lib/ollie';

// Stats card component
function StatCard({
  label,
  value,
  icon,
  trend,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color: 'brand' | 'accent' | 'info' | 'success';
}) {
  const colorMap = {
    brand: 'from-brand-600/20 to-brand-600/5 border-brand-600/20',
    accent: 'from-accent-500/20 to-accent-500/5 border-accent-500/20',
    info: 'from-info/20 to-info/5 border-info/20',
    success: 'from-success/20 to-success/5 border-success/20',
  };

  return (
    <div
      className={`
        rounded-2xl border p-5
        bg-gradient-to-br ${colorMap[color]}
        hover:scale-[1.02] transition-transform duration-200
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-sm font-medium">{label}</span>
        <span className="text-slate-500">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {trend && (
        <div className="mt-1 text-xs text-brand-400">{trend}</div>
      )}
    </div>
  );
}

// Quick action button
function QuickAction({
  label,
  icon,
  onClick,
  id,
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  id: string;
}) {
  return (
    <button
      onClick={onClick}
      id={id}
      className="flex items-center gap-3 px-4 py-3 rounded-xl glass-light hover:bg-surface-600 transition-all duration-200 group w-full text-left"
    >
      <span className="p-2 rounded-lg bg-brand-600/15 text-brand-400 group-hover:bg-brand-600/25 transition-colors">
        {icon}
      </span>
      <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
        {label}
      </span>
    </button>
  );
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
}

export default function DashboardPage() {
  const [greeting, setGreeting] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [activeGoals, setActiveGoals] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const fetchStats = useCallback(async () => {
    // Get all tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status, priority')
      .order('created_at', { ascending: false });

    if (tasks) {
      setTodayTasks(tasks.slice(0, 5) as Task[]);
      setTotalTasks(tasks.filter((t: { status: string }) => t.status !== 'done').length);
      setCompletedTasks(tasks.filter((t: { status: string }) => t.status === 'done').length);
    }

    // Get active goals count
    const { count } = await supabase
      .from('goals')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');
    
    setActiveGoals(count || 0);
    setStatsLoading(false);
  }, [supabase]);

  useEffect(() => {
    setGreeting(getRandomGreeting());
    setTimeOfDay(getTimeOfDay());
    fetchStats();
  }, [fetchStats]);

  async function toggleTask(taskId: string, currentStatus: string) {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    // @ts-expect-error - Database type doesn't resolve tasks Update correctly
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    fetchStats();
  }

  const ollieMood = timeOfDay === 'evening' ? 'gentle' as const : 'happy' as const;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header with time-based greeting */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            {timeOfDay === 'morning' && '☀️ Good morning'}
            {timeOfDay === 'afternoon' && '🌤️ Good afternoon'}
            {timeOfDay === 'evening' && '🌙 Good evening'}
          </h1>
          <p className="text-slate-400 mt-1">Here&apos;s what&apos;s on your radar today.</p>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Ollie greeting bubble */}
      {greeting && (
        <div className="animate-fade-in-up">
          <OllieBubble message={greeting} mood={ollieMood} size="md" />
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tasks Today"
          value={statsLoading ? '...' : totalTasks}
          color="brand"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          }
        />
        <StatCard
          label="Completed"
          value={statsLoading ? '...' : completedTasks}
          color="success"
          trend="All time"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
        />
        <StatCard
          label="Active Goals"
          value={statsLoading ? '...' : activeGoals}
          color="accent"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          }
        />
        <StatCard
          label="Focus Time"
          value="0h"
          color="info"
          trend="This week"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's tasks — takes 2 cols */}
        <div className="lg:col-span-2 glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
            Recent Tasks
          </h2>

          {todayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <OllieAvatar mood="happy" size="lg" />
              <p className="mt-4 text-slate-400 text-sm max-w-xs">
                Nothing on the list! Enjoy the calm, or add something new.
              </p>
              <button
                id="dashboard-add-first-task"
                onClick={() => router.push('/dashboard/tasks')}
                className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-xl transition-all duration-200 hover:shadow-[var(--shadow-glow)] active:scale-[0.98]"
              >
                + Add a task
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 p-3 rounded-xl hover:bg-surface-700/50 transition-colors ${
                    task.status === 'done' ? 'opacity-50' : ''
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
                  <span className={`text-sm ${task.status === 'done' ? 'line-through text-slate-500' : 'text-white'}`}>
                    {task.title}
                  </span>
                </div>
              ))}
              <button
                onClick={() => router.push('/dashboard/tasks')}
                className="w-full mt-2 py-2 text-sm text-brand-400 hover:text-brand-300 font-medium transition-colors"
              >
                View all tasks →
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions sidebar */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <QuickAction
                label="Add a new task"
                id="quick-action-add-task"
                onClick={() => router.push('/dashboard/tasks')}
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                }
              />
              <QuickAction
                label="Set a new goal"
                id="quick-action-set-goal"
                onClick={() => router.push('/dashboard/goals')}
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                }
              />
              <QuickAction
                label="Start focus timer"
                id="quick-action-focus-timer"
                onClick={() => router.push('/dashboard/focus')}
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                }
              />
              <QuickAction
                label="View your habits"
                id="quick-action-habits"
                onClick={() => router.push('/dashboard/habits')}
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* Ollie's Tip of the Day */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              🦉 Ollie&apos;s Tip
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Start your day with your most important task. Your brain is freshest in the first 2 hours — wise move to use them well.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
