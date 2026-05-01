'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import OllieBubble from '@/components/ollie/OllieBubble';
import OllieAvatar from '@/components/ollie/OllieAvatar';
import { getRandomGreeting, getTimeOfDay } from '@/lib/ollie';
import FlightPlan from '@/components/dashboard/FlightPlan';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';

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
        border-2 border-border p-5
        bg-card
        hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-200
        shadow-[4px_4px_0px_0px_var(--border)]
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-muted text-xs font-black uppercase tracking-wider">{label}</span>
        <span className="text-muted">{icon}</span>
      </div>
      <div className="text-3xl font-black text-foreground">{value}</div>
      {trend && (
        <div className="mt-2 text-xs font-bold text-brand-600 uppercase">{trend}</div>
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
      className="flex items-center gap-3 px-4 py-3 border-2 border-border bg-card hover:bg-muted/10 transition-all duration-200 group w-full text-left shadow-[2px_2px_0px_0px_var(--border)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
    >
      <span className="p-2 border-2 border-border bg-brand-50 text-brand-600 group-hover:bg-brand-100 transition-colors">
        {icon}
      </span>
      <span className="text-sm font-black uppercase tracking-tight text-foreground">
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
  completed: boolean;
}

export default function DashboardPage() {
  const [greeting, setGreeting] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [userName, setUserName] = useState<string | null>(null);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [activeGoals, setActiveGoals] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);
  const [rolloverMessage, setRolloverMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const fetchStats = useCallback(async () => {
    // Get all tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status, priority, completed')
      .order('created_at', { ascending: false });

    if (tasks) {
      const incompleteTasks = tasks.filter((t: any) => !t.completed);
      setTodayTasks(incompleteTasks.slice(0, 5) as Task[]);
      setTotalTasks(incompleteTasks.length);
      setCompletedTasks(tasks.filter((t: any) => t.completed).length);
    }

    // Get active goals count
    const { count } = await supabase
      .from('goals')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');
    
    setActiveGoals(count || 0);
    setStatsLoading(false);
  }, [supabase]);

  const performRollover = useCallback(async () => {
    try {
      const res = await fetch('/api/schedule/rollover', { method: 'POST' });
      if (!res.ok) {
        console.error('Rollover request failed with status:', res.status);
        return;
      }
      const data = await res.json();
      if (data.moved > 0) {
        setRolloverMessage(data.message);
        fetchStats();
      }
    } catch (err) {
      console.error('Rollover failed:', err);
    }
  }, [fetchStats]);

  useEffect(() => {
    const hours = new Date().getHours();
    if (hours < 12) setTimeOfDay('morning');
    else if (hours < 17) setTimeOfDay('afternoon');
    else setTimeOfDay('evening');

    // Fetch user name
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();
        if (data?.name) {
          setUserName(data.name);
          setGreeting(getRandomGreeting(data.name));
        } else {
          setGreeting(getRandomGreeting());
        }
      } else {
        setGreeting(getRandomGreeting());
      }
    };

    fetchUserData();
    fetchStats();
    performRollover();
  }, [fetchStats, performRollover, supabase]);

  async function toggleTask(taskId: string, currentlyCompleted: boolean) {
    const updates = currentlyCompleted
      ? { completed: false, completed_at: null, status: 'todo' }
      : { completed: true, completed_at: new Date().toISOString(), status: 'done' };
    await supabase.from('tasks')
      .update(updates).eq('id', taskId);
    fetchStats();
  }

  async function deleteTask(taskId: string) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    await supabase.from('tasks').delete().eq('id', taskId);
    fetchStats();
  }

  const ollieMood = timeOfDay === 'evening' ? 'gentle' as const : 'happy' as const;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header with time-based greeting */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter text-foreground">
            {timeOfDay === 'morning' && `☀️ Good morning${userName ? `, ${userName.trim().split(' ')[0]}` : ''}`}
            {timeOfDay === 'afternoon' && `🌤️ Good afternoon${userName ? `, ${userName.trim().split(' ')[0]}` : ''}`}
            {timeOfDay === 'evening' && `🌙 Good evening${userName ? `, ${userName.trim().split(' ')[0]}` : ''}`}
          </h1>
          <p className="text-muted mt-1 font-medium italic">Here&apos;s what&apos;s on your radar today.</p>
        </div>

        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted">
          <Calendar className="w-4 h-4" />
          <span>{format(new Date(), 'EEEE, MMMM do')}</span>
        </div>
      </div>

      {/* Navigator briefing bubble */}
      {greeting && (
        <div className="animate-fade-in-up space-y-4 max-w-2xl">
          <OllieBubble message={greeting} mood={ollieMood} size="sm" />
          
          {rolloverMessage && (
            <div className="flex items-center gap-3 p-4 bg-brand-50 border-2 border-brand-200 rounded-2xl animate-bounce-subtle">
              <span className="text-xl">🌿</span>
              <p className="text-sm font-bold text-brand-900 italic">{rolloverMessage}</p>
              <button 
                onClick={() => setRolloverMessage(null)}
                className="ml-auto text-brand-400 hover:text-brand-600"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Stress Relief"
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
          label="Flight Velocity"
          value={statsLoading ? '...' : completedTasks}
          color="success"
          trend="Clearance"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
        />
        <StatCard
          label="Active Missions"
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
          label="System Status"
          value="Nominal"
          color="info"
          trend="All clear"
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
        <div className="lg:col-span-2 glass p-6">
          <h2 className="text-xl font-black uppercase tracking-tight text-foreground mb-4 flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
            Active Flight Plan
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
                  className="flex items-center group gap-3 p-3 rounded-xl hover:bg-surface-700/50 transition-colors"
                >
                  <button
                    onClick={() => toggleTask(task.id, task.completed)}
                    className="w-5 h-5 rounded-md border-2 border-slate-500 hover:border-brand-400 flex items-center justify-center shrink-0 transition-colors"
                  >
                    {/* Checkbox is always empty here because only incomplete tasks are shown */}
                  </button>
                  <span className="text-sm text-foreground flex-1 truncate">
                    {task.title}
                  </span>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="p-1 text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete task"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
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

        {/* Sidebar */}
        <div className="space-y-6">
          <FlightPlan />

          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-black uppercase tracking-tight text-foreground mb-4">Quick Actions</h2>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
