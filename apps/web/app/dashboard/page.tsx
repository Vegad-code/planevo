'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format, isToday } from 'date-fns';
import { getRandomGreeting } from '@/lib/bruno';
import { useUIStore } from '@/lib/store/ui-store';
import { calculateUserStats, type UserStats } from '@/lib/stats';
import type { ScheduleBlock } from '@/lib/ai/agentic-scheduler';

const BrunoMark = ({ size = 28, mood = 'normal' }: { size?: number, mood?: string }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} style={{ flex: 'none' }}>
    <circle cx="14" cy="14" r="7" fill="var(--color-bruno-deep)" />
    <circle cx="34" cy="14" r="7" fill="var(--color-bruno-deep)" />
    <circle cx="14" cy="14" r="3.2" fill="var(--color-belly)" />
    <circle cx="34" cy="14" r="3.2" fill="var(--color-belly)" />
    <circle cx="24" cy="26" r="16" fill="var(--color-bruno)" />
    <ellipse cx="24" cy="30" rx="9" ry="7" fill="var(--color-belly)" />
    <circle cx="19" cy="23" r="1.7" fill="var(--color-ink)" />
    <circle cx="29" cy="23" r="1.7" fill="var(--color-ink)" />
    <ellipse cx="24" cy="28" rx="1.8" ry="1.3" fill="var(--color-ink)" />
    {mood === 'happy' && (
      <path d="M 21 32 Q 24 34 27 32" stroke="var(--color-ink)" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    )}
  </svg>
);

const SourcePill = ({ kind, label, count, status = 'synced' }: { kind: 'canvas' | 'cal' | 'task' | 'project', label: string, count?: string, status?: string }) => {
  const colorMap = {
    canvas: { dot: 'bg-[var(--color-rose)]' },
    cal: { dot: 'bg-[var(--color-blue)]' },
    task: { dot: 'bg-[var(--color-honey)]' },
    project: { dot: 'bg-[var(--color-sage)]' },
  };
  const c = colorMap[kind] || colorMap.task;
  return (
    <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-[var(--color-paper)] border border-[var(--color-line-strong)] text-[13px] font-sans shadow-sm">
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      <span className="text-[var(--color-ink)] font-medium">{label}</span>
      {count && (
        <span className="font-mono text-[11px] text-[var(--color-ink-soft)]">
          {count}
        </span>
      )}
      {status === 'synced' && (
        <span className="font-mono text-[10px] text-[var(--color-sage)] tracking-[0.06em]">· SYNCED</span>
      )}
    </div>
  );
};

const Stat = ({ label, big, sub, tone }: { label: string, big: string | number, sub: string, tone: 'sage' | 'honey' | 'ink' | 'bruno' }) => {
  const tones = {
    sage: 'bg-[var(--color-sage)]',
    honey: 'bg-[var(--color-honey)]',
    ink: 'bg-[var(--color-ink)]',
    bruno: 'bg-[var(--color-bruno)]',
  };
  const dotColor = tones[tone] || tones.ink;
  return (
    <div className="bg-[var(--color-paper)] rounded-2xl p-5 border border-[var(--color-line)] shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span className="font-mono text-[11px] tracking-[0.16em] text-[var(--color-ink-soft)] uppercase">{label}</span>
      </div>
      <div className="font-serif text-4xl leading-none tracking-tight text-[var(--color-ink)]">{big}</div>
      <div className="text-xs text-[var(--color-ink-soft)] mt-2 font-mono tracking-wide">{sub}</div>
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  
  const [userName, setUserName] = useState<string>('');
  const [greeting, setGreeting] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [tasks, setTasks] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<ScheduleBlock[] | null>(null);
  const [connections, setConnections] = useState({ canvasConnected: false, canvasDueCount: 0, googleConnected: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hours = new Date().getHours();
    if (hours < 12) setTimeOfDay('morning');
    else if (hours < 17) setTimeOfDay('afternoon');
    else setTimeOfDay('evening');
  }, []);

  useEffect(() => {
    async function fetchAll() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: profile } = await (supabase as any)
          .from('users')
          .select('name, canvas_token, google_calendar_connected')
          .eq('id', user.id)
          .single();
          
        if (profile?.name) {
          setUserName(profile.name);
          setGreeting(getRandomGreeting(profile.name));
        }

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

        const { data: taskRows } = await supabase
          .from('tasks')
          .select('id, title, completed, completed_at, due_date')
          .is('deleted_at', null)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setTasks(taskRows || []);

        const { data: scheduleRows } = await supabase
          .from('schedules')
          .select('schedule_json')
          .eq('user_id', user.id)
          .eq('date', format(new Date(), 'yyyy-MM-dd'))
          .order('created_at', { ascending: false })
          .limit(1);
        if (scheduleRows?.[0]) {
          setSchedule(scheduleRows[0].schedule_json as unknown as ScheduleBlock[]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [supabase]);

  const parsedSchedule = useMemo(() => {
    if (!schedule) return null;
    return schedule.map(b => {
      const start = b.startTime || (b as any).suggested_start || (b as any).start_time;
      const end = b.endTime || (b as any).suggested_end || (b as any).end_time;
      const startDate = start ? new Date(start) : null;
      const endDate = end ? new Date(end) : null;
      if (!startDate || isNaN(startDate.getTime())) return null;
      return {
        ...b,
        startTime: startDate,
        endTime: endDate || new Date(startDate.getTime() + (b.duration || 30) * 60000),
      };
    }).filter((b): b is any => b !== null);
  }, [schedule]);

  const nextAction = useMemo(() => {
    if (!parsedSchedule) return null;
    const now = new Date();
    const current = parsedSchedule.find(b => now >= b.startTime && now < b.endTime);
    if (current) return { ...current, status: 'NOW' as const };
    const next = parsedSchedule.find(b => b.startTime > now);
    if (next) return { ...next, status: 'UP NEXT' as const };
    return parsedSchedule[0] ? { ...parsedSchedule[0], status: 'UP NEXT' as const } : null;
  }, [parsedSchedule]);

  const upNextBlocks = useMemo(() => {
    if (!parsedSchedule) return [];
    const now = new Date();
    return parsedSchedule.filter(b => b.startTime > now).slice(0, 3);
  }, [parsedSchedule]);

  const stats = useMemo(() => {
    const completedToday = tasks.filter(t => t.completed && t.completed_at && isToday(new Date(t.completed_at))).length;
    const openTasks = tasks.filter(t => !t.completed).length;
    const userStats = calculateUserStats(tasks as any);
    return { completedToday, openTasks, ...userStats };
  }, [tasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-[var(--color-honey)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const greetingPrefix = timeOfDay === 'morning' ? 'Good morning' : timeOfDay === 'afternoon' ? 'Good afternoon' : 'Good evening';
  const dateStr = format(new Date(), 'EEEE · MMM d · h:mm a').toUpperCase();

  return (
    <div className="animate-in fade-in duration-500 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-6 pb-7 border-b border-[var(--color-line)] mb-8">
        <div>
          <div className="font-mono text-[11px] tracking-[0.18em] text-[var(--color-ink-soft)] uppercase mb-3">
            {dateStr}
          </div>
          <h1 className="font-serif text-5xl md:text-6xl tracking-tight text-[var(--color-ink)] m-0 leading-none">
            {greetingPrefix}, <em className="text-[var(--color-honey-deep)] not-italic">{userName.split(' ')[0] || 'Pilot'}.</em>
          </h1>
          <p className="font-sans text-[15px] text-[var(--color-ink-soft)] mt-3 mb-0">
            {parsedSchedule && parsedSchedule.length > 0
              ? `${parsedSchedule.length} block${parsedSchedule.length > 1 ? 's' : ''} on your plate. Bruno has your back.`
              : "Let's organize your day."}
          </p>
        </div>
        <div className="flex gap-2.5 flex-wrap justify-end">
          <SourcePill kind="canvas" label="Canvas" count={`${connections.canvasDueCount} due`} status={connections.canvasConnected ? 'synced' : ''} />
          <SourcePill kind="cal" label="Calendar" count="Synced" status={connections.googleConnected ? 'synced' : ''} />
        </div>
      </div>

      {/* HERO CARD */}
      <div className="bg-[var(--color-ink)] border border-[var(--color-line)] text-[var(--color-paper)] rounded-[22px] p-6 md:p-9 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-9 mb-6 min-h-[280px]">
        <div className="flex flex-col">
          <div className="flex items-center gap-2.5 mb-5">
            <BrunoMark size={36} mood={nextAction ? "happy" : "normal"} />
            <div>
              <div className="font-mono text-[11px] tracking-[0.16em] text-[rgba(251,246,234,0.5)]">BRUNO · JUST NOW</div>
              <div className="font-serif text-[22px] text-[var(--color-paper)] mt-1 italic">
                {nextAction ? "Tonight is for the light stuff." : "Let's plan this out."}
              </div>
            </div>
          </div>
          
          <h2 className="font-serif text-4xl md:text-5xl leading-[1.05] tracking-tight font-normal my-0 mb-4 text-[var(--color-paper)]">
            {nextAction ? (
              <>Your <em className="text-[var(--color-honey)] italic font-serif">next move</em><br/>is ready.</>
            ) : (
              <>Your <em className="text-[var(--color-honey)] italic font-serif">schedule</em><br/>is empty.</>
            )}
          </h2>
          
          <p className="text-[15px] text-[rgba(251,246,234,0.7)] leading-relaxed m-0 max-w-md">
            {nextAction 
              ? `Your next block starts at ${format(nextAction.startTime, 'h:mm a')}. Bruno arranged your schedule based on your energy and priorities.`
              : "Generate a daily plan based on your tasks, or connect your calendar to sync your schedule."}
          </p>
          
          <div className="flex gap-3 mt-auto pt-7">
            {nextAction ? (
              <>
                <button className="bg-[var(--color-honey)] text-[var(--color-ink)] border-none px-5 py-3 rounded-full text-sm font-medium hover:bg-[var(--color-honey-soft)] hover:scale-105 transition-all flex items-center gap-2 cursor-pointer">
                  Start focus block <span>&rarr;</span>
                </button>
                <button onClick={() => router.push('/dashboard/daily-plan')} className="bg-transparent text-[var(--color-paper)] border border-[rgba(251,246,234,0.2)] px-5 py-3 rounded-full text-sm font-medium hover:bg-[rgba(251,246,234,0.05)] transition-colors cursor-pointer">
                  See full plan
                </button>
              </>
            ) : (
              <>
                <button onClick={() => router.push('/dashboard/daily-plan')} className="bg-[var(--color-honey)] text-[var(--color-ink)] border-none px-5 py-3 rounded-full text-sm font-medium hover:bg-[var(--color-honey-soft)] hover:scale-105 transition-all flex items-center gap-2 cursor-pointer">
                  Generate Plan <span>&rarr;</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          {nextAction && (
            <div className="bg-[var(--color-paper)] text-[var(--color-ink)] rounded-2xl p-5 shadow-sm border border-[var(--color-line-strong)]">
              <div className="flex justify-between items-center mb-3">
                <span className="font-mono text-[11px] text-[var(--color-ink-soft)] tracking-[0.1em]">{nextAction.status} · {format(nextAction.startTime, 'h:mm a')}</span>
                <span className="font-mono text-[10px] text-[var(--color-sage)] tracking-[0.1em]">● FOCUS</span>
              </div>
              <div className="font-serif text-xl tracking-tight mb-2 leading-tight">{nextAction.title}</div>
              <div className="text-xs text-[var(--color-ink-soft)] font-mono tracking-wide mb-3 flex items-center gap-2">
                <span className="text-[var(--color-rose)]">●</span> 
                {Math.round((nextAction.endTime.getTime() - nextAction.startTime.getTime()) / 60000)} min
              </div>
              <div className="h-1.5 bg-[var(--color-cream-2)] rounded-full overflow-hidden mb-2.5">
                <div className="h-full bg-[var(--color-honey)] rounded-full w-1/3" />
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-[10px] text-[var(--color-ink-soft)] tracking-[0.06em]">0 MIN IN</span>
                <span className="font-mono text-[10px] text-[var(--color-honey-deep)] tracking-[0.06em]">BRUNO: YOU GOT THIS</span>
              </div>
            </div>
          )}

          {upNextBlocks.length > 0 && (
            <div className="bg-[rgba(251,246,234,0.05)] border border-[rgba(251,246,234,0.08)] rounded-2xl p-4">
              <div className="font-mono text-[10px] text-[rgba(251,246,234,0.5)] tracking-[0.16em] mb-2.5">UP NEXT TODAY</div>
              <div className="flex flex-col">
                {upNextBlocks.map((block, i) => (
                  <div key={i} className="flex items-center gap-3.5 py-2 border-t border-[rgba(251,246,234,0.06)] first:border-0">
                    <span className="font-mono text-[11px] text-[rgba(251,246,234,0.5)] w-12">{format(block.startTime, 'h:mm')}</span>
                    <span className="text-[13px] font-medium flex-1 truncate text-[var(--color-paper)]">{block.title}</span>
                    <span className="font-mono text-[10px] text-[rgba(251,246,234,0.5)]">{Math.round((block.endTime.getTime() - block.startTime.getTime()) / 60000)}m</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <Stat label="Done today" big={stats.completedToday} sub={`${tasks.length ? Math.round(stats.completedToday/tasks.length*100) : 0}% of all tasks`} tone="sage" />
        <Stat label="Focus time" big="--" sub="Start a focus session" tone="honey" />
        <Stat label="Open tasks" big={stats.openTasks} sub="Across all lists" tone="ink" />
        <Stat label="Streak" big={`${stats.currentStreak}d`} sub={stats.currentStreak > 1 ? `${stats.consistencyScore}% consistency this week` : 'Complete a task to start!'} tone="bruno" />
      </div>

      {/* DETAIL ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-3.5">
        <div className="bg-[var(--color-paper)] rounded-[16px] p-6 border border-[var(--color-line)] shadow-sm">
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="font-mono text-[11px] text-[var(--color-ink-soft)] tracking-[0.16em] mb-1.5">THIS WEEK</div>
              <div className="font-serif text-[22px] text-[var(--color-ink)]">What's <em>coming up.</em></div>
            </div>
            <button onClick={() => router.push('/dashboard/calendar')} className="font-mono text-[11px] tracking-wide text-[var(--color-honey-deep)] hover:text-[var(--color-honey)] cursor-pointer bg-transparent border-none">
              See all &rarr;
            </button>
          </div>
          
          <div className="flex flex-col">
            {tasks.filter(t => !t.completed).slice(0, 4).map((task, i) => (
              <div key={task.id} className="flex items-center gap-4 py-3 border-t border-[var(--color-line)]">
                <div className="font-mono text-[11px] text-[var(--color-ink-soft)] tracking-wide min-w-[40px]">
                  {task.due_date ? format(new Date(task.due_date), 'EEE').toUpperCase() : 'ANY'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium truncate text-[var(--color-ink)]">{task.title}</div>
                  <div className="font-mono text-[11px] text-[var(--color-ink-soft)] mt-1 truncate">
                    <span className="text-[var(--color-rose)]">●</span> Open task
                  </div>
                </div>
                <button className="bg-transparent text-[var(--color-ink)] border border-[var(--color-line-strong)] px-3 py-1.5 rounded-full text-xs hover:bg-[var(--color-cream-2)] transition-colors cursor-pointer">
                  Focus
                </button>
              </div>
            ))}
            {tasks.filter(t => !t.completed).length === 0 && (
              <div className="py-8 text-center font-serif text-lg text-[var(--color-ink-soft)] italic">
                You're all caught up for the week.
              </div>
            )}
          </div>
        </div>

        <div className="bg-[var(--color-bruno-deep)] border border-[var(--color-line)] text-[var(--color-paper)] rounded-[16px] p-6 flex flex-col shadow-sm">
          <div className="font-mono text-[11px] tracking-[0.16em] text-[var(--color-honey)] mb-3.5">BRUNO NOTICED</div>
          <p className="font-serif text-[22px] leading-[1.2] text-[var(--color-paper)] m-0">
            {stats.currentStreak >= 3
              ? <>You've planned <em className="text-[var(--color-honey)] not-italic">{stats.currentStreak} days</em> in a row. That's momentum. 🐻</>  
              : stats.currentStreak >= 1
                ? <>Your {format(new Date(), 'EEEE')} <em className="text-[var(--color-honey)] not-italic">{timeOfDay}s</em> are usually highly productive.</>
                : <>Let's get started — complete a task today and <em className="text-[var(--color-honey)] not-italic">build your streak</em>. 🐻</>}
          </p>
          <p className="text-[13px] text-[rgba(251,246,234,0.65)] mt-3.5 leading-relaxed">
            {stats.currentStreak >= 3
              ? "I'll keep the momentum going. Want me to set tomorrow up too?"
              : "I'll prioritize the deep work for you. Anything else you want me to learn?"}
          </p>
          <button 
            onClick={() => router.push('/dashboard/chat')}
            className="mt-auto bg-[var(--color-honey)] text-[var(--color-ink)] border-none px-4 py-3 text-center rounded-[10px] text-[13px] font-medium hover:bg-[var(--color-honey-soft)] hover:scale-[1.01] transition-all w-full cursor-pointer"
          >
            Open chat with Bruno
          </button>
        </div>
      </div>
    </div>
  );
}
