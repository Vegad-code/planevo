'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchCanvasUpcomingAction, fetchCanvasTodoAction } from '@/lib/canvas/actions';
import { CanvasAssignment } from '@/lib/canvas/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, GraduationCap, Clock, CheckCircle, Warning, FlyingSaucer, RocketLaunch } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { generateDeadlineFirstSchedule, ScheduleBlock } from '@/lib/ai/scheduler';
import { useRouter } from 'next/navigation';

export default function BriefingPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [assignments, setAssignments] = useState<CanvasAssignment[]>([]);
  const [milestones, setMilestones] = useState<CanvasAssignment[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [generatedSchedule, setGeneratedSchedule] = useState<ScheduleBlock[] | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const handleFetchAll = async () => {
    setFetching(true);
    try {
      // 1. Fetch Canvas if connected
      if (profile?.canvas_url && profile?.canvas_token) {
        let upcoming = await fetchCanvasUpcomingAction(profile.canvas_url, profile.canvas_token);
        
        // Fallback to todo items if upcoming is empty
        if (upcoming.length === 0) {
          upcoming = await fetchCanvasTodoAction(profile.canvas_url, profile.canvas_token);
        }

        // Sort by due date
        const sorted = upcoming.sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
        
        // Split into assignments and milestones
        const actualAssignments = sorted.filter(item => item.type !== 'milestone');
        const schoolMilestones = sorted.filter(item => item.type === 'milestone');
        
        setAssignments(actualAssignments);
        setMilestones(schoolMilestones);
      }

      // 2. Fetch Google Calendar
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.provider_token) {
        const now = new Date().toISOString();
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&singleEvents=true&orderBy=startTime&maxResults=10`,
          { headers: { Authorization: `Bearer ${session.provider_token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          // Filter out birthdays and clutter
          const filtered = (data.items || []).filter((event: any) => {
            const summary = event.summary?.toLowerCase() || '';
            return !summary.includes('birthday');
          });
          setEvents(filtered);
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleFinalize = async () => {
    setFetching(true);
    try {
      const schedule = generateDeadlineFirstSchedule({
        assignments,
        milestones,
        calendarEvents: events,
        preferredStartTime: profile?.preferred_morning_time?.substring(0, 5) || '07:00'
      });

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('schedules')
          .insert({
            user_id: user.id,
            date: format(new Date(), 'yyyy-MM-dd'),
            schedule_json: schedule
          });

        if (!error) {
          setGeneratedSchedule(schedule);
          // Redirect after a short delay to show success
          setTimeout(() => router.push('/dashboard/schedule'), 1500);
        }
      }
    } catch (error) {
      console.error('Error finalizing schedule:', error);
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
            <FlyingSaucer weight="fill" className="text-accent-600 animate-bounce" />
            Morning Briefing
          </h1>
          <p className="text-surface-600 font-bold uppercase text-sm mt-1">
            {format(new Date(), 'EEEE, MMMM do')} — Prep your daily flight plan.
          </p>
        </div>
        <Button 
          onClick={handleFetchAll} 
          disabled={fetching}
          className="bg-surface-900 text-surface-100 font-black uppercase tracking-widest px-8 shadow-[4px_4px_0px_0px_var(--accent-600)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
        >
          {fetching ? 'Syncing...' : 'Sync All Sources'}
        </Button>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Calendar Events */}
        <Card className="bg-surface-100 border-2 border-surface-900 shadow-md">
          <CardHeader className="border-b-2 border-surface-900 bg-surface-200/50">
            <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
              <Calendar weight="bold" className="text-accent-600" />
              Calendar Events
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {events.length === 0 ? (
              <div className="p-8 text-center text-surface-400 font-bold uppercase text-xs">
                No upcoming events synced.
              </div>
            ) : (
              <ul className="divide-y-2 divide-surface-900">
                {events.map((event) => (
                  <li key={event.id} className="p-4 flex items-start gap-3 hover:bg-surface-200 transition-colors">
                    <Clock weight="bold" className="size-4 mt-0.5 text-surface-500" />
                    <div>
                      <p className="text-sm font-black uppercase leading-none">{event.summary}</p>
                      <p className="text-[10px] font-bold text-surface-500 mt-1">
                        {event.start?.dateTime ? format(new Date(event.start.dateTime), 'h:mm a') : 'All Day'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* School Milestones */}
        <Card className="bg-surface-100 border-2 border-surface-900 shadow-md">
          <CardHeader className="border-b-2 border-surface-900 bg-surface-200/50">
            <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
              <CheckCircle weight="bold" className="text-accent-600" />
              School Calendar
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {milestones.length === 0 ? (
              <div className="p-8 text-center text-surface-400 font-bold uppercase text-xs">
                No school milestones found.
              </div>
            ) : (
              <ul className="divide-y-2 divide-surface-900">
                {milestones.map((milestone) => (
                  <li key={milestone.id} className="p-4 flex items-start gap-3 hover:bg-surface-200 transition-colors">
                    <Warning weight="fill" className="size-4 mt-0.5 text-accent-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black uppercase leading-tight truncate">{milestone.name}</p>
                      <p className="text-[10px] font-bold text-surface-500 mt-1">
                        {format(new Date(milestone.due_at), 'MMM do, yyyy')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Canvas Assignments */}
        <Card className="bg-surface-100 border-2 border-surface-900 shadow-md">
          <CardHeader className="border-b-2 border-surface-900 bg-surface-200/50">
            <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
              <GraduationCap weight="bold" className="text-accent-600" />
              Canvas Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!profile?.canvas_token ? (
              <div className="p-8 text-center">
                <p className="text-xs font-black uppercase text-surface-400 mb-4">Canvas not connected.</p>
                <Button variant="outline" className="text-[10px] font-black uppercase" asChild>
                  <a href="/dashboard/settings">Connect in Settings</a>
                </Button>
              </div>
            ) : assignments.length === 0 ? (
              <div className="p-8 text-center text-surface-400 font-bold uppercase text-xs">
                No upcoming assignments found.
              </div>
            ) : (
              <ul className="divide-y-2 divide-surface-900">
                {assignments.map((task) => {
                  const priority = getPriority(task.due_at);
                  return (
                    <li key={task.id} className="p-4 flex items-start gap-3 hover:bg-surface-200 transition-colors group">
                      <GraduationCap weight="bold" className="size-4 mt-0.5 text-accent-600" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-black uppercase leading-tight truncate">{task.name}</p>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${priority.color}`}>
                            {priority.label}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-surface-500">
                          Due {format(new Date(task.due_at), 'MMM do @ h:mm a')}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* The AI Action Area */}
      <div className="bg-surface-900 p-8 border-4 border-surface-900 shadow-[8px_8px_0px_0px_var(--accent-500)] text-surface-100 transition-all">
        {generatedSchedule ? (
          <div className="text-center space-y-4 py-4">
            <RocketLaunch weight="fill" className="size-16 text-accent-500 mx-auto animate-pulse" />
            <h3 className="text-3xl font-black uppercase tracking-tighter">Flight Plan Locked!</h3>
            <p className="text-surface-400 font-bold uppercase text-xs">Redirecting you to your curated daily schedule...</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Ollie is ready to pilot.</h3>
              <p className="text-surface-400 font-bold uppercase text-xs">
                Based on your {events.length} events, {milestones.length} milestones, and {assignments.length} assignments, Ollie will build your curated schedule.
              </p>
            </div>
            <Button 
              onClick={handleFinalize}
              disabled={fetching || (events.length === 0 && assignments.length === 0)}
              className="bg-accent-500 hover:bg-accent-400 text-surface-900 font-black uppercase px-12 py-6 text-lg tracking-widest shadow-[4px_4px_0px_0px_var(--shadow-color-inverse)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
            >
              Finalize Flight Plan
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
