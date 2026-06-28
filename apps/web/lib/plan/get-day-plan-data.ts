import { createClient } from '@/lib/supabase/server';
import { getConnectedProProvidersFromDb } from '@/lib/integrations/summary';
import {
  buildDayPlanSnapshot,
  computeOverflowTasks,
  type DayPlanBlock,
  type DayPlanSnapshot,
} from '@/lib/plan/day-plan';
import {
  filterAndMapSourceItems,
  mapCalendarEventRow,
  mapCanvasAssignmentRow,
  type DayPlanSourcesData,
} from '@/lib/plan/source-items';
import type { Tables } from '@/types/database';

export interface DayPlanPageData {
  userName: string;
  brunoMessage: string;
  snapshot: DayPlanSnapshot;
  overflowCount: number;
  isBuilding: boolean;
  hasPlan: boolean;
  sources: DayPlanSourcesData;
}

export type { DayPlanSourcesData } from '@/lib/plan/source-items';

export async function getDayPlanPageData(): Promise<DayPlanPageData | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date();
  dayEnd.setHours(23, 59, 59, 999);

  const fourteenDaysOut = new Date();
  fourteenDaysOut.setDate(fourteenDaysOut.getDate() + 14);

  const sevenDaysOut = new Date();
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);

  const [
    profileResult,
    eventsResult,
    tasksResult,
    scheduledResult,
    accountsResult,
    composioConnected,
    canvasSourceItemsResult,
    canvasAssignmentsResult,
    calendarSourceResult,
    workSourceItemsResult,
  ] = await Promise.all([
    supabase
      .from('users')
      .select('name, google_calendar_connected')
      .eq('id', user.id)
      .single(),
    supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .neq('status', 'rejected')
      .gte('start_time', dayStart.toISOString())
      .lte('start_time', dayEnd.toISOString())
      .order('start_time', { ascending: true }),
    supabase
      .from('tasks')
      .select('id')
      .eq('user_id', user.id)
      .eq('completed', false)
      .is('deleted_at', null),
    supabase
      .from('calendar_events')
      .select('linked_task_id')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .neq('status', 'rejected')
      .gte('start_time', dayStart.toISOString())
      .lte('start_time', dayEnd.toISOString())
      .not('linked_task_id', 'is', null),
    supabase
      .from('integration_accounts_public' as 'integration_accounts')
      .select('provider, status')
      .eq('user_id', user.id),
    getConnectedProProvidersFromDb(user.id, supabase),
    supabase
      .from('source_items')
      .select(
        'id, provider, title, description, due_date, url, raw_data, status, completed, priority, item_type'
      )
      .eq('user_id', user.id)
      .eq('provider', 'canvas')
      .is('deleted_at', null)
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('canvas_assignments')
      .select('id, name, course_name, due_at, html_url, description')
      .eq('user_id', user.id)
      .gte('due_at', new Date().toISOString())
      .lte('due_at', fourteenDaysOut.toISOString())
      .order('due_at', { ascending: true }),
    supabase
      .from('calendar_events')
      .select('id, title, description, start_time, end_time, location, metadata')
      .eq('user_id', user.id)
      .eq('source', 'google_calendar')
      .eq('is_deleted', false)
      .gte('start_time', dayStart.toISOString())
      .lte('start_time', sevenDaysOut.toISOString())
      .order('start_time', { ascending: true }),
    supabase
      .from('source_items')
      .select(
        'id, provider, title, description, due_date, url, raw_data, status, completed, priority, item_type'
      )
      .eq('user_id', user.id)
      .in('provider', ['notion', 'slack', 'linear'])
      .is('deleted_at', null)
      .order('due_date', { ascending: true, nullsFirst: false }),
  ]);

  const rows = (eventsResult.data ?? []) as Tables<'calendar_events'>[];
  const snapshot = buildDayPlanSnapshot(rows);
  const allTaskIds = (tasksResult.data ?? []).map((t) => t.id);
  const scheduledTaskIds = (scheduledResult.data ?? [])
    .map((e) => e.linked_task_id)
    .filter((id): id is string => Boolean(id));

  const overflowCount = computeOverflowTasks(allTaskIds, scheduledTaskIds);
  const hasPlan = snapshot.blocks.some((b) => b.isAiSuggested);
  const isBuilding = !hasPlan && allTaskIds.length > 0;

  const brunoMessage = buildBrunoMessage(snapshot.blocks, overflowCount, isBuilding);

  const accounts = accountsResult.data ?? [];
  const isAccountConnected = (provider: string) =>
    accounts.some((a) => a.provider === provider && a.status === 'connected');
  const composioSet = new Set(composioConnected);

  const isProProviderConnected = (provider: 'notion' | 'slack' | 'linear') =>
    composioSet.has(provider) || isAccountConnected(provider);

  const canvasSourceRows = (canvasSourceItemsResult.data ??
    []) as unknown as Parameters<typeof filterAndMapSourceItems>[0];
  let canvasItems = filterAndMapSourceItems(canvasSourceRows, 'canvas');
  if (canvasItems.length === 0 && canvasAssignmentsResult.data?.length) {
    canvasItems = canvasAssignmentsResult.data.map(mapCanvasAssignmentRow);
  }

  const workSourceRows = (workSourceItemsResult.data ??
    []) as unknown as Parameters<typeof filterAndMapSourceItems>[0];

  const sources: DayPlanSourcesData = {
    connections: {
      canvas: isAccountConnected('canvas'),
      google:
        isAccountConnected('google_calendar') ||
        profileResult.data?.google_calendar_connected === true,
      notion: isProProviderConnected('notion'),
      slack: isProProviderConnected('slack'),
      linear: isProProviderConnected('linear'),
    },
    canvas: canvasItems,
    calendar: (calendarSourceResult.data ?? []).map(mapCalendarEventRow),
    notion: filterAndMapSourceItems(workSourceRows, 'notion'),
    slack: filterAndMapSourceItems(workSourceRows, 'slack'),
    linear: filterAndMapSourceItems(workSourceRows, 'linear'),
  };

  return {
    userName: profileResult.data?.name?.split(' ')[0] ?? 'there',
    brunoMessage,
    snapshot,
    overflowCount,
    isBuilding,
    hasPlan,
    sources,
  };
}

function buildBrunoMessage(
  blocks: DayPlanBlock[],
  overflowCount: number,
  isBuilding: boolean
): string {
  if (isBuilding) {
    return 'Bruno is building your plan from your calendar and tasks. Check back in a moment.';
  }

  const focusBlocks = blocks.filter((b) => b.isAiSuggested && b.type === 'focus');
  if (focusBlocks.length === 0) {
    return overflowCount > 0
      ? `Nothing fit in today's open slots. ${overflowCount} item${overflowCount === 1 ? '' : 's'} still need attention.`
      : 'Your calendar is clear today. Add a task or enjoy the breathing room.';
  }

  const first = focusBlocks[0];
  const reason = first.reason ? ` ${first.reason}` : '';
  const overflowNote =
    overflowCount > 0
      ? ` ${overflowCount} more item${overflowCount === 1 ? '' : 's'} didn't fit today.`
      : '';

  return `First up: ${first.title}.${reason}${overflowNote}`;
}
