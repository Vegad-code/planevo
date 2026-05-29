'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { getRandomGreeting } from '@/lib/bruno';
import { useUIStore } from '@/lib/store/ui-store';
import { calculateMomentumStats, type MomentumStats } from '@/lib/stats';
import type { ScheduleBlock } from '@/lib/ai/agentic-scheduler';
import EventDialog from '@/components/calendar/dialogs/EventDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import type { CalendarEvent } from '@/types/calendar';
import { Check, X, Calendar as CalendarIcon, Clock } from '@phosphor-icons/react';

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
        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-cream-2)] text-[var(--color-sage)] tracking-wider">
          SYNCED
        </span>
      )}
    </div>
  );
};

const NextActionCard = ({ nextAction }: { nextAction: any }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Only set up interval if the action is currently happening (NOW)
    if (nextAction.status === 'NOW') {
      const interval = setInterval(() => setNow(new Date()), 60000);
      return () => clearInterval(interval);
    }
  }, [nextAction.status]);

  const totalDurationMin = Math.round((nextAction.endTime.getTime() - nextAction.startTime.getTime()) / 60000);
  
  let elapsedMin = 0;
  let progressPercent = 0;
  
  if (nextAction.status === 'NOW') {
    elapsedMin = Math.max(0, Math.round((now.getTime() - nextAction.startTime.getTime()) / 60000));
    progressPercent = Math.min(100, Math.max(0, (elapsedMin / totalDurationMin) * 100));
  } else if (now > nextAction.endTime) {
    elapsedMin = totalDurationMin;
    progressPercent = 100;
  }

  return (
    <div className="bg-[var(--color-paper)] text-[var(--color-ink)] rounded-2xl p-5 shadow-sm border border-[var(--color-line-strong)]">
      <div className="flex justify-between items-center mb-3">
        <span className="font-mono text-[11px] text-[var(--color-ink-soft)] tracking-[0.1em]">{nextAction.status} · {format(nextAction.startTime, 'h:mm a')}</span>
        <span className="font-mono text-[10px] text-[var(--color-sage)] tracking-[0.1em]">● FOCUS</span>
      </div>
      <div className="font-serif text-xl tracking-tight mb-2 leading-tight">{nextAction.title}</div>
      <div className="text-xs text-[var(--color-ink-soft)] font-mono tracking-wide mb-3 flex items-center gap-2">
        <span className="text-[var(--color-rose)]">●</span> 
        {totalDurationMin} min
      </div>
      <div className="h-1.5 bg-[var(--color-cream-2)] rounded-full overflow-hidden mb-2.5">
        <div 
          className="h-full bg-[var(--color-honey)] rounded-full transition-all duration-1000 ease-in-out" 
          style={{ width: `${progressPercent}%` }} 
        />
      </div>
      <div className="flex justify-between">
        <span className="font-mono text-[10px] text-[var(--color-ink-soft)] tracking-[0.06em]">{elapsedMin} MIN IN</span>
        <span className="font-mono text-[10px] text-[var(--color-honey-deep)] tracking-[0.06em]">BRUNO: YOU GOT THIS</span>
      </div>
    </div>
  );
};

const UpcomingAgendaItem = ({ item, onView }: { item: any, onView: (item: any) => void }) => {
  return (
    <div className="flex items-start gap-4 py-3 border-t border-[var(--color-line)]">
      <div className="font-mono text-[11px] text-[var(--color-ink-soft)] tracking-wide min-w-[40px] mt-0.5">
        {item.date.getTime() === 8640000000000000 ? 'ANY' : format(item.date, 'EEE').toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium text-[var(--color-ink)] truncate">
          {item.title}
        </div>
        {item.description && (
          <div className="text-[12px] text-[var(--color-ink-soft)] truncate max-w-full opacity-80 mt-0.5">
            {item.description}
          </div>
        )}
        <div className="font-mono text-[11px] text-[var(--color-ink-soft)] mt-1 truncate">
          <span className={item.type === 'task' ? 'text-[var(--color-rose)]' : 'text-[var(--color-blue)]'}>●</span> {item.type === 'task' ? 'Open task' : 'Calendar event'}
        </div>
      </div>
      <button onClick={() => onView(item)} className="bg-transparent text-[var(--color-ink)] border border-[var(--color-line-strong)] px-3 py-1.5 rounded-full text-xs hover:bg-[var(--color-cream-2)] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-ink)] shrink-0">
        {item.actionText}
      </button>
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
    <div className="bg-[var(--color-paper)] rounded-[22px] p-5 border border-[var(--color-line)] shadow-sm">
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
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening'>(() => {
    if (typeof window === 'undefined') return 'morning';
    const hours = new Date().getHours();
    if (hours < 12) return 'morning';
    if (hours < 17) return 'afternoon';
    return 'evening';
  });
  const [tasks, setTasks] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<ScheduleBlock[] | null>(null);
  const [thisWeekEvents, setThisWeekEvents] = useState<any[]>([]);
  const [insight, setInsight] = useState<string>('');
  const [insightLoading, setInsightLoading] = useState<boolean>(true);
  const [connections, setConnections] = useState({ canvasConnected: false, canvasDueCount: 0, googleConnected: false });
  const [loading, setLoading] = useState(true);

  const [selectedEventModal, setSelectedEventModal] = useState<CalendarEvent | null>(null);
  const [selectedTaskModal, setSelectedTaskModal] = useState<any | null>(null);

  const { updateEvent, deleteEvent } = useCalendarEvents();

  useEffect(() => {
    async function fetchAll() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) return;
        
        const profilePromise = (supabase as any)
          .from('users')
          .select('name, canvas_token, google_calendar_connected')
          .eq('id', user.id)
          .single();

        const tasksPromise = supabase
          .from('tasks')
          .select('*')
          .is('deleted_at', null)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        const blocksPromise = supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .neq('status', 'rejected')
          .gte('start_time', new Date(new Date().setHours(0,0,0,0)).toISOString())
          .lte('start_time', new Date(new Date().setHours(23,59,59,999)).toISOString())
          .order('start_time', { ascending: true });
          
        const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const canvasDuePromise = supabase
          .from('canvas_assignments')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('due_at', new Date().toISOString())
          .lte('due_at', sevenDaysOut);

        const sevenDaysAgoStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const metricsPromise = supabase
          .from('daily_user_metrics')
          .select('date, focus_time_seconds, tasks_completed, tasks_planned')
          .eq('user_id', user.id)
          .gte('date', sevenDaysAgoStr)
          .order('date', { ascending: false });

        const thisWeekEventsPromise = supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .neq('status', 'rejected')
          .gte('start_time', new Date().toISOString())
          .lte('start_time', sevenDaysOut)
          .order('start_time', { ascending: true })
          .limit(10);

        const [{ data: profile }, { data: taskRows }, { data: blocks }, { count: canvasDueCount }, { data: metricsRows }, { data: thisWeekEventsData }] = await Promise.all([
          profilePromise,
          tasksPromise,
          blocksPromise,
          canvasDuePromise,
          metricsPromise,
          thisWeekEventsPromise
        ]);
          
        if (profile?.name) {
          setUserName(profile.name);
          setGreeting(getRandomGreeting(profile.name));
        }

        setConnections({
          canvasConnected: !!profile?.canvas_token,
          canvasDueCount: canvasDueCount ?? 0,
          googleConnected: !!profile?.google_calendar_connected,
        });

        setTasks(taskRows || []);
        setThisWeekEvents(thisWeekEventsData || []);

        // Calculate momentum stats from the parallel-fetched metrics
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        const upcomingDeadlineCount = (taskRows || []).filter((t: any) => {
          if (t.completed || !t.due_date) return false;
          const due = new Date(t.due_date);
          return due >= new Date() && due <= threeDaysFromNow;
        }).length;

        const todayDateStr = new Date().toISOString().split('T')[0];
        const tasksPlannedTodayCount = (taskRows || []).filter((t: any) => {
          if (t.completed && t.completed_at) {
            return new Date(t.completed_at).toISOString().split('T')[0] === todayDateStr;
          }
          if (!t.completed && t.due_date) {
            return new Date(t.due_date).toISOString().split('T')[0] <= todayDateStr;
          }
          return false;
        }).length;

        setMomentumStats(calculateMomentumStats(metricsRows || [], upcomingDeadlineCount, tasksPlannedTodayCount));

        if (blocks && blocks.length > 0) {
          const mappedBlocks: ScheduleBlock[] = blocks.map((g: any) => ({
            id: g.id,
            title: g.title,
            time: format(new Date(g.start_time), 'HH:mm'),
            duration: g.end_time ? Math.round((new Date(g.end_time).getTime() - new Date(g.start_time).getTime()) / 60000) : 30,
            type: (g.energy_level === 'low' ? 'break' : 'focus') as any,
            description: g.description || '',
            status: (g.status && g.status !== 'confirmed' ? g.status : g.metadata?.status || g.status) as any,
            is_ai_suggested: g.is_ai_suggested ?? g.metadata?.is_ai_suggested ?? true,
            startTime: g.start_time,
            endTime: g.end_time || new Date(new Date(g.start_time).getTime() + 30 * 60000).toISOString()
          }));
          setSchedule(mappedBlocks);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }

      try {
        const insightRes = await fetch('/api/ai/insight');
        if (insightRes.ok) {
          const data = await insightRes.json();
          if (data.insight) setInsight(data.insight);
        }
      } catch (e) {
        console.error('Failed to fetch AI insight', e);
      } finally {
        setInsightLoading(false);
      }
    }
    fetchAll();
  }, [supabase]);

  // Background sync for Google Calendar
  useEffect(() => {
    if (!connections.googleConnected) return;
    
    let isMounted = true;
    fetch('/api/integrations/google/sync', { method: 'POST' })
      .then(res => res.json())
      .then(async data => {
        if (!isMounted) return;
        if (data.success && data.count > 0) {
          // New events were synced, pull them from Supabase silently
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) return;
          
          const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          
          const [blocksRes, eventsRes] = await Promise.all([
            supabase
              .from('calendar_events')
              .select('*')
              .eq('user_id', session.user.id)
              .eq('is_deleted', false)
              .neq('status', 'rejected')
              .gte('start_time', new Date(new Date().setHours(0,0,0,0)).toISOString())
              .lte('start_time', new Date(new Date().setHours(23,59,59,999)).toISOString())
              .order('start_time', { ascending: true }),
              
            supabase
              .from('calendar_events')
              .select('*')
              .eq('user_id', session.user.id)
              .eq('is_deleted', false)
              .neq('status', 'rejected')
              .gte('start_time', new Date().toISOString())
              .lte('start_time', sevenDaysOut)
              .order('start_time', { ascending: true })
              .limit(10)
          ]);

          if (!isMounted) return;

          if (blocksRes.data) {
            const mappedBlocks: ScheduleBlock[] = blocksRes.data.map((g: any) => ({
              id: g.id,
              title: g.title,
              time: format(new Date(g.start_time), 'HH:mm'),
              duration: g.end_time ? Math.round((new Date(g.end_time).getTime() - new Date(g.start_time).getTime()) / 60000) : 30,
              type: (g.energy_level === 'low' ? 'break' : 'focus') as any,
              description: g.description || '',
              status: (g.status && g.status !== 'confirmed' ? g.status : g.metadata?.status || g.status) as any,
              is_ai_suggested: g.is_ai_suggested ?? g.metadata?.is_ai_suggested ?? true,
              startTime: g.start_time,
              endTime: g.end_time || new Date(new Date(g.start_time).getTime() + 30 * 60000).toISOString()
            }));
            setSchedule(mappedBlocks);
          }
          if (eventsRes.data) {
            setThisWeekEvents(eventsRes.data);
          }
        }
      })
      .catch(err => console.error("Background sync failed", err));

    return () => { isMounted = false; };
  }, [connections.googleConnected, supabase]);

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

  const [momentumStats, setMomentumStats] = useState<MomentumStats>({
    focusTimeMinutes: 0,
    tasksCrushed: 0,
    tasksPlanned: 0,
    upcomingDeadlines: 0,
    consistencyPercent: 0,
  });

  const upcomingAgenda = useMemo(() => {
    const items: Array<{ id: string, type: 'task' | 'event', title: string, description?: string, date: Date, actionText: string, raw: any }> = [];
    
    // Add upcoming events
    if (thisWeekEvents) {
      thisWeekEvents.forEach(e => {
        items.push({
          id: e.id,
          type: 'event',
          title: e.title || 'Event',
          description: e.description || '',
          date: new Date(e.start_time),
          actionText: 'View',
          raw: e
        });
      });
    }

    // Add upcoming tasks
    if (tasks) {
      const openTasks = tasks.filter(t => !t.completed);
      openTasks.forEach(t => {
        items.push({
          id: t.id,
          type: 'task',
          title: t.title,
          description: t.description || '',
          date: t.due_date ? new Date(t.due_date) : new Date(8640000000000000), // Far future if no due date
          actionText: 'View',
          raw: t
        });
      });
    }

    // Sort by date
    items.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Return top 4
    return items.slice(0, 4);
  }, [thisWeekEvents, tasks]);

  if (loading) {
    return (
      <div className="animate-pulse fade-in duration-500 pb-12">
        {/* Header Skeleton */}
        <div className="flex flex-wrap items-end justify-between gap-6 pb-7 border-b border-[var(--color-line)] mb-8">
          <div>
            <div className="w-32 h-3 bg-[var(--color-line-strong)] rounded-full mb-4"></div>
            <div className="w-64 h-12 md:w-96 md:h-14 bg-[var(--color-line-strong)] rounded-xl mb-4"></div>
            <div className="w-48 h-4 bg-[var(--color-line-strong)] rounded-full"></div>
          </div>
          <div className="flex gap-2.5 flex-wrap justify-end">
            <div className="w-24 h-9 bg-[var(--color-line-strong)] rounded-full"></div>
            <div className="w-24 h-9 bg-[var(--color-line-strong)] rounded-full"></div>
          </div>
        </div>

        {/* Hero Card Skeleton */}
        <div className="bg-[var(--color-paper)] border border-[var(--color-line)] rounded-[22px] p-6 md:p-9 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-9 mb-6 min-h-[280px]">
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-full bg-[var(--color-line-strong)]"></div>
              <div>
                <div className="w-20 h-2 bg-[var(--color-line-strong)] rounded-full mb-2"></div>
                <div className="w-32 h-4 bg-[var(--color-line-strong)] rounded-full"></div>
              </div>
            </div>
            <div className="w-full h-10 md:h-12 bg-[var(--color-line-strong)] rounded-xl mb-3 max-w-sm"></div>
            <div className="w-3/4 h-10 md:h-12 bg-[var(--color-line-strong)] rounded-xl mb-5 max-w-xs"></div>
            <div className="w-full h-4 bg-[var(--color-line-strong)] rounded-full mb-2 max-w-md"></div>
            <div className="w-5/6 h-4 bg-[var(--color-line-strong)] rounded-full mb-8 max-w-sm"></div>
            
            <div className="flex gap-3 mt-auto pt-7">
              <div className="w-40 h-11 bg-[var(--color-line-strong)] rounded-full"></div>
              <div className="w-32 h-11 bg-[var(--color-line-strong)] rounded-full"></div>
            </div>
          </div>
          <div className="flex flex-col gap-3.5">
            <div className="bg-[var(--color-cream)] rounded-2xl p-5 h-36"></div>
            <div className="bg-[var(--color-cream)] rounded-2xl p-5 h-24"></div>
          </div>
        </div>

        {/* Stats Row Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[var(--color-paper)] rounded-[22px] p-5 border border-[var(--color-line)] h-32 flex flex-col justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-line-strong)]"></div>
                <div className="w-16 h-2 bg-[var(--color-line-strong)] rounded-full"></div>
              </div>
              <div className="w-12 h-8 bg-[var(--color-line-strong)] rounded-lg"></div>
              <div className="w-24 h-3 bg-[var(--color-line-strong)] rounded-full"></div>
            </div>
          ))}
        </div>

        {/* Detail Row Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-3.5">
          <div className="bg-[var(--color-paper)] rounded-[22px] p-6 border border-[var(--color-line)] h-64"></div>
          <div className="bg-[var(--color-paper)] rounded-[22px] p-6 border border-[var(--color-line)] h-64"></div>
        </div>
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
                <button onClick={() => router.push(`/dashboard/deep-work?taskId=${nextAction.id}`)} className="bg-[var(--color-honey)] text-[var(--color-ink)] border-none px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[var(--color-honey-soft)] hover:scale-105 transition-all flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-ink)] focus-visible:ring-[var(--color-honey)]">
                  Dive in <span>&rarr;</span>
                </button>
                <button onClick={() => router.push('/dashboard/daily-plan')} className="bg-transparent text-[var(--color-paper)] border border-[rgba(251,246,234,0.2)] px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[rgba(251,246,234,0.05)] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-ink)] focus-visible:ring-[var(--color-paper)]">
                  See full plan
                </button>
              </>
            ) : (
              <>
                <button onClick={() => router.push('/dashboard/daily-plan')} className="bg-[var(--color-honey)] text-[var(--color-ink)] border-none px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[var(--color-honey-soft)] hover:scale-105 transition-all flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-ink)] focus-visible:ring-[var(--color-honey)]">
                  Generate Plan <span>&rarr;</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          {nextAction && <NextActionCard nextAction={nextAction} />}

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

      {/* STATS ROW — Momentum & Balance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <Stat label="Focus time" big={momentumStats.focusTimeMinutes > 0 ? `${momentumStats.focusTimeMinutes}m` : '0m'} sub={momentumStats.focusTimeMinutes > 0 ? 'Logged today' : 'Dive in to start tracking'} tone="honey" />
        <Stat label="Tasks crushed" big={`${momentumStats.tasksCrushed}${momentumStats.tasksPlanned > 0 ? `/${momentumStats.tasksPlanned}` : ''}`} sub={momentumStats.tasksCrushed > 0 ? 'Keep it up!' : 'Complete a task to start'} tone="sage" />
        <Stat label="Upcoming" big={momentumStats.upcomingDeadlines} sub={momentumStats.upcomingDeadlines > 0 ? 'Due in the next 3 days' : 'Nothing due soon — nice!'} tone="ink" />
        <Stat label="Consistency" big={`${momentumStats.consistencyPercent}%`} sub={momentumStats.consistencyPercent >= 70 ? "You're on fire this week!" : 'Stay consistent this week'} tone="bruno" />
      </div>

      {/* DETAIL ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-3.5">
        <div className="bg-[var(--color-paper)] rounded-[22px] p-6 border border-[var(--color-line)] shadow-sm min-w-0">
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="font-mono text-[11px] text-[var(--color-ink-soft)] tracking-[0.16em] mb-1.5">THIS WEEK</div>
              <div className="font-serif text-[22px] text-[var(--color-ink)]">What&apos;s <em>coming up.</em></div>
            </div>
            <button onClick={() => router.push('/dashboard/calendar')} className="font-mono text-[11px] tracking-wide text-[var(--color-honey-deep)] hover:text-[var(--color-honey)] cursor-pointer bg-transparent border-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-honey)] rounded">
              See all &rarr;
            </button>
          </div>
          
          <div className="flex flex-col">
            {upcomingAgenda.map((item) => (
              <UpcomingAgendaItem 
                key={`${item.type}-${item.id}`} 
                item={item} 
                onView={(i) => {
                  if (i.type === 'event') {
                    setSelectedEventModal(i.raw as CalendarEvent);
                  } else {
                    setSelectedTaskModal(i.raw);
                  }
                }} 
              />
            ))}
            {upcomingAgenda.length === 0 && (
              <div className="py-8 text-center font-serif text-lg text-[var(--color-ink-soft)] italic">
                You&apos;re all caught up for the week.
              </div>
            )}
          </div>
        </div>

        <div className="bg-[var(--color-bruno-deep)] border border-[var(--color-line)] text-[var(--color-paper)] rounded-[22px] p-6 flex flex-col shadow-sm">
          <div className="font-mono text-[11px] tracking-[0.16em] text-[var(--color-honey)] mb-3.5">BRUNO NOTICED</div>
          
          <div className="flex-1">
            {insightLoading ? (
              <div className="flex gap-2 items-center text-[rgba(251,246,234,0.65)]">
                <div className="w-4 h-4 border-2 border-[var(--color-honey)] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-serif italic">Bruno is thinking...</span>
              </div>
            ) : insight ? (
              <p className="font-serif text-[22px] leading-[1.2] text-[var(--color-paper)] m-0">
                {insight}
              </p>
            ) : (
              <>
                <p className="font-serif text-[22px] leading-[1.2] text-[var(--color-paper)] m-0">
                  You have <em className="text-[var(--color-honey)] not-italic">{tasks.filter(t => !t.completed).length}</em> open tasks. Let&apos;s get to work! 🐻
                </p>
                <p className="text-[13px] text-[rgba(251,246,234,0.65)] mt-3.5 leading-relaxed">
                  I&apos;ll prioritize the deep work for you. Anything else you want me to learn?
                </p>
              </>
            )}
          </div>

          <button 
            onClick={() => router.push('/dashboard/chat')}
            className="mt-4 bg-[var(--color-honey)] text-[var(--color-ink)] border-none px-5 py-2.5 text-center rounded-full text-sm font-medium hover:bg-[var(--color-honey-soft)] hover:scale-[1.01] transition-all w-full cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-honey)] focus-visible:ring-offset-[var(--color-bruno-deep)]"
          >
            Open chat with Bruno
          </button>
        </div>
      </div>

      {/* Modals */}
      <EventDialog
        isOpen={!!selectedEventModal}
        onOpenChange={(open) => !open && setSelectedEventModal(null)}
        event={selectedEventModal}
        onSave={async (id, updates) => {
          await updateEvent(id, updates);
          // Optimistically update local state for Dashboard
          setThisWeekEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
          setSelectedEventModal(null);
        }}
        onDelete={async (id) => {
          await deleteEvent(id);
          setThisWeekEvents(prev => prev.filter(e => e.id !== id));
          setSelectedEventModal(null);
        }}
      />

      <Dialog open={!!selectedTaskModal} onOpenChange={(open) => !open && setSelectedTaskModal(null)}>
        <DialogContent className="p-0 overflow-hidden sm:max-w-[420px] bg-[var(--color-paper)] border-[var(--color-line)] shadow-2xl rounded-[24px]">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[var(--color-rose)]">●</span>
                <span className="font-mono text-[11px] text-[var(--color-ink-soft)] tracking-wide">OPEN TASK</span>
              </div>
              <button onClick={() => setSelectedTaskModal(null)} className="p-1.5 rounded-full hover:bg-[var(--color-cream-2)] text-[var(--color-ink-soft)] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <h2 className="text-2xl font-bold text-[var(--color-ink)] mb-2">{selectedTaskModal?.title}</h2>
            {selectedTaskModal?.due_date && (
              <div className="text-[13px] text-[var(--color-ink-soft)] mb-6 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Due {format(new Date(selectedTaskModal.due_date), 'MMM d, yyyy h:mm a')}
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => {
                  setSelectedTaskModal(null);
                  router.push(`/dashboard/deep-work?taskId=${selectedTaskModal?.id}`);
                }}
                className="flex-1 bg-[var(--color-ink)] text-[var(--color-paper)] py-2.5 rounded-full text-sm font-bold tracking-wide hover:opacity-90 transition-opacity"
              >
                Focus on Task
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
