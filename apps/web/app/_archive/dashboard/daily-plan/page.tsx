'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchCanvasUpcomingAction, fetchCanvasTodoAction } from '@/lib/canvas/actions';
import { CanvasAssignment } from '@/lib/canvas/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, GraduationCap, Sparkles, Activity, BatteryMedium, Sliders, Save } from 'lucide-react';
import { format } from 'date-fns';
import { generateAgenticSchedule, SchedulingPreferences, ScheduleBlock } from '@/lib/ai/agentic-scheduler';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import ScheduleTimeline from '@/components/dashboard/ScheduleTimeline';
import OllieChatSidebar from '@/components/dashboard/OllieChatSidebar';
import TaskBacklog from '@/components/dashboard/TaskBacklog';
import OllieAvatar from '@/components/ollie/OllieAvatar';
import AssignmentDetailOverlay from '@/components/dashboard/AssignmentDetailOverlay';
import type { UserAiMemory } from '@/lib/ai/memory';

interface OllieMessage {
  role: 'user' | 'ollie';
  content: string;
}
import type { Task } from '@/types/database';

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
  const launched = searchParams.get('launch') === 'true';
  
  // View State
  const [view, setView] = useState<'sync' | 'schedule'>('sync');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Data State
  const [profile, setProfile] = useState<Profile | null>(null);
  const [aiMemory, setAiMemory] = useState<UserAiMemory | null>(null);
  const [assignments, setAssignments] = useState<CanvasAssignment[]>([]);
  const [manualTasks, setManualTasks] = useState<Task[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [schedule, setSchedule] = useState<ScheduleBlock[] | null>(null);
  const [energyLevel, setEnergyLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [showOllie, setShowOllie] = useState(false);
  const [activeTab, setActiveTab] = useState<'focus' | 'energy'>('focus');
  const [autoLaunched, setAutoLaunched] = useState(false);

  // Assignment Context State
  const [selectedAssignment, setSelectedAssignment] = useState<CanvasAssignment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [ollieContextId, setOllieContextId] = useState<string | undefined>(undefined);
  const [ollieInitialMsg, setOllieInitialMsg] = useState<string | undefined>(undefined);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // 1. Load Profile & Prefs
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(profileData as Profile);

      const { data: memoryData } = await supabase
        .from('user_ai_memory')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

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

      // 2. Check for today's schedule
      const { data: scheduleData } = await supabase
        .from('schedules')
        .select('schedule_json')
        .eq('user_id', user.id)
        .eq('date', format(new Date(), 'yyyy-MM-dd'))
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (scheduleData?.[0]) {
        setSchedule(scheduleData[0].schedule_json as ScheduleBlock[]);
        setView('schedule');
      } else {
        // 2b. Fallback to current_day_plan (live context)
        const { data: livePlan } = await supabase
          .from('current_day_plan')
          .select('plan_json')
          .eq('user_id', user.id)
          .single();
        
        if (livePlan) {
          setSchedule(livePlan.plan_json as ScheduleBlock[]);
          setView('schedule');
        } else {
          setView('sync');
        }
      }

      // 3. Load existing assignments from DB (cached)
      const { data: dbAssignments } = await supabase
        .from('canvas_assignments')
        .select('*')
        .eq('user_id', user.id);
      
      if (dbAssignments) {
        setAssignments(dbAssignments.map(a => ({
          id: Number(a.id) || a.id,
          name: a.name,
          due_at: a.due_at,
          html_url: a.html_url,
          course_id: '',
          description: a.description || ''
        })));
      }

      // 4. Load today's manual/imported tasks
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: dbTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', false)
        .or(`due_date.eq.${today},due_date.is.null`);
      
      if (dbTasks) {
        setManualTasks(dbTasks as Task[]);
      }

      // 5. Load Ghost Blocks from calendar_events
      const { data: ghostBlocks } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_ai_suggested', true)
        .eq('is_deleted', false)
        .gte('start_time', new Date(new Date().setHours(0,0,0,0)).toISOString())
        .lte('start_time', new Date(new Date().setHours(23,59,59,999)).toISOString());

      if (ghostBlocks && ghostBlocks.length > 0) {
        const mappedBlocks: ScheduleBlock[] = ghostBlocks.map(g => ({
          id: g.id,
          title: g.title,
          time: format(new Date(g.start_time), 'HH:mm'),
          duration: g.end_time ? (new Date(g.end_time).getTime() - new Date(g.start_time).getTime()) / (1000 * 60) : 30,
          type: (g.energy_level === 'low' ? 'break' : 'focus') as any,
          description: g.description || '',
          status: g.status as any,
          is_ai_suggested: true
        }));
        
        setSchedule(prev => {
          // Merge or replace? Let's replace for now if we have new ghost blocks
          return mappedBlocks;
        });
        setView('schedule');
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

      if (!response.ok) throw new Error('Ollie is busy right now.');
      
      const data = await response.json();
      const generatedPlan = data.schedule || data.plan || [];
      
      // 1. Save to current_day_plan for live context
      const { data: { user } } = await supabase.auth.getUser();
      if (user && generatedPlan.length > 0) {
        // Save to current_day_plan for live context
        await supabase
          .from('current_day_plan')
          .upsert({
            user_id: user.id,
            plan_json: generatedPlan,
            updated_at: new Date().toISOString()
          });
          
        // Also save to schedules for historical persistence (what loadData checks first)
        await supabase
          .from('schedules')
          .upsert({
            user_id: user.id,
            date: format(new Date(), 'yyyy-MM-dd'),
            schedule_json: generatedPlan,
            created_at: new Date().toISOString()
          });
      }

      // 2. Refresh local state immediately to avoid "stuck" UI
      if (generatedPlan.length > 0) {
        setSchedule(generatedPlan);
        setView('schedule');
      }
      
      // 3. Still load from DB to sync everything
      await loadData();
      
      toast.success("Ollie has penciled in some focus blocks!", {
        description: data.message
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Ollie had trouble building your plan.');
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
        setSelectedAssignment(found);
        setIsDetailOpen(true);
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
          // 1. Upsert Assignments
          if (assignmentsOnly.length > 0) {
            const toUpsertAssignments = assignmentsOnly.map(a => ({
              id: String(a.id),
              user_id: user.id,
              name: a.name,
              description: a.description || '',
              due_at: a.due_at,
              html_url: a.html_url,
              synced_at: new Date().toISOString()
            }));
            await supabase.from('canvas_assignments').upsert(toUpsertAssignments);
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
  const handleCommand = useCallback(async (message: string) => {
    setProcessing(true);
    try {
      const response = await fetch('/api/ai/schedule-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentSchedule: schedule,
          userMessage: message,
          assignmentId: ollieContextId,
          userPreferences: profile?.scheduling_preferences || DEFAULT_PREFERENCES
        }),
      });

      if (!response.ok) throw new Error('Failed to reach Ollie');
      const data = await response.json();
      setSchedule(data.updated_schedule || []);
      return data.ollie_response;
    } catch {
      toast.error("Ollie's connection is a bit fuzzy.");
      return null;
    } finally {
      setProcessing(false);
    }
  }, [schedule, profile, ollieContextId]);

  const handleOllieChat = useCallback(async (message: string, history: { role: string, content: string }[], assignmentId?: string) => {
    setProcessing(true);
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(m => ({
            role: m.role === 'ollie' ? 'assistant' : m.role,
            content: m.content
          })),
          assignmentId: assignmentId || ollieContextId,
          diagnostics: true
        }),
      });

      if (!response.ok) throw new Error('Ollie is overthinking...');
      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error('Ollie chat error:', error);
      toast.error("Ollie is offline for a quick nap.");
      return null;
    } finally {
      setProcessing(false);
    }
  }, [ollieContextId]);

  const handleAskOllie = useCallback((assignment: CanvasAssignment) => {
    setOllieContextId(String(assignment.id));
    setOllieInitialMsg(`I'm looking at "${assignment.name}". How can I help you get started?`);
    setShowOllie(true);
    setIsDetailOpen(false);
    toast.info("Ollie is reading the assignment details...");
  }, []);

  const handleScheduleAssignment = useCallback(async (assignment: CanvasAssignment) => {
    setIsDetailOpen(false);
    toast.info(`Finding a spot for ${assignment.name}...`);
    await handleCommand(`Find a good time to work on my assignment: ${assignment.name}`, String(assignment.id));
  }, [handleCommand]);

  const handleSavePlan = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !schedule) return;

    // Save to schedules (historical)
    const { error: scheduleError } = await supabase
      .from('schedules')
      .upsert({
        user_id: user.id,
        date: format(new Date(), 'yyyy-MM-dd'),
        schedule_json: schedule,
        created_at: new Date().toISOString()
      });

    // Also sync to current_day_plan (live context)
    const { error: dayPlanError } = await supabase
      .from('current_day_plan')
      .upsert({
        user_id: user.id,
        plan_json: schedule,
        updated_at: new Date().toISOString()
      });

    if (scheduleError || dayPlanError) {
      toast.error("Failed to save plan");
    } else {
      toast.success("Plan Saved", {
        description: "Your schedule is now synced across all devices.",
        icon: <Save className="w-4 h-4 text-green-500" />
      });
    }
  }, [schedule, supabase]);

  const handleScheduleFeedback = useCallback(async (
    block: ScheduleBlock,
    action: 'accept' | 'too_vague' | 'too_many_breaks' | 'wrong_time'
  ) => {
    try {
      // 1. If it's a Ghost Block, handle the status update
      if (block.status === 'pending') {
        const ghostRes = await fetch('/api/ai/ghost-block', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            blockId: block.id, 
            action: action === 'accept' ? 'accept' : 'reject' 
          }),
        });
        if (!ghostRes.ok) throw new Error('Ghost block update failed');
      }

      // 2. Save feedback for AI learning
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_name: 'daily_plan_schedule_block',
          suggestion_json: block,
          action,
          correction_text: action === 'accept' ? null : action.replaceAll('_', ' '),
        }),
      });

      if (action === 'accept') {
        toast.success('Confirmed!', { description: 'This block is now locked into your schedule.' });
      } else {
        toast.info('Removed', { description: 'I\'ll find a better way next time.' });
      }

      await loadData();
    } catch (error) {
      console.error('Schedule feedback error:', error);
      toast.error('Could not save feedback');
    }
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <h2 className="mt-6 text-xl font-black text-surface-900 uppercase tracking-tighter">Preparing Daily Plan...</h2>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-surface-900 uppercase tracking-tighter leading-none mb-1 flex items-center gap-2">
            Daily Plan
            {view === 'schedule' && <span className="text-brand-500 px-2 py-0.5 bg-brand-50 rounded text-xs">Active</span>}
          </h1>
          <p className="text-surface-500 text-sm font-bold uppercase tracking-widest">
            {format(new Date(), 'EEEE, MMMM do')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {view === 'sync' ? (
            <Button 
              onClick={handleSyncAll} 
              disabled={processing}
              className="bg-surface-900 text-white font-black uppercase tracking-widest px-8 py-6 rounded-2xl shadow-xl hover:bg-surface-800 transition-all active:scale-95"
            >
              {processing ? 'Syncing...' : 'Refresh Sources'}
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex bg-surface-200 p-1 rounded-xl border border-surface-300">
                <button 
                  onClick={() => setActiveTab('focus')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                    activeTab === 'focus' ? 'bg-white shadow-sm text-surface-900' : 'text-surface-500 hover:text-surface-900'
                  }`}
                >
                  <Activity className={`w-3.5 h-3.5 ${activeTab === 'focus' ? 'text-brand-500' : ''}`} />
                  Focus
                </button>
                <button 
                  onClick={() => setActiveTab('energy')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                    activeTab === 'energy' ? 'bg-white shadow-sm text-surface-900' : 'text-surface-500 hover:text-surface-900'
                  }`}
                >
                  <BatteryMedium className={`w-3.5 h-3.5 ${activeTab === 'energy' ? 'text-brand-500' : ''}`} />
                  Energy
                </button>
              </div>
              <Button 
                onClick={handleSavePlan}
                className="bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-black uppercase tracking-widest px-6 py-5 shadow-lg active:scale-95"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Plan
              </Button>
              <Button 
                variant="outline"
                onClick={() => setView('sync')}
                className="border-2 border-surface-900 rounded-xl text-xs font-black uppercase tracking-widest px-4 py-5"
              >
                Reset
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Content Area */}
        <div className={`${showOllie ? 'lg:col-span-8' : 'lg:col-span-12'} transition-all duration-500 space-y-8`}>
          <AnimatePresence mode="wait">
            {view === 'sync' ? (
              <motion.div 
                key="sync-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Sync Cards Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* ... same card logic ... */}
              <Card className="bg-white border-4 border-surface-900 rounded-[2rem] shadow-md overflow-hidden">
                <CardHeader className="bg-surface-50 border-b-2 border-surface-900">
                  <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand-500" />
                    Calendar Events
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 max-h-60 overflow-y-auto no-scrollbar">
                  {calendarEvents.length === 0 ? (
                    <div className="p-8 text-center text-[10px] uppercase font-bold text-surface-400">No events found</div>
                  ) : (
                    <ul className="divide-y divide-surface-100">
                      {calendarEvents.map((e) => (
                        <li key={e.id} className="p-4 text-xs font-bold text-surface-700">{e.summary}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white border-4 border-surface-900 rounded-[2rem] shadow-md overflow-hidden">
                <CardHeader className="bg-surface-50 border-b-2 border-surface-900">
                  <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-brand-500" />
                    Canvas Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 max-h-60 overflow-y-auto no-scrollbar">
                  {assignments.length === 0 ? (
                    <div className="p-8 text-center text-[10px] uppercase font-bold text-surface-400">No tasks synced</div>
                  ) : (
                    <ul className="divide-y divide-surface-100">
                      {assignments.map((a) => (
                        <li key={a.id} className="p-3 hover:bg-surface-50 transition-colors flex items-center justify-between group">
                          <span className="text-xs font-bold text-surface-700 truncate mr-2">{a.name}</span>
                          <button 
                            onClick={() => {
                              setSelectedAssignment(a);
                              setIsDetailOpen(true);
                            }}
                            className="text-[10px] font-black uppercase text-brand-600 bg-brand-50 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Details
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white border-4 border-surface-900 rounded-[2rem] shadow-md overflow-hidden">
                <CardHeader className="bg-surface-50 border-b-2 border-surface-900">
                  <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-4 h-4 text-brand-500" />
                    Project Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 max-h-60 overflow-y-auto no-scrollbar">
                  {manualTasks.length === 0 ? (
                    <div className="p-8 text-center text-[10px] uppercase font-bold text-surface-400">No project tasks</div>
                  ) : (
                    <ul className="divide-y divide-surface-100">
                      {manualTasks.map((t) => (
                        <li key={t.id} className="p-4 text-xs font-bold text-surface-700">{t.title}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* CTA Box */}
            <div className="bg-surface-900 p-8 md:p-12 border-4 border-surface-900 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Sparkles size={200} />
              </div>
              
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-sm">
                    <Sparkles className="text-brand-400 w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter">Ollie is ready.</h3>
                    <p className="text-surface-400 font-bold uppercase text-xs tracking-widest">Building a constraint-aware plan for your day.</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-8">
                  <div className="space-y-4">
                    <p className="text-sm font-bold uppercase tracking-widest text-surface-300">Set your energy level:</p>
                    <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Current Energy Level">
                      {(['low', 'medium', 'high'] as const).map((level) => (
                        <button
                          key={level}
                          role="radio"
                          aria-checked={energyLevel === level}
                          onClick={() => setEnergyLevel(level)}
                          className={`px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all border-2 ${
                            energyLevel === level ? 'bg-brand-500 text-white border-brand-500 shadow-lg' : 'text-surface-400 border-white/10 hover:border-white/30'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button 
                    onClick={handleGeneratePlan}
                    disabled={processing}
                    className="w-full bg-white text-surface-900 hover:bg-brand-50 text-xl font-black uppercase tracking-widest py-10 rounded-[2rem] shadow-2xl transition-all active:scale-[0.98]"
                  >
                    {processing ? (
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                        Generating Plan...
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-6 h-6" />
                        Create Daily Plan
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
            ) : (
              <motion.div 
                key="schedule-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                {/* Timeline Column */}
                <div className="space-y-8">
              
              {/* Timeline Card */}
              <div className="bg-white border-4 border-surface-900 rounded-[3rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.1)]">
                <div className="p-6 border-b-2 border-surface-100 bg-surface-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <OllieAvatar mood={processing ? 'thinking' : 'happy'} size="sm" />
                    <p className="text-sm font-bold text-surface-600">
                      {processing ? "Ollie is adjusting..." : "Drag to reorder. Ollie keeps everything synced."}
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowOllie(!showOllie)}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2 ${
                      showOllie ? 'bg-surface-900 text-white border-surface-900' : 'bg-white text-surface-900 border-surface-200 hover:border-surface-900'
                    }`}
                  >
                    <Sliders className="w-4 h-4" />
                    {showOllie ? 'Close Ollie' : 'Ask Ollie'}
                  </button>
                </div>

                <div className="p-4 md:p-8">
                  {schedule && (
                    <ScheduleTimeline 
                      initialBlocks={schedule} 
                      onUpdate={setSchedule}
                      onFeedback={handleScheduleFeedback}
                      onDeconstruct={async (id) => {
                        setShowOllie(true);
                        await handleCommand(`Break down the task with ID ${id} into small steps.`);
                      }}
                    />
                  )}
                </div>
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
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    {/* Global Ollie Sidebar */}
    <AnimatePresence>
      {showOllie && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="lg:col-span-4 sticky top-8 z-10"
        >
          <OllieChatSidebar 
            onCommand={handleOllieChat}
            isProcessing={processing}
            assignmentId={ollieContextId}
            initialMessage={ollieInitialMsg}
          />
        </motion.div>
      )}
    </AnimatePresence>
  </div>

  <AssignmentDetailOverlay 
    assignment={selectedAssignment}
    isOpen={isDetailOpen}
    onClose={() => setIsDetailOpen(false)}
    onAskOllie={handleAskOllie}
    onSchedule={handleScheduleAssignment}
  />
</div>
);
}

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
