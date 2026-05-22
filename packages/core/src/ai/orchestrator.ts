import { createClient } from '@/lib/supabase/server';
import { getUserAIMemory, buildMemoryContext, UserAiMemory } from './memory';
import { getCalendarEvents, CalendarEvent } from '@/lib/calendar';
import type { Database, Tables } from '@/types/database';

export interface BrunoWorldState {
  user: Tables<'users'>;
  memory: UserAiMemory;
  memoryContext: string;
  tasks: (Tables<'tasks'> | { id: string, title: string, estimated_minutes: number, priority: string, external_url?: string })[];
  calendarEvents: CalendarEvent[];
  preferences: Tables<'users'>['scheduling_preferences'];
}

/**
 * The Master Context Builder for Planevo.
 * Assembles a complete "World State" for a user to ensure AI coherence.
 */
export async function getBrunoMasterContext(
  userId: string, 
  energyLevel: 'low' | 'medium' | 'high' = 'medium'
): Promise<BrunoWorldState> {
  const supabase = await createClient();

  // 1. Fetch User Data & Preferences
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new Error(`User not found: ${userId}`);
  }

  // 2. Fetch AI Memory
  const memory = await getUserAIMemory(supabase, userId);
  const memoryContext = buildMemoryContext(memory);

  // 3. Fetch Incomplete Tasks with Energy Filtering
  let taskQuery = supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('completed', false)
    .is('deleted_at', null);
  
  // If energy is low, hide high energy tasks to reduce cognitive load
  if (energyLevel === 'low') {
    taskQuery = taskQuery.neq('energy_level_required', 'high');
  }

  const { data: tasks } = await taskQuery.order('priority', { ascending: false });

  // 4. Fetch Canvas Assignments (as tasks)
  const { data: canvasAssignments } = await supabase
    .from('canvas_assignments')
    .select('*')
    .eq('user_id', userId)
    .gte('due_at', new Date(new Date().setHours(0,0,0,0)).toISOString())
    .lte('due_at', new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('due_at', { ascending: true });

  const mappedCanvasTasks = (canvasAssignments || []).map(a => ({
    id: a.id,
    title: a.name,
    estimated_minutes: 60, // Default for assignments
    priority: 'high', // Syncing is usually high priority for students
    external_url: a.html_url || undefined,
    energy_level_required: 'medium' as const
  }));

  const allTasks = [
    ...(tasks || []),
    ...mappedCanvasTasks
  ];

  // 5. Fetch Google Calendar Events
  const { events: googleEvents } = await getCalendarEvents();

  // 5. Fetch Manual Calendar Events (from Supabase)
  const { data: manualEvents } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .is('is_deleted', false)
    .gte('start_time', new Date().toISOString());

  // Merge events into a single list
  const allEvents: CalendarEvent[] = [
    ...googleEvents,
    ...(manualEvents || []).map(e => ({
      id: e.id,
      summary: e.title,
      start: { dateTime: e.start_time },
      end: { dateTime: e.end_time || undefined },
      source: e.source || 'manual'
    }))
  ];

  return {
    user,
    memory,
    memoryContext,
    tasks: allTasks,
    calendarEvents: allEvents,
    preferences: user.scheduling_preferences
  };
}
