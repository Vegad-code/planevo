'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchCanvasUpcomingAction, fetchCanvasTodoAction } from '@/lib/canvas/actions';
import { CanvasAssignment } from '@/lib/canvas/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, GraduationCap, Clock, CheckCircle, Warning, FlyingSaucer, RocketLaunch } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { generateAgenticSchedule, SchedulingPreferences } from '@/lib/ai/agentic-scheduler';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

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

export default function BriefingPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const focusId = searchParams.get('assignmentId');
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [assignments, setAssignments] = useState<CanvasAssignment[]>([]);
  const [milestones, setMilestones] = useState<CanvasAssignment[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [generatedSchedule, setGeneratedSchedule] = useState<any[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [energyLevel, setEnergyLevel] = useState<string>('medium');
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch profile
        const { data: profileData } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(profileData);

        // Fetch existing assignments from DB
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
            description: ''
          })));
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const handleFetchAll = async () => {
    setFetching(true);
    try {
      if (profile?.canvas_url && profile?.canvas_token) {
        let upcoming = await fetchCanvasUpcomingAction(profile.canvas_url, profile.canvas_token);
        if (upcoming.length === 0) {
          upcoming = await fetchCanvasTodoAction(profile.canvas_url, profile.canvas_token);
        }
        const sorted = upcoming.sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
        const actualAssignments = sorted.filter(item => item.type !== 'milestone');
        const schoolMilestones = sorted.filter(item => item.type === 'milestone');
        setAssignments(actualAssignments);
        setMilestones(schoolMilestones);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user && actualAssignments.length > 0) {
          const toUpsert = actualAssignments.map(a => ({
            id: String(a.id),
            user_id: user.id,
            name: a.name,
            due_at: a.due_at,
            html_url: a.html_url,
            synced_at: new Date().toISOString()
          }));
          await supabase.from('canvas_assignments').upsert(toUpsert);
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
          const filtered = (data.items || []).filter((event: any) => {
            const summary = event.summary?.toLowerCase() || '';
            return !summary.includes('birthday');
          });
          setEvents(filtered);
        }
      }
    } catch (error: any) {
      console.error('Fetch error:', error);
      setErrorMsg('Failed to sync. Check settings.');
    } finally {
      setFetching(false);
    }
  };

  const handleFinalize = async () => {
    setFetching(true);
    try {
      // 1. Prepare Scheduler Input
      const preferences = profile?.scheduling_preferences || DEFAULT_PREFERENCES;
      
      const rawSchedule = generateAgenticSchedule({
        tasks: assignments.map(a => ({
          id: a.id,
          title: a.name,
          due_at: a.due_at,
          priority: 'medium', // Default
          estimated_minutes: 60 // Default
        })),
        calendarEvents: events,
        preferences,
        date: new Date()
      });

      // 2. Refine with LLM (v2 logic)
      let finalSchedule = rawSchedule;
      try {
        const refineRes = await fetch('/api/ai/schedule-refine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schedule: rawSchedule, energyLevel }),
        });
        if (refineRes.ok) {
          const refined = await refineRes.json();
          if (refined.refined) finalSchedule = refined.refined;
        }
      } catch (err) {
        console.error('Refine failed, using raw:', err);
      }

      // 3. Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('schedules')
          .insert({
            user_id: user.id,
            date: format(new Date(), 'yyyy-MM-dd'),
            schedule_json: finalSchedule
          });

        if (!error) {
          setGeneratedSchedule(finalSchedule);
          setTimeout(() => router.push('/dashboard/schedule'), 1000);
        }
      }
    } catch (error: any) {
      console.error('Error finalizing schedule:', error);
      setErrorMsg('Ollie encountered turbulence. Try again.');
    } finally {
      setFetching(false);
    }
  };

  const getPriority = (dueDate: string) => {
    const hours = (new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60);
    if (hours < 24) return { label: 'Urgent', color: 'bg-red-500 text-white' };
    if (hours < 48) return { label: 'High', color: 'bg-amber-500 text-surface-900' };
    return { label: 'Normal', color: 'bg-surface-200 text-surface-700' };
  };

  if (loading) return <div className="animate-pulse space-y-4 pt-8">
    <div className="h-12 bg-surface-200 border-2 border-surface-900 w-1/3" />
    <div className="h-64 bg-surface-100 border-2 border-surface-900" />
  </div>;

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-3">
            <RocketLaunch weight="fill" className="text-accent-600" />
            The Blueprint
          </h1>
          <p className="text-surface-600 font-bold uppercase text-sm mt-1">
            {format(new Date(), 'EEEE, MMMM do')} — Preparing your day.
          </p>
        </div>
        <Button 
          onClick={handleFetchAll} 
          disabled={fetching}
          className="bg-surface-900 text-surface-100 font-black uppercase tracking-widest px-8 shadow-[4px_4px_0px_0px_var(--accent-600)]"
        >
          {fetching ? 'Syncing...' : 'Sync All Sources'}
        </Button>
      </header>

      {/* Main Sync Cards (Events, Milestones, Canvas) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-surface-100 border-2 border-surface-900 shadow-md">
          <CardHeader className="border-b-2 border-surface-900 bg-surface-200/50">
            <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
              <Calendar weight="bold" className="text-accent-600" />
              Calendar
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-60 overflow-y-auto">
            {events.length === 0 ? <div className="p-8 text-center text-[10px] uppercase font-bold text-surface-400">Empty</div> : (
              <ul className="divide-y-2 divide-surface-900">
                {events.map((e) => (
                  <li key={e.id} className="p-3 text-xs font-bold uppercase">{e.summary}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-surface-100 border-2 border-surface-900 shadow-md">
          <CardHeader className="border-b-2 border-surface-900 bg-surface-200/50">
            <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
              <CheckCircle weight="bold" className="text-accent-600" />
              School
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-60 overflow-y-auto">
            {milestones.length === 0 ? <div className="p-8 text-center text-[10px] uppercase font-bold text-surface-400">Empty</div> : (
              <ul className="divide-y-2 divide-surface-900">
                {milestones.map((m) => (
                  <li key={m.id} className="p-3 text-xs font-bold uppercase">{m.name}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="bg-surface-100 border-2 border-surface-900 shadow-md">
          <CardHeader className="border-b-2 border-surface-900 bg-surface-200/50">
            <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
              <GraduationCap weight="bold" className="text-accent-600" />
              Canvas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-60 overflow-y-auto">
            {assignments.length === 0 ? <div className="p-8 text-center text-[10px] uppercase font-bold text-surface-400">Empty</div> : (
              <ul className="divide-y-2 divide-surface-900">
                {assignments.map((a) => (
                  <li key={a.id} className="p-3 text-xs font-bold uppercase">{a.name}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="bg-surface-900 p-8 border-4 border-surface-900 shadow-[8px_8px_0px_0px_var(--accent-500)] text-surface-100">
        <div className="flex flex-col gap-6">
          <h3 className="text-2xl font-black uppercase tracking-tighter">Ollie is ready to pilot.</h3>
          <p className="text-surface-400 font-bold uppercase text-[10px]">
            Building a constraint-aware schedule for your day.
          </p>
          
          <div className="flex flex-wrap gap-2">
            {(['low', 'medium', 'high'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setEnergyLevel(level)}
                className={`px-4 py-2 text-xs font-black uppercase border-2 transition-all ${
                  energyLevel === level ? 'bg-accent-500 text-surface-900 border-accent-500' : 'text-surface-500 border-surface-700'
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          <Button 
            onClick={handleFinalize}
            disabled={fetching}
            className="bg-accent-500 hover:bg-accent-400 text-surface-900 font-black uppercase py-8 text-xl tracking-widest shadow-[4px_4px_0px_0px_white]"
          >
            {fetching ? 'Building Flight Plan...' : 'Finalize Flight Plan'}
          </Button>
        </div>
      </div>
    </div>
  );
}
