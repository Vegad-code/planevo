'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchCanvasUpcomingAction, fetchCanvasTodoAction } from '@/lib/canvas/actions';
import { CanvasAssignment } from '@/lib/canvas/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  GraduationCap, 
  Sparkle as Sparkles, 
  Pulse as Activity, 
  BatteryMedium, 
  Sliders, 
  FloppyDisk as Save,
  Notebook,
  Target
} from '@phosphor-icons/react';
import { format } from 'date-fns';
import { generateAgenticSchedule, SchedulingPreferences, ScheduleBlock } from '@/lib/ai/agentic-scheduler';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import ScheduleTimeline from '@/components/dashboard/ScheduleTimeline';
import TaskBacklog from '@/components/dashboard/TaskBacklog';
import AssignmentDetailOverlay from '@/components/dashboard/AssignmentDetailOverlay';
import { useUIStore } from '@/lib/store/ui-store';
import type { UserAiMemory } from '@/lib/ai/memory';
import { posthog } from '@/lib/posthog';

interface BrunoMessage {
  role: 'user' | 'bruno';
  content: string;
}


const DEFAULT_PREFERENCES: SchedulingPreferences = {
  unavailable_blocks: [
    { label: 'School', start: '08:00', end: '15:00', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] }
  ],
  preferred_focus_time: 'afternoon',
  pomodoro_length: 50,
  break_length: 15,
  sleep_start: '22:30',
  sleep_end: '07:00'
};

interface Profile {
  id: string;
  canvas_url?: string;
  canvas_token?: string;
  scheduling_preferences?: SchedulingPreferences;
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
}

export default function DailyPlanPage() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { sidebarCollapsed } = useUIStore();
  const launched = searchParams.get('launch') === 'true';
  
  // View State
  const [view, setView] = useState<'sync' | 'schedule'>('sync');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Data State
  const [profile, setProfile] = useState<Profile | null>(null);
  const [aiMemory, setAiMemory] = useState<UserAiMemory | null>(null);
  const [assignments, setAssignments] = useState<CanvasAssignment[]>([]);
  const [manualTasks, setManualTasks] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [schedule, setSchedule] = useState<ScheduleBlock[] | null>(null);
  const [energyLevel, setEnergyLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [showBruno, setShowBruno] = useState(false);
  const [activeTab, setActiveTab] = useState<'focus' | 'energy'>('focus');
  const [autoLaunched, setAutoLaunched] = useState(false);
  const [scheduledTaskIds, setScheduledTaskIds] = useState<string[]>([]);

  // Assignment Context State
  const [selectedAssignment, setSelectedAssignment] = useState<CanvasAssignment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [brunoContextId, setBrunoContextId] = useState<string | undefined>(undefined);
  const [brunoInitialMsg, setBrunoInitialMsg] = useState<string | undefined>(undefined);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (user) {
      const today = format(new Date(), 'yyyy-MM-dd');

      const profilePromise = supabase.from('users').select('*').eq('id', user.id).single();
      const memoryPromise = supabase.from('user_ai_memory').select('*').eq('user_id', user.id).maybeSingle();
      const assignmentsPromise = supabase.from('canvas_assignments').select('*').eq('user_id', user.id);
      const tasksPromise = supabase.from('tasks').select('*').eq('user_id', user.id).eq('completed', false).or(`due_date.eq.${today},due_date.is.null`);
      const blocksPromise = (supabase as any).from('calendar_events').select('*').eq('user_id', user.id).eq('is_deleted', false).neq('status', 'rejected').gte('start_time', new Date(new Date().setHours(0,0,0,0)).toISOString()).lte('start_time', new Date(new Date().setHours(23,59,59,999)).toISOString()).order('start_time', { ascending: true });

      const [{ data: profileData }, { data: memoryData }, { data: dbAssignments }, { data: dbTasks }, { data: blocks }] = await Promise.all([
        profilePromise, memoryPromise, assignmentsPromise, tasksPromise, blocksPromise
      ]);

      setProfile(profileData as unknown as Profile);

      if (memoryData) {
        setAiMemory({
          preferred_focus_windows: memoryData.preferred_focus_windows as UserAiMemory['preferred_focus_windows'],
          avoided_focus_windows: memoryData.avoided_focus_windows as UserAiMemory['avoided_focus_windows'],
          break_preference: memoryData.break_preference as UserAiMemory['break_preference'],
          planning_style: memoryData.planning_style as UserAiMemory['planning_style'],
          tone_preference: memoryData.tone_preference as UserAiMemory['tone_preference'],
          task_detail_preference: memoryData.task_detail_preference as UserAiMemory['task_detail_preference'],
          recurring_constraints: memoryData.recurring_constraints as UserAiMemory['recurring_constraints'],
          learned_rules: memoryData.learned_rules as UserAiMemory['learned_rules'],
          disliked_patterns: memoryData.disliked_patterns as UserAiMemory['disliked_patterns'],
          accepted_patterns: memoryData.accepted_patterns as UserAiMemory['accepted_patterns'],
          source_counters: memoryData.source_counters as UserAiMemory['source_counters'],
        });
      } else {
        setAiMemory(null);
      }

      if (dbAssignments) {
        setAssignments(dbAssignments.map(a => ({
          id: (Number(a.id) || a.id) as any,
          name: a.name,
          due_at: a.due_at,
          html_url: a.html_url,
          course_id: (a as any).course_id || '',
          description: (a as any).description || ''
        })) as unknown as CanvasAssignment[]);
      }

      if (dbTasks) {
        setManualTasks(dbTasks as any[]);
      }

      if (blocks && blocks.length > 0) {
        const mappedBlocks: ScheduleBlock[] = blocks.map((g: any) => ({
          id: g.id,
          title: g.title,
          time: format(new Date(g.start_time), 'HH:mm'),
          duration: g.end_time ? Math.round((new Date(g.end_time).getTime() - new Date(g.start_time).getTime()) / 60000) : 30,
          type: (g.energy_level === 'low' ? 'break' : 'focus') as any,
          description: g.description || '',
          status: (g.status && g.status !== 'confirmed' ? g.status : g.metadata?.status || g.status) as any,
          is_ai_suggested: g.is_ai_suggested ?? g.metadata?.is_ai_suggested ?? true
        }));
        
        setSchedule(mappedBlocks);
        setScheduledTaskIds(blocks.map((b: any) => b.linked_task_id).filter(Boolean));
        setView('schedule');
      } else {
        setSchedule(null);
        setScheduledTaskIds([]);
        setView('sync');
      }
    }
    setLoading(false);
  }, [supabase]);

  // --- GENERATION LOGIC ---
  const handleGeneratePlan = useCallback(async () => {
    setProcessing(true);
    try {
      const response = await fetch('/api/ai/daily-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ energyLevel }),
      });

      if (!response.ok) throw new Error('Bruno is busy right now.');
      
      const data = await response.json();
      const generatedPlan = data.schedule || data.plan || [];
      
      // 1. Refresh local state immediately to sync from DB (where AI backend saved ghost blocks)
      await loadData();
      setView('schedule');
      
      toast.success("Bruno has penciled in some focus blocks!", {
        description: data.message
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Bruno had trouble building your plan.');
    } finally {
      setProcessing(false);
    }
  }, [energyLevel, loadData, supabase]);

  // Initial Load
  useEffect(() => {
    requestAnimationFrame(() => {
      void loadData();
    });
  }, [loadData]);

  // Handle assignmentId from URL
  useEffect(() => {
    const aid = searchParams.get('assignmentId');
    if (aid && assignments.length > 0) {
      const found = assignments.find(a => String(a.id) === aid);
      if (found) {
        setTimeout(() => {
          setSelectedAssignment(found);
          setIsDetailOpen(true);
        }, 0);
      }
    }
  }, [searchParams, assignments]);

  // Auto-launch Logic
  useEffect(() => {
    if (launched && view === 'sync' && !loading && !autoLaunched) {
      const timer = setTimeout(() => {
        setAutoLaunched(true);
        handleGeneratePlan();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [launched, view, loading, autoLaunched, handleGeneratePlan]);

  // --- SYNC LOGIC ---
  const handleSyncAll = useCallback(async () => {
    setProcessing(true);
    try {
      if (profile?.canvas_url && profile?.canvas_token) {
        let upcoming = await fetchCanvasUpcomingAction(profile.canvas_url, profile.canvas_token);
        if (upcoming.length === 0) {
          upcoming = await fetchCanvasTodoAction(profile.canvas_url, profile.canvas_token);
        }
        const sorted = upcoming.sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
        const assignmentsOnly = upcoming.filter(item => item.type === 'assignment');
        const eventsOnly = upcoming.filter(item => item.type === 'event');
        
        setAssignments(assignmentsOnly);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // 1. Upsert Assignments with user-safe composite key
          if (assignmentsOnly.length > 0) {
            const toUpsertAssignments = assignmentsOnly.map(a => ({
              id: `${user.id}:${a.id}`,
              external_id: String(a.id),
              user_id: user.id,
              name: a.name,
              description: a.description || '',
              due_at: a.due_at,
              html_url: a.html_url,
              synced_at: new Date().toISOString()
            }));
            await (supabase.from('canvas_assignments') as any).upsert(toUpsertAssignments, { onConflict: 'user_id,external_id' });
          }

          // 2. Upsert Events (Classes/Meetings) into calendar_events
          if (eventsOnly.length > 0) {
            const toUpsertEvents = eventsOnly.map(e => ({
              external_id: String(e.id),
              user_id: user.id,
              title: e.name,
              start_time: e.due_at, // In Canvas, events use start_at mapped to due_at in our action
              end_time: new Date(new Date(e.due_at).getTime() + 60 * 60 * 1000).toISOString(), // Default 1hr
              source: 'canvas',
              description: e.description || `Canvas Course: ${e.course_id}`,
              metadata: { canvas_course_id: e.course_id, html_url: e.html_url }
            }));
            
            await supabase.from('calendar_events').upsert(toUpsertEvents, { onConflict: 'external_id' });
          }
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.provider_token) {
        const now = new Date().toISOString();
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&singleEvents=true&orderBy=startTime&maxResults=10`,
          { headers: { Authorization: `Bearer ${session.provider_token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          setCalendarEvents(data.items || []);
        }
      }
      toast.success("Everything's synced up!");
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync. Check your connections.');
    } finally {
      setProcessing(false);
    }
  }, [profile, supabase]);

  // Removed redundant handleGeneratePlan from here (moved up)

  // --- SCHEDULE LOGIC ---
  const handleCommand = useCallback(async (message: string, assignmentId?: string) => {
    setProcessing(true);
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: `You are a scheduling assistant. The user has this current schedule: ${JSON.stringify(schedule)}. Their preferences: ${JSON.stringify(profile?.scheduling_preferences || DEFAULT_PREFERENCES)}. Respond with schedule adjustments in JSON when asked to reschedule.` },
            { role: 'user', content: message }
          ],
          assignmentId: assignmentId || brunoContextId,
          diagnostics: true
        }),
      });

      if (!response.ok) throw new Error('Failed to reach Bruno');
      const data = await response.json();
      // Try to parse schedule from response, fall back to text
      if (data.updated_schedule) {
        setSchedule(data.updated_schedule || []);
      }
      return data.text || data.bruno_response;
    } catch {
      toast.error("Bruno's connection is a bit fuzzy.");
      return null;
    } finally {
      setProcessing(false);
    }
  }, [schedule, profile, brunoContextId]);

  const handleBrunoChat = useCallback(async (message: string, history: { role: string, content: string }[], assignmentId?: string) => {
    setProcessing(true);
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(m => ({
            role: m.role === 'bruno' ? 'assistant' : m.role,
            content: m.content
          })),
          assignmentId: assignmentId || brunoContextId,
          diagnostics: true
        }),
      });

      if (!response.ok) throw new Error('Bruno is overthinking...');
      const data = await response.json();
      return data.text || data.bruno_response;
    } catch (error) {
      console.error('Bruno chat error:', error);
      toast.error("Bruno is offline for a quick nap.");
      return null;
    } finally {
      setProcessing(false);
    }
  }, [brunoContextId]);

  const handleAskBruno = useCallback((assignment: CanvasAssignment) => {
    setBrunoContextId(String(assignment.id));
    setBrunoInitialMsg(`I'm looking at "${assignment.name}". How can I help you get started?`);
    setShowBruno(true);
    setIsDetailOpen(false);
    toast.info("Bruno is reading the assignment details...");
  }, []);

  const handleScheduleAssignment = useCallback(async (assignment: CanvasAssignment) => {
    setIsDetailOpen(false);
    toast.info(`Finding a spot for ${assignment.name}...`);
    await handleCommand(`Find a good time to work on my assignment: ${assignment.name}`, String(assignment.id));
  }, [handleCommand]);

  const handleSavePlan = useCallback(async () => {
    // With canonical calendar_events, saving is implicit.
    // We just show a success toast.
    toast.success("Plan Synced", {
      description: "Your schedule is active across all devices.",
      icon: <Save className="w-4 h-4 text-green-500" />
    });
  }, []);

  const handleScheduleFeedback = useCallback(async (
    block: ScheduleBlock,
    action: 'accept' | 'too_vague' | 'too_many_breaks' | 'wrong_time'
  ) => {
    try {
      // 1. If it's a Ghost Block, update top-level status directly via Supabase
      if ((block.status === 'pending' || block.is_ai_suggested) && block.id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const newStatus = action === 'accept' ? 'accepted' : 'rejected';
          await (supabase.from('calendar_events') as any)
            .update({ status: newStatus })
            .eq('id', block.id)
            .eq('user_id', user.id);
            
          // Record feedback
          await (supabase.from('ai_feedback') as any).insert({
            user_id: user.id,
            feature_name: 'daily_plan_block',
            action: action,
            suggestion_json: block
          });
        }
      }

      // 2. Feedback saved locally (full AI feedback loop in Block G)
      if (action === 'accept') {
        posthog.capture('plan_accepted', { block_id: block.id, block_title: block.title });
        toast.success('Confirmed!', { description: 'This block is now locked into your schedule.' });
      } else {
        toast.info('Removed', { description: 'I\'ll find a better way next time.' });
      }

      await loadData();
    } catch (error) {
      console.error('Schedule feedback error:', error);
      toast.error('Could not save feedback');
    }
  }, [loadData, supabase]);

  if (loading) {
    return (
      <div className="animate-pulse fade-in duration-500 pb-12 w-full max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-7 border-b border-[var(--color-line)] mb-8">
          <div>
            <div className="w-32 h-3 bg-[var(--color-line-strong)] rounded-full mb-4"></div>
            <div className="w-64 h-12 md:w-96 md:h-14 bg-[var(--color-line-strong)] rounded-xl mb-4"></div>
            <div className="w-48 h-4 bg-[var(--color-line-strong)] rounded-full"></div>
          </div>
          <div className="flex gap-2.5 flex-wrap justify-end">
            <div className="w-24 h-9 bg-[var(--color-line-strong)] rounded-full"></div>
            <div className="w-24 h-9 bg-[var(--color-line-strong)] rounded-full"></div>
            <div className="w-24 h-9 bg-[var(--color-line-strong)] rounded-full hidden md:block"></div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
             <div className="bg-[var(--color-paper)] border border-[var(--color-line)] rounded-[22px] p-6 min-h-[400px]">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="w-24 h-3 bg-[var(--color-line-strong)] rounded-full mb-3"></div>
                    <div className="w-48 h-8 bg-[var(--color-line-strong)] rounded-lg"></div>
                  </div>
                  <div className="w-20 h-8 bg-[var(--color-line-strong)] rounded-full"></div>
                </div>
                <div className="space-y-4">
                  <div className="w-full h-20 bg-[var(--color-cream)] rounded-xl"></div>
                  <div className="w-full h-20 bg-[var(--color-cream)] rounded-xl"></div>
                  <div className="w-full h-20 bg-[var(--color-cream)] rounded-xl"></div>
                  <div className="w-full h-20 bg-[var(--color-cream)] rounded-xl"></div>
                </div>
             </div>
          </div>
          <div className="space-y-6 hidden lg:block">
            <div className="bg-[var(--color-paper)] border border-[var(--color-line)] rounded-[22px] p-6 h-48"></div>
            <div className="bg-[var(--color-paper)] border border-[var(--color-line)] rounded-[22px] p-6 h-64"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${sidebarCollapsed ? 'max-w-full' : 'max-w-7xl'} mx-auto animate-fade-in pb-20 transition-all duration-300`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-7 border-b border-[var(--color-line)] mb-8">
        <div>
          <div className="font-mono text-[11px] tracking-[0.18em] text-[var(--color-ink-soft)] uppercase mb-2">
            DAILY PLAN · {format(new Date(), 'EEEE LLLL d').toUpperCase()}
          </div>
          <h1 className="font-serif text-[40px] md:text-[42px] leading-tight text-[var(--color-ink)] m-0">
            Today, <em className="text-[var(--color-honey-deep)] italic font-serif">at a glance.</em>
          </h1>
          <p className="font-sans text-[14.5px] text-[var(--color-ink-soft)] mt-3 mb-0">
            {view === 'schedule' 
              ? `Bruno built a plan with ${schedule ? schedule.length : 0} block${schedule && schedule.length !== 1 ? 's' : ''} from your sources.`
              : "Let's gather your tasks and schedule to build your daily plan."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {view === 'sync' ? (
            <>
              <button 
                onClick={handleSyncAll} 
                disabled={processing}
                className="bg-transparent border border-[var(--color-line-strong)] hover:bg-[var(--color-cream-2)] text-[var(--color-ink)] px-5 py-2.5 rounded-full text-sm font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-ink)]"
              >
                {processing ? 'Syncing...' : 'Refresh sources'}
              </button>
              <button 
                onClick={handleGeneratePlan}
                disabled={processing}
                className="bg-[var(--color-ink)] text-[var(--color-paper)] px-5 py-2.5 rounded-full text-sm font-medium hover:scale-105 transition-transform cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-ink)]"
              >
                Regenerate plan
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <button 
                onClick={handleSyncAll} 
                disabled={processing}
                className="bg-transparent border border-[var(--color-line-strong)] hover:bg-[var(--color-cream-2)] text-[var(--color-ink)] px-5 py-2.5 rounded-full text-sm font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-ink)]"
              >
                Refresh sources
              </button>
              <button 
                onClick={handleGeneratePlan}
                disabled={processing}
                className="bg-[var(--color-ink)] text-[var(--color-paper)] px-5 py-2.5 rounded-full text-sm font-medium hover:scale-105 transition-transform cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-ink)]"
              >
                Regenerate plan
              </button>
              <button 
                onClick={handleSavePlan}
                className="bg-[var(--color-honey)] hover:scale-105 text-[var(--color-ink)] px-5 py-2.5 rounded-full text-sm font-medium transition-transform flex items-center cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-honey)]"
              >
                <Save className="w-4 h-4 mr-1.5" />
                Save Plan
              </button>
              <button 
                onClick={() => setView('sync')}
                className="bg-transparent border border-[var(--color-line-strong)] hover:bg-[var(--color-cream-2)] text-[var(--color-ink)] px-5 py-2.5 rounded-full text-sm font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-ink)]"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="w-full">
        <AnimatePresence mode="wait">
          {view === 'sync' ? (
            <motion.div 
              key="sync-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Sync Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="bg-[var(--color-paper)] border border-[var(--color-line)] rounded-[22px] shadow-sm overflow-hidden p-6">
                  <div className="font-mono text-[11px] tracking-[0.16em] text-[var(--color-ink-soft)] flex items-center gap-2 uppercase mb-4">
                    <Calendar className="w-4 h-4 text-[var(--color-ink)]" />
                    Calendar Events
                  </div>
                  <div className="max-h-60 overflow-y-auto no-scrollbar">
                    {calendarEvents.length === 0 ? (
                      <div className="py-8 text-center text-[11px] uppercase font-mono tracking-wide text-[var(--color-ink-faint)]">No events found</div>
                    ) : (
                      <ul className="divide-y divide-[var(--color-line)]">
                        {calendarEvents.map((e) => (
                          <li key={e.id} className="py-3 text-[13.5px] font-medium text-[var(--color-ink)]">{e.summary}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Card>

                <Card className="bg-[var(--color-paper)] border border-[var(--color-line)] rounded-[22px] shadow-sm overflow-hidden p-6">
                  <div className="font-mono text-[11px] tracking-[0.16em] text-[var(--color-ink-soft)] flex items-center gap-2 uppercase mb-4">
                    <GraduationCap className="w-4 h-4 text-[var(--color-ink)]" />
                    Canvas Tasks
                  </div>
                  <div className="max-h-60 overflow-y-auto no-scrollbar">
                    {assignments.length === 0 ? (
                      <div className="py-8 text-center text-[11px] uppercase font-mono tracking-wide text-[var(--color-ink-faint)]">No tasks synced</div>
                    ) : (
                      <ul className="divide-y divide-[var(--color-line)]">
                        {assignments.map((a) => (
                          <li key={a.id} className="py-2.5 hover:bg-[var(--color-cream-2)] rounded-lg transition-colors flex items-center justify-between group px-2 -mx-2">
                            <span className="text-[13.5px] font-medium text-[var(--color-ink)] truncate mr-2">{a.name}</span>
                            <button 
                              onClick={() => {
                                setSelectedAssignment(a);
                                setIsDetailOpen(true);
                              }}
                              className="text-[10px] font-mono uppercase tracking-wide text-[var(--color-ink)] border border-[var(--color-line-strong)] hover:bg-[var(--color-cream-2)] px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-ink)] focus-visible:opacity-100"
                            >
                              Details
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Card>

                <Card className="bg-[var(--color-paper)] border border-[var(--color-line)] rounded-[22px] shadow-sm overflow-hidden p-6">
                  <div className="font-mono text-[11px] tracking-[0.16em] text-[var(--color-ink-soft)] flex items-center gap-2 uppercase mb-4">
                    <Activity className="w-4 h-4 text-[var(--color-ink)]" />
                    Project Tasks
                  </div>
                  <div className="max-h-60 overflow-y-auto no-scrollbar">
                    {manualTasks.length === 0 ? (
                      <div className="py-8 text-center text-[11px] uppercase font-mono tracking-wide text-[var(--color-ink-faint)]">No project tasks</div>
                    ) : (
                      <ul className="divide-y divide-[var(--color-line)]">
                        {manualTasks.map((t) => (
                          <li key={t.id} className="py-3 text-[13.5px] font-medium text-[var(--color-ink)]">{t.title}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Card>
              </div>

              {/* CTA Box */}
              <div className="bg-[var(--color-paper)] p-8 md:p-12 border border-[var(--color-line)] rounded-[22px] shadow-sm text-[var(--color-ink)] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Sparkles size={200} />
                </div>
                
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[var(--color-cream-2)] rounded-2xl flex items-center justify-center border border-[var(--color-line)]">
                      <Sparkles className="text-[var(--color-ink)] w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-serif text-3xl tracking-tight m-0 font-normal">Bruno is ready.</h3>
                      <p className="text-[var(--color-ink-soft)] font-mono uppercase text-[10px] tracking-[0.16em] mt-1">Building a constraint-aware plan for your day.</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-6">
                    <div className="space-y-3">
                      <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">Set your energy level:</p>
                      <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Current Energy Level">
                        {(['low', 'medium', 'high'] as const).map((level) => (
                          <button
                            key={level}
                            role="radio"
                            aria-checked={energyLevel === level}
                            onClick={() => setEnergyLevel(level)}
                            className={`px-5 py-2 rounded-full text-xs font-mono tracking-wide uppercase transition-all border cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-ink)] ${
                              energyLevel === level 
                                ? 'bg-[var(--color-ink)] text-[var(--color-paper)] border-[var(--color-ink)] shadow-sm' 
                                : 'text-[var(--color-ink-soft)] border-[var(--color-line-strong)] hover:border-[var(--color-ink)]'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={handleGeneratePlan}
                      disabled={processing}
                      className="w-full bg-[var(--color-ink)] text-[var(--color-paper)] hover:bg-[var(--color-ink-soft)] text-sm font-medium py-3 rounded-full shadow-sm transition-all active:scale-[0.98] flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-ink)]"
                    >
                      {processing ? (
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 border-2 border-[var(--color-paper)] border-t-transparent rounded-full animate-spin" />
                          Generating Plan...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Create Daily Plan
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="schedule-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid grid-cols-1 lg:grid-cols-[1.75fr_1fr] gap-6"
            >
              {/* Left Column: Timeline & Backlog */}
              <div className="space-y-6">
                {/* Timeline Card */}
                <div className="bg-[var(--color-paper)] border border-[var(--color-line)] rounded-[22px] p-6 shadow-sm">
                  {/* Timeline Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="font-mono text-[11px] text-[var(--color-ink-soft)] tracking-[0.16em] uppercase">YOUR DAY · {schedule ? schedule.length : 0} BLOCKS</div>
                      <div className="font-serif text-3xl text-[var(--color-ink)] mt-1.5 font-normal tracking-tight">9:00 AM — 9:30 PM</div>
                    </div>
                    {/* Selector Segment */}
                    <div className="flex bg-[var(--color-cream-2)] p-1 rounded-full border border-[var(--color-line)]">
                      <button className="px-4 py-1.5 rounded-full text-xs font-mono tracking-wide font-medium bg-[var(--color-ink)] text-[var(--color-paper)] shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-ink)]">
                        DAY
                      </button>
                      <button className="px-4 py-1.5 rounded-full text-xs font-mono tracking-wide font-medium text-[var(--color-ink-soft)] bg-transparent hover:text-[var(--color-ink)] cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-ink)]">
                        WEEK
                      </button>
                    </div>
                  </div>

                  {/* Timeline Component */}
                  {schedule && (
                    <ScheduleTimeline 
                      initialBlocks={schedule} 
                      onUpdate={setSchedule}
                      onFeedback={handleScheduleFeedback}
                      onDeconstruct={async (id) => {
                        setShowBruno(true);
                        await handleCommand(`Break down the task with ID ${id} into small steps.`);
                      }}
                    />
                  )}
                </div>

                {/* Backlog */}
                <TaskBacklog 
                  onScheduleOne={async (task) => {
                    toast.info(`Scheduling "${task.title}"...`);
                    await handleCommand(`Find a 30 minute slot for "${task.title}".`);
                  }}
                  onScheduleAll={async (tasks) => {
                    toast.info(`Scheduling all tasks...`);
                    await handleCommand(`Integrate these into my plan: ${tasks.map(t => t.title).join(', ')}`);
                  }}
                  isProcessing={processing}
                  scheduledTaskIds={scheduledTaskIds}
                />
              </div>

              {/* Right Column: Widgets */}
              <div className="space-y-6">
                {/* Energy levels */}
                <div className="bg-[var(--color-paper)] border border-[var(--color-line)] rounded-[22px] p-6 shadow-sm">
                  <div className="font-mono text-[11px] text-[var(--color-ink-soft)] tracking-[0.16em] uppercase mb-4">
                    YOUR ENERGY · {format(new Date(), 'EEEE').toUpperCase()}
                  </div>
                  
                  {/* Segmented Picker */}
                  <div className="grid grid-cols-3 bg-[var(--color-cream-2)] p-0.5 rounded-full border border-[var(--color-line)] mb-4">
                    {(['low', 'medium', 'high'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setEnergyLevel(level)}
                        className={`py-2 rounded-full text-[10.5px] font-mono font-medium tracking-wide uppercase transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-ink)] ${
                          energyLevel === level 
                            ? 'bg-[var(--color-ink)] text-[var(--color-paper)] shadow-sm' 
                            : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] bg-transparent cursor-pointer'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  
                  <p className="text-[13px] text-[var(--color-ink-soft)] leading-relaxed font-sans">
                    {energyLevel === 'high' 
                      ? "Bruno scheduled deep work blocks for your morning when focus is highest."
                      : energyLevel === 'medium'
                      ? "Bruno will keep the morning block heavy and add a recovery walk at 2 PM."
                      : "Bruno lightened your schedule, focusing on quick tasks and recovery breaks."}
                  </p>
                </div>

                {/* Sources Pulled */}
                <div className="bg-[var(--color-paper)] border border-[var(--color-line)] rounded-[22px] p-6 shadow-sm">
                  <div className="font-mono text-[11px] text-[var(--color-ink-soft)] tracking-[0.16em] uppercase mb-4">
                    SOURCES PULLED
                  </div>
                  <div className="space-y-3">
                    <SourceRow initial="C" color="bg-[var(--color-rose)]" name="Canvas LMS" detail={`${assignments.length} deadlines`} />
                    <SourceRow initial="G" color="bg-[var(--color-blue)]" name="Google Calendar" detail={`${calendarEvents.length} events`} />
                    <SourceRow initial="T" color="bg-[var(--color-honey)]" name="Tasks & reminders" detail={`${manualTasks.length} items`} />
                  </div>
                </div>

                {/* Bruno notices */}
                <div className="bg-[var(--color-bruno-deep)] border border-[var(--color-line)] text-[var(--color-paper)] rounded-[22px] p-6 shadow-sm flex flex-col relative overflow-hidden">
                  <div className="flex items-center gap-2.5 mb-3.5">
                    <svg viewBox="0 0 48 48" width="24" height="24" className="shrink-0">
                      <circle cx="24" cy="24" r="24" fill="var(--color-bruno)" />
                      <ellipse cx="24" cy="30" rx="9" ry="7" fill="var(--color-belly)" />
                      <circle cx="19" cy="23" r="1.7" fill="var(--color-ink)" />
                      <circle cx="29" cy="23" r="1.7" fill="var(--color-ink)" />
                      <ellipse cx="24" cy="28" rx="1.8" ry="1.3" fill="var(--color-ink)" />
                    </svg>
                    <span className="font-mono text-[10.5px] tracking-[0.16em] text-[var(--color-honey)] uppercase">BRUNO NOTICED</span>
                  </div>
                  <p className="text-[13.5px] leading-relaxed text-[var(--color-paper)] mb-5 font-serif italic">
                    {schedule && schedule.length > 0
                      ? `"I've set up ${schedule.length} block${schedule.length !== 1 ? 's' : ''} for you today. Tap to adjust if anything feels off."`
                      : `"Looking good so far. Generate a plan to see what Bruno recommends."`}
                  </p>
                  <button 
                    onClick={() => router.push('/dashboard/chat')}
                    className="w-full bg-transparent text-[var(--color-honey)] hover:text-[var(--color-honey-soft)] border border-[rgba(251,246,234,0.25)] hover:border-[var(--color-honey)] text-xs font-mono font-medium py-3 rounded-xl transition-all cursor-pointer uppercase tracking-wider"
                  >
                    Keep tomorrow morning
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AssignmentDetailOverlay 
        assignment={selectedAssignment}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onAskBruno={handleAskBruno}
        onSchedule={handleScheduleAssignment}
      />
    </div>
  );
}

const SourceRow = ({ initial, color, name, detail }: { initial: string, color: string, name: string, detail: string }) => {
  return (
    <div className="flex items-center justify-between py-2 border-t border-[var(--color-line)] first:border-0 first:pt-0">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[13px] font-bold ${color}`}>
          {initial}
        </div>
        <div>
          <div className="text-[13.5px] font-medium text-[var(--color-ink)]">{name}</div>
          <div className="text-[11.5px] text-[var(--color-ink-soft)] font-sans">{detail}</div>
        </div>
      </div>
      <div className="font-mono text-[9px] tracking-wide text-[var(--color-sage)] flex items-center gap-1.5 uppercase font-semibold">
        <span>CONNECTED</span>
      </div>
    </div>
  );
};

function applyMemoryToSchedulingPreferences(
  preferences: SchedulingPreferences,
  memory: UserAiMemory | null
): SchedulingPreferences {
  if (!memory) return preferences;

  const breakLength = memory.break_preference.preferred_minutes || preferences.break_length;
  const breakPreference = memory.break_preference.frequency;
  const preferredFocusWindow = memory.preferred_focus_windows[0];
  const avoidedConstraints = memory.avoided_focus_windows.map((window) => ({
    label: `Avoid: ${window.label}`,
    start: window.start,
    end: window.end,
    days: window.days.length > 0
      ? window.days
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  }));

  return {
    ...preferences,
    break_length: breakPreference === 'minimal' ? Math.min(breakLength, 10) : breakLength,
    pomodoro_length: memory.planning_style.mode === 'strict'
      ? preferences.pomodoro_length
      : Math.min(preferences.pomodoro_length, 50),
    preferred_focus_time: inferPreferredFocusTime(preferredFocusWindow, preferences.preferred_focus_time),
    unavailable_blocks: [
      ...(preferences.unavailable_blocks || []),
      ...avoidedConstraints,
    ],
  };
}

function inferPreferredFocusTime(
  window: UserAiMemory['preferred_focus_windows'][number] | undefined,
  fallback: SchedulingPreferences['preferred_focus_time']
): SchedulingPreferences['preferred_focus_time'] {
  if (!window) return fallback;
  const hour = Number(window.start.split(':')[0]);
  if (Number.isNaN(hour)) return fallback;
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
