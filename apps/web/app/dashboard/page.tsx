'use client';

/**
 * Plan Pilot v1 Dashboard — "One Next Action"
 *
 * Per STRATEGY.md, the dashboard does ONE thing: tell the user what to do right now.
 * Surface area is reduced; visibility of CORE PAINKILLERS is not (see STRATEGY.md §4).
 *
 * Order of attention (top → bottom):
 *   1. Time-of-day greeting + today's date
 *   2. Connection status pill — Canvas + Google Calendar (1-click to connect)
 *   3. NEXT ACTION HERO — current/upcoming block from today's Daily Plan,
 *      OR a context-aware empty state CTA
 *   4. Full day's plan — collapsed expander (only shown when a plan exists)
 *   5. Three small numbers: due today, done today, open tasks
 *   6. Today's tasks — collapsed expander (5 max + "view all" link)
 *
 * Painkiller visibility rule (STRATEGY.md §16):
 * Daily Plan, Canvas sync, and Google Calendar sync MUST be discoverable from
 * this page within one click. Vitamins (habits, focus, projects, garden, etc.)
 * stay archived behind feature flags.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format, isToday } from 'date-fns';
import {
  ArrowRight, Sparkle, Clock, Target, CheckCircle, Lightning,
  GraduationCap, CalendarBlank, CaretDown,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { getRandomGreeting } from '@/lib/ollie';
import type { ScheduleBlock } from '@/lib/ai/agentic-scheduler';

interface MiniTask {
  id: string;
  title: string;
  completed: boolean;
  completed_at: string | null;
  due_date: string | null;
}

interface ConnectionStatus {
  canvasConnected: boolean;
  canvasDueCount: number;        // assignments due in next 7 days
  googleConnected: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // State
  const [userName, setUserName] = useState<string | null>(null);
  const [greeting, setGreeting] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [tasks, setTasks] = useState<MiniTask[]>([]);
  const [schedule, setSchedule] = useState<ScheduleBlock[] | null>(null);
  const [connections, setConnections] = useState<ConnectionStatus>({
    canvasConnected: false,
    canvasDueCount: 0,
    googleConnected: false,
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [energyLevel, setEnergyLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [showTasks, setShowTasks] = useState(false);
  const [showFullPlan, setShowFullPlan] = useState(false);

  // --- Data load ---
  const fetchAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Profile + connection state
    const { data: profile } = await supabase
      .from('users')
      .select('name, canvas_token, google_calendar_connected')
      .eq('id', user.id)
      .single();
    if (profile?.name) {
      setUserName(profile.name);
      setGreeting(getRandomGreeting(profile.name));
    } else {
      setGreeting(getRandomGreeting());
    }

    // Canvas due count (next 7 days)
    let canvasDueCount = 0;
    if (profile?.canvas_token) {
      const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('canvas_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('due_at', new Date().toISOString())
        .lte('due_at', sevenDaysOut);
      canvasDueCount = count ?? 0;
    }

    setConnections({
      canvasConnected: !!profile?.canvas_token,
      canvasDueCount,
      googleConnected: !!profile?.google_calendar_connected,
    });

    // Tasks
    const { data: taskRows } = await supabase
      .from('tasks')
      .select('id, title, completed, completed_at, due_date')
      .is('deleted_at', null)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setTasks((taskRows as unknown as MiniTask[]) ?? []);

    // Today's schedule
    const { data: scheduleRows } = await supabase
      .from('schedules')
      .select('schedule_json')
      .eq('user_id', user.id)
      .eq('date', format(new Date(), 'yyyy-MM-dd'))
      .order('created_at', { ascending: false })
      .limit(1);
    if (scheduleRows?.[0]) {
      setSchedule(scheduleRows[0].schedule_json as ScheduleBlock[]);
    }

    // Silent rollover (no UI noise)
    fetch('/api/schedule/rollover', { method: 'POST' }).catch(() => {});

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const hours = new Date().getHours();
    if (hours < 12) setTimeOfDay('morning');
    else if (hours < 17) setTimeOfDay('afternoon');
    else setTimeOfDay('evening');
    void fetchAll();
  }, [fetchAll]);

  // --- Derived: parsed schedule blocks (for hero + full-day expander) ---
  const parsedSchedule = useMemo(() => {
    if (!schedule) return null;
    return schedule.map(b => ({
      ...b,
      startTime: new Date(b.startTime),
      endTime: new Date(b.endTime),
    }));
  }, [schedule]);

  // --- Derived: the ONE thing to surface ---
  const nextAction = useMemo(() => {
    if (!parsedSchedule) return null;
    const now = new Date();
    const current = parsedSchedule.find(b => now >= b.startTime && now < b.endTime);
    if (current) return { ...current, status: 'NOW' as const };
    const next = parsedSchedule.find(b => b.startTime > now);
    if (next) return { ...next, status: 'UP NEXT' as const };
    return null;
  }, [parsedSchedule]);

  // --- Derived: three small numbers ---
  const stats = useMemo(() => {
    const dueToday = tasks.filter(
      t => !t.completed && t.due_date && isToday(new Date(t.due_date))
    ).length;
    const completedToday = tasks.filter(
      t => t.completed && t.completed_at && isToday(new Date(t.completed_at))
    ).length;
    return { dueToday, completedToday };
  }, [tasks]);

  // --- Actions ---
  const generatePlan = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/daily-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ energyLevel }),
      });
      const data = await res.json();
      if (data.schedule || data.plan) {
        await fetchAll();
      }
    } catch (e) {
      console.error('Plan generation failed', e);
    } finally {
      setGenerating(false);
    }
  };

  const completeTask = async (taskId: string) => {
    await supabase
      .from('tasks')
      .update({ completed: true, completed_at: new Date().toISOString(), status: 'done' })
      .eq('id', taskId);
    fetchAll();
  };

  // --- Render ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const greetingEmoji = timeOfDay === 'morning' ? '☀️' : timeOfDay === 'afternoon' ? '🌤️' : '🌙';
  const firstName = userName?.trim().split(' ')[0];
  const incompleteTasks = tasks.filter(t => !t.completed);
  const nothingConnected = !connections.canvasConnected && !connections.googleConnected;

  return (
    <div className="space-y-8 max-w-3xl mx-auto" data-testid="dashboard-root">
      {/* 1. Header */}
      <header className="flex items-baseline justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter text-foreground" data-testid="dashboard-greeting">
            {greetingEmoji} Good {timeOfDay}{firstName ? `, ${firstName}` : ''}
          </h1>
          {greeting && (
            <p className="text-muted mt-1 font-medium italic text-sm">{greeting}</p>
          )}
        </div>
        <span className="text-xs font-black uppercase tracking-widest text-surface-400">
          {format(new Date(), 'EEE, MMM d')}
        </span>
      </header>

      {/* 2. Connection status pill — painkiller visibility */}
      <section data-testid="connections-pill" className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-widest">
        <ConnectionChip
          icon={<GraduationCap weight="bold" className="size-3.5" />}
          label="Canvas"
          connected={connections.canvasConnected}
          detail={connections.canvasConnected
            ? (connections.canvasDueCount > 0 ? `${connections.canvasDueCount} due` : 'Synced')
            : 'Connect'}
          onClick={() => router.push('/dashboard/settings')}
          testid="connection-canvas"
        />
        <ConnectionChip
          icon={<CalendarBlank weight="bold" className="size-3.5" />}
          label="Google Calendar"
          connected={connections.googleConnected}
          detail={connections.googleConnected ? 'Synced' : 'Connect'}
          onClick={() => router.push('/dashboard/settings')}
          testid="connection-google"
        />
      </section>

      {/* 3. NEXT ACTION HERO */}
      <section data-testid="next-action-hero" className="relative">
        {!nextAction ? (
          <div className="border-2 border-surface-900 rounded-3xl p-10 bg-brand-50/40 shadow-[8px_8px_0_0_var(--surface-900)]">
            <div className="flex items-center gap-2 mb-3 text-xs font-black uppercase tracking-widest text-brand-500">
              <Sparkle weight="fill" />
              {nothingConnected ? 'Start with one connection' : 'No plan yet for today'}
            </div>

            {nothingConnected ? (
              <>
                <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter text-foreground mb-3">
                  Connect Canvas to get going.
                </h2>
                <p className="text-muted font-medium leading-relaxed mb-6 max-w-md">
                  Pull in your assignments and Ollie will never let you miss a deadline.
                  Takes 30 seconds.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    data-testid="connect-canvas-btn"
                    size="lg"
                    onClick={() => router.push('/dashboard/settings')}
                    className="h-14 px-8 text-base gap-3 bg-surface-900 hover:bg-surface-800 text-white border-2 border-surface-900 rounded-2xl shadow-[6px_6px_0_0_var(--accent-500)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all uppercase tracking-widest"
                  >
                    <GraduationCap weight="bold" />
                    Connect Canvas <ArrowRight weight="bold" />
                  </Button>
                  <Button
                    data-testid="connect-google-btn"
                    size="lg"
                    variant="outline"
                    onClick={() => router.push('/dashboard/settings')}
                    className="h-14 px-6 text-base gap-3 border-2 border-surface-900 rounded-2xl uppercase tracking-widest"
                  >
                    <CalendarBlank weight="bold" />
                    Connect Google Calendar
                  </Button>
                </div>
                <p className="text-xs text-surface-500 font-bold mt-6">
                  Already have tasks? You can also{' '}
                  <button
                    onClick={generatePlan}
                    disabled={generating}
                    data-testid="generate-plan-skip-btn"
                    className="underline hover:text-surface-900"
                  >
                    generate a plan from your existing tasks
                  </button>
                  .
                </p>
              </>
            ) : (
              <>
                <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter text-foreground mb-3">
                  Ready to focus?
                </h2>
                <p className="text-muted font-medium leading-relaxed mb-6 max-w-md">
                  Tell Ollie how you&apos;re feeling and you&apos;ll have a plan in seconds.
                </p>

                <div className="flex items-center gap-2 mb-6" data-testid="energy-selector">
                  <span className="text-[10px] font-black uppercase tracking-widest text-surface-500 mr-2">Energy:</span>
                  {(['low', 'medium', 'high'] as const).map(e => (
                    <button
                      key={e}
                      data-testid={`energy-${e}`}
                      onClick={() => setEnergyLevel(e)}
                      className={`px-4 py-1.5 rounded-full border-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                        energyLevel === e
                          ? 'bg-surface-900 text-white border-surface-900'
                          : 'bg-transparent text-surface-500 border-surface-200 hover:border-surface-900'
                      }`}
                    >
                      <Lightning weight={energyLevel === e ? 'fill' : 'regular'} className="inline-block mr-1 size-3" />
                      {e}
                    </button>
                  ))}
                </div>

                <Button
                  data-testid="generate-plan-btn"
                  size="lg"
                  onClick={generatePlan}
                  disabled={generating}
                  className="h-14 px-8 text-base gap-3 bg-surface-900 hover:bg-surface-800 text-white border-2 border-surface-900 rounded-2xl shadow-[6px_6px_0_0_var(--accent-500)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all uppercase tracking-widest"
                >
                  {generating ? 'Ollie is thinking…' : <>Generate today&apos;s plan <ArrowRight weight="bold" /></>}
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="border-2 border-surface-900 rounded-3xl p-10 bg-surface-100 shadow-[8px_8px_0_0_var(--surface-900)]" data-testid="next-action-card">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className={`inline-flex items-center gap-2 mb-3 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border-2 ${
                  nextAction.status === 'NOW'
                    ? 'bg-success/10 border-success text-success'
                    : 'bg-brand-50 border-brand-300 text-brand-700'
                }`}>
                  <Clock weight="bold" className="size-3" />
                  {nextAction.status}
                </div>
                <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter text-foreground leading-tight" data-testid="next-action-title">
                  {nextAction.title}
                </h2>
                <p className="text-muted mt-2 font-bold text-sm">
                  {format(new Date(nextAction.startTime), 'h:mm a')} → {format(new Date(nextAction.endTime), 'h:mm a')}
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {nextAction.taskId && (
                <Button
                  data-testid="complete-next-btn"
                  onClick={() => completeTask(nextAction.taskId!)}
                  className="h-12 px-6 gap-2 bg-success hover:bg-success/90 text-white border-2 border-success rounded-xl uppercase tracking-widest text-xs font-black"
                >
                  <CheckCircle weight="bold" />
                  Mark done
                </Button>
              )}
              <Button
                data-testid="ask-ollie-btn"
                variant="outline"
                onClick={() => window.dispatchEvent(new CustomEvent('open-ollie-chat'))}
                className="h-12 px-6 gap-2 border-2 border-surface-900 rounded-xl uppercase tracking-widest text-xs font-black"
              >
                Ask Ollie to reschedule
              </Button>
              <Button
                data-testid="regenerate-plan-btn"
                variant="outline"
                onClick={generatePlan}
                disabled={generating}
                className="h-12 px-6 gap-2 border-2 border-surface-200 rounded-xl uppercase tracking-widest text-xs font-black text-surface-500"
              >
                {generating ? 'Regenerating…' : 'Regenerate plan'}
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* 4. Full day's plan — collapsed expander, only when schedule exists */}
      {parsedSchedule && parsedSchedule.length > 0 && (
        <section data-testid="full-day-section">
          <button
            onClick={() => setShowFullPlan(s => !s)}
            data-testid="full-day-toggle"
            className="flex items-center justify-between w-full text-left text-xs font-black uppercase tracking-widest text-surface-500 hover:text-foreground transition-colors py-2"
          >
            <span>View today&apos;s full plan ({parsedSchedule.length} blocks)</span>
            <CaretDown weight="bold" className={`size-3 transition-transform ${showFullPlan ? 'rotate-180' : ''}`} />
          </button>
          {showFullPlan && (
            <div className="mt-3 space-y-2" data-testid="full-day-list">
              {parsedSchedule.map((block, idx) => (
                <div
                  key={block.id || idx}
                  data-testid={`full-day-block-${idx}`}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl bg-card border-2 border-surface-200"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-surface-500 shrink-0 w-24">
                    {format(block.startTime, 'h:mm a')}
                  </span>
                  <span className="text-sm font-bold text-foreground flex-1 truncate">{block.title}</span>
                  <span className="text-[10px] font-bold text-surface-400 shrink-0 hidden sm:inline">
                    {Math.round((block.endTime.getTime() - block.startTime.getTime()) / 60000)} min
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 5. Three quiet numbers */}
      <section className="grid grid-cols-3 gap-3" data-testid="dashboard-stats">
        <Stat icon={<Target weight="bold" className="size-4" />} label="Due today" value={stats.dueToday} testid="stat-due-today" />
        <Stat icon={<CheckCircle weight="bold" className="size-4" />} label="Done today" value={stats.completedToday} testid="stat-done-today" />
        <Stat icon={<Clock weight="bold" className="size-4" />} label="Open tasks" value={incompleteTasks.length} testid="stat-open-tasks" />
      </section>

      {/* 6. Today's tasks — collapsed by default */}
      <section data-testid="today-tasks-section">
        <button
          onClick={() => setShowTasks(s => !s)}
          data-testid="today-tasks-toggle"
          className="flex items-center justify-between w-full text-left text-xs font-black uppercase tracking-widest text-surface-500 hover:text-foreground transition-colors py-2"
        >
          <span>Today&apos;s tasks ({incompleteTasks.length})</span>
          <CaretDown weight="bold" className={`size-3 transition-transform ${showTasks ? 'rotate-180' : ''}`} />
        </button>
        {showTasks && (
          <div className="mt-3 space-y-2" data-testid="today-tasks-list">
            {incompleteTasks.length === 0 ? (
              <p className="text-muted italic text-sm py-6 text-center">Nothing on the list. Enjoy the calm.</p>
            ) : (
              <>
                {incompleteTasks.slice(0, 5).map(task => (
                  <div
                    key={task.id}
                    data-testid={`task-row-${task.id}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border-2 border-transparent hover:border-surface-900 transition-all"
                  >
                    <button
                      onClick={() => completeTask(task.id)}
                      data-testid={`task-complete-${task.id}`}
                      aria-label={`Complete ${task.title}`}
                      className="w-5 h-5 rounded-md border-2 border-surface-300 hover:border-surface-900 hover:bg-surface-900/10 transition-all shrink-0"
                    />
                    <span className="text-sm font-bold text-foreground truncate flex-1">{task.title}</span>
                  </div>
                ))}
                <button
                  onClick={() => router.push('/dashboard/tasks')}
                  data-testid="view-all-tasks-link"
                  className="w-full text-center pt-3 text-xs font-black uppercase tracking-widest text-surface-500 hover:text-foreground transition-colors"
                >
                  View all tasks →
                </button>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, label, value, testid }: { icon: React.ReactNode; label: string; value: string | number; testid: string }) {
  return (
    <div
      data-testid={testid}
      className="border-2 border-surface-200 hover:border-surface-900 rounded-2xl p-4 bg-card transition-colors"
    >
      <div className="flex items-center gap-2 text-surface-500 text-[10px] font-black uppercase tracking-widest mb-2">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-black text-foreground tracking-tighter">{value}</div>
    </div>
  );
}

function ConnectionChip({
  icon, label, connected, detail, onClick, testid,
}: {
  icon: React.ReactNode;
  label: string;
  connected: boolean;
  detail: string;
  onClick: () => void;
  testid: string;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 transition-all ${
        connected
          ? 'border-success/40 bg-success/10 text-success hover:border-success'
          : 'border-surface-300 bg-card text-surface-600 hover:border-surface-900 hover:text-foreground'
      }`}
    >
      {icon}
      <span>{label}</span>
      <span className={`px-2 py-0.5 rounded-full text-[9px] ${
        connected ? 'bg-success/20' : 'bg-surface-100'
      }`}>
        {connected ? '✓' : '+'} {detail}
      </span>
    </button>
  );
}
