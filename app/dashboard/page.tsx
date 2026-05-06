'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import OllieAvatar from '@/components/ollie/OllieAvatar';
import { getRandomGreeting } from '@/lib/ollie';
import CommandCenter from '@/components/dashboard/CommandCenter';
import TaskHistory from '@/components/dashboard/TaskHistory';
import TrashBin from '@/components/dashboard/TrashBin';
import OllieSuggestionCard from '@/components/ollie/OllieSuggestionCard';
import WeeklyReviewCard from '@/components/ollie/WeeklyReviewCard';
import { format } from 'date-fns';
import { Calendar, Pulse, Rocket, Sparkle, ArrowRight, Clock, Archive, CaretDown, Lightning } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import GardenOfDone from '@/components/tasks/GardenOfDone';
import type { ScheduleBlock } from '@/lib/ai/agentic-scheduler';

// Stats card component
function StatCard({ label, value, icon, trend }: { label: string; value: string | number; icon: React.ReactNode; trend?: string }) {
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
  const [activeProjects, setActiveProjects] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);
  const [rolloverMessage, setRolloverMessage] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<'nominal' | 'degraded' | 'offline'>('nominal');
  const [schedule, setSchedule] = useState<ScheduleBlock[] | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [showArchives, setShowArchives] = useState(false);
  const [allCompletedTasks, setAllCompletedTasks] = useState<any[]>([]);
  const [currentEnergy, setCurrentEnergy] = useState<'low' | 'medium' | 'high'>('medium');
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const fetchStats = useCallback(async (existingUser?: any) => {
    // 1. Get User
    const user = existingUser || (await supabase.auth.getUser()).data.user;
    if (!user) return;

    // 2. Get all tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status, priority, completed, completed_at, deleted_at')
      .is('deleted_at', null)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (tasks) {
      const allTasks = tasks as unknown as any[];
      const incompleteTasks = allTasks.filter((t) => !t.completed);
      setTodayTasks(incompleteTasks.slice(0, 5));
      setTotalTasks(incompleteTasks.length);
      setCompletedTasks(allTasks.filter((t) => t.completed).length);
      setAllCompletedTasks(allTasks.filter((t) => t.completed));
    }

    // 3. Get active goals count
    const { count } = await supabase
      .from('goals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active');
    
    setActiveProjects(count || 0);
    setStatsLoading(false);

    // 4. Fetch today's schedule
    const { data: scheduleData } = await supabase
      .from('schedules')
      .select('schedule_json')
      .eq('user_id', user.id)
      .eq('date', format(new Date(), 'yyyy-MM-dd'))
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (scheduleData?.[0]) {
      setSchedule(scheduleData[0].schedule_json as ScheduleBlock[]);
    }
    setScheduleLoading(false);
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
    } catch {
      console.error('Rollover failed');
    }
  }, [fetchStats]);
 
  const checkSystemHealth = useCallback(async () => {
    try {
      const start = Date.now();
      const { error } = await supabase.from('tasks').select('id').limit(1);
      const latency = Date.now() - start;
      
      if (error) {
        setSystemStatus('offline');
      } else if (latency > 1000) {
        setSystemStatus('degraded');
      } else {
        setSystemStatus('nominal');
      }
    } catch {
      setSystemStatus('offline');
    }
  }, [supabase]);

  useEffect(() => {
    requestAnimationFrame(() => {
      const hours = new Date().getHours();
      if (hours < 12) setTimeOfDay('morning');
      else if (hours < 17) setTimeOfDay('afternoon');
      else setTimeOfDay('evening');

      // Fetch user data and stats
      const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Profile data
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

          // Stats data (passing user to avoid second getUser)
          await fetchStats(user);
        } else {
          setGreeting(getRandomGreeting());
          setStatsLoading(false);
          setScheduleLoading(false);
        }
      };

      void fetchData();
      void performRollover();
      void checkSystemHealth();
    });
  }, [fetchStats, performRollover, checkSystemHealth, supabase]);

  async function toggleTask(taskId: string, currentlyCompleted: boolean) {
    const updates = currentlyCompleted
      ? { completed: false, completed_at: null, status: 'todo' }
      : { completed: true, completed_at: new Date().toISOString(), status: 'done' };
    await supabase.from('tasks')
      .update(updates).eq('id', taskId);
    fetchStats();
  }

  async function deleteTask(taskId: string) {
    // Soft delete
    await supabase.from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', taskId);
    fetchStats();
  }

  const ollieMood = timeOfDay === 'evening' ? 'gentle' as const : 'happy' as const;

  // Next Action Logic
  const currentOrNext = useMemo(() => {
    if (!schedule) return null;
    const now = new Date();
    
    // Parse strings to Dates if necessary
    const blocks = schedule.map(b => ({
      ...b,
      startTime: new Date(b.startTime),
      endTime: new Date(b.endTime)
    }));

    const current = blocks.find(b => now >= b.startTime && now < b.endTime);
    if (current) return { ...current, status: 'NOW' };

    const next = blocks.find(b => b.startTime > now);
    if (next) return { ...next, status: 'UP NEXT' };

    return null;
  }, [schedule]);

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
          <p className="text-muted mt-1 font-medium italic">Your brain wasn&apos;t built to store deadlines. It was built to solve them.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-card border-2 border-border p-1 rounded-2xl shadow-sm">
            {(['low', 'medium', 'high'] as const).map((e) => (
              <button
                key={e}
                onClick={() => setCurrentEnergy(e)}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  currentEnergy === e 
                    ? 'bg-surface-900 text-white shadow-md scale-105' 
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted bg-card border-2 border-border px-4 py-2 rounded-2xl shadow-sm">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(), 'EEEE, MMMM do')}</span>
          </div>
        </div>
      </div>

      {/* Energy Status Pill */}
      <div className="flex items-center gap-2 animate-fade-in">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 font-black text-[10px] uppercase tracking-widest ${
          currentEnergy === 'low' ? 'bg-amber-50 border-amber-200 text-amber-700' :
          currentEnergy === 'high' ? 'bg-green-50 border-green-200 text-green-700' :
          'bg-brand-50 border-brand-200 text-brand-700'
        }`}>
          <Lightning weight="fill" className={currentEnergy === 'high' ? 'animate-pulse' : ''} />
          Current Vibe: {currentEnergy} Energy
        </div>
        {currentEnergy === 'low' && (
          <span className="text-[10px] text-muted font-bold italic animate-pulse">Ollie is filtering for low-lift work.</span>
        )}
      </div>

      {/* Daily Plan Preview - The "What now?" answer */}
      <div className="animate-fade-in-up">
        {scheduleLoading ? (
          <div className="h-48 glass animate-pulse flex items-center justify-center rounded-3xl border-2 border-dashed border-surface-200">
            <span className="text-muted font-bold uppercase tracking-widest text-xs">Scanning schedule...</span>
          </div>
        ) : (
          <div className="glass p-8 border-brand-200 bg-brand-50/30 group relative overflow-hidden rounded-3xl shadow-[8px_8px_0_0_var(--brand-100)]">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-all duration-500 translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0">
               <Rocket size={120} weight="fill" className="text-brand-500" />
            </div>

            <div className="relative z-10">
              <h2 className="text-xs font-black uppercase tracking-widest text-brand-500 mb-6 flex items-center gap-2">
                <Pulse size={18} weight="bold" />
                The Daily Plan
              </h2>

              {!currentOrNext ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black text-foreground tracking-tight uppercase">Ready to focus?</h3>
                    <p className="text-muted font-bold max-w-md italic leading-relaxed text-lg">No Daily Plan found for today. Generate one in seconds to clear your mental clutter.</p>
                  </div>
                  <Button 
                    size="lg" 
                    onClick={() => router.push('/dashboard/daily-plan')}
                    className="h-14 px-8 text-lg gap-3 bg-brand-500 hover:bg-brand-600 text-white border-none shadow-[4px_4px_0px_0px_var(--brand-700)] rounded-2xl active:translate-y-1 active:shadow-none transition-all"
                  >
                    <Sparkle size={24} weight="fill" />
                    Create Daily Plan
                  </Button>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-400 mb-1">
                        {currentOrNext.status}
                      </span>
                      <h3 className="text-4xl font-black text-foreground tracking-tighter uppercase leading-none">
                        {currentOrNext.title}
                      </h3>
                    </div>
                    <div className="ml-auto flex items-center gap-4 bg-white/50 px-6 py-3 rounded-2xl border-2 border-brand-100">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-muted uppercase tracking-widest">Target Start</span>
                        <span className="text-2xl font-black text-brand-600 tracking-tighter">
                          {format(new Date(currentOrNext.startTime), 'h:mm a')}
                        </span>
                      </div>
                      <Clock size={32} weight="duotone" className="text-brand-400" />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Button 
                      onClick={() => router.push('/dashboard/daily-plan')}
                      className="h-12 px-6 gap-2 bg-surface-900 text-white rounded-xl shadow-[4px_4px_0_0_var(--surface-500)]"
                    >
                      View Full Timeline
                      <ArrowRight size={20} weight="bold" />
                    </Button>
                    
                    {currentOrNext.taskId && (
                      <Button 
                        variant="outline"
                        className="h-12 border-2 border-surface-200 rounded-xl"
                        onClick={() => toggleTask(currentOrNext.taskId!, false)}
                      >
                        Mark as Done
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Tasks"
          value={statsLoading ? '...' : totalTasks}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          }
        />
        <StatCard
          label="Completed Today"
          value={statsLoading ? '...' : completedTasks}
          trend="Tasks Cleared"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
        />
        <StatCard
          label="Active Projects"
          value={statsLoading ? '...' : activeProjects}
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
          value={systemStatus === 'nominal' ? 'Stable' : systemStatus === 'degraded' ? 'Slow' : 'Offline'}
          trend={systemStatus === 'nominal' ? 'System healthy' : systemStatus === 'degraded' ? 'High latency' : 'Database error'}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
      </div>

      {/* Ollie's Suggestions — constraint mining results */}
      <OllieSuggestionCard />

        {/* Today's tasks - centered and cleaner */}
        <div className="lg:col-span-3 glass p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
              <Clock weight="bold" className="size-6" />
              Next Actions
            </h2>
          </div>

          {todayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <OllieAvatar mood="happy" size="lg" />
              <p className="mt-6 text-slate-400 text-base max-w-xs font-medium">
                The horizon is clear. Add a task from the Quick Add menu to begin.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-w-4xl mx-auto">
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center group gap-4 p-4 rounded-2xl bg-surface-50/50 border-2 border-transparent hover:border-surface-200 hover:bg-white transition-all duration-300"
                >
                  <button
                    onClick={() => toggleTask(task.id, task.completed)}
                    className="w-6 h-6 rounded-lg border-2 border-slate-300 hover:border-brand-500 flex items-center justify-center shrink-0 transition-all active:scale-90"
                  >
                  </button>
                  <span className="text-base font-bold text-foreground flex-1 truncate">
                    {task.title}
                  </span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-2 text-muted hover:text-error hover:bg-error/5 rounded-lg transition-all"
                      title="Delete task"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              <div className="pt-6 flex justify-center">
                <button
                  onClick={() => router.push('/dashboard/tasks')}
                  className="px-6 py-2 text-sm text-brand-500 hover:text-brand-600 font-black uppercase tracking-widest transition-all hover:gap-2 flex items-center gap-1"
                >
                  View All Tasks <span>→</span>
                </button>
              </div>
            </div>
          )}
        </div>

      {/* Garden of Done — Abstract Visual Momentum */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <GardenOfDone completedTasks={allCompletedTasks} />
      </div>

      {/* Weekly Review Card */}
      <WeeklyReviewCard />

      {/* System Archives - De-emphasized */}
      <div className="space-y-4">
        <button 
          onClick={() => setShowArchives(!showArchives)}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted hover:text-foreground transition-colors group"
        >
          <Archive size={16} />
          <span>Archives</span>
          <CaretDown size={14} className={`transition-transform duration-300 ${showArchives ? 'rotate-180' : ''}`} />
        </button>

        {showArchives && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
            <div className="opacity-70 grayscale hover:grayscale-0 transition-all duration-300">
              <TaskHistory />
            </div>
            <div className="opacity-70 grayscale hover:grayscale-0 transition-all duration-300">
              <TrashBin />
            </div>
          </div>
        )}
      </div>

      <CommandCenter />
    </div>
  );
}
