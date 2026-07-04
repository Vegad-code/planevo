import { format, formatDistanceToNow } from 'date-fns';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { Task } from '@/types/tasks';
import { getBrunoMasterContext } from '@/lib/ai/orchestrator';
import {
  getLocalDateKey,
  normalizeNotificationPreferences,
  parseNotificationPreferencesRow,
} from '@/lib/notifications/preferences';
import { getPriorityAlerts } from '@/lib/dashboard/dashboard-mode';
import type { DashboardConnections } from '@/lib/dashboard/types';

export type NotificationKind = 'bruno_insight' | 'task' | 'event' | 'assignment' | 'system';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  subtitle: string | null;
  href: string | null;
  sourceId: string;
  priority: 'high' | 'normal';
  readAt: string | null;
  createdAt: string;
  relativeTime: string;
}

export interface NotificationGroup {
  label: string;
  notifications: AppNotification[];
}

type UserNotificationRow = Database['public']['Tables']['user_notifications']['Row'];
type UpsertPayload = Database['public']['Tables']['user_notifications']['Insert'];

type DueUrgency = 'overdue' | 'today' | 'soon' | 'later';

function isCanvasLinkedTask(task: { external_url?: string | null }): boolean {
  const url = task.external_url?.toLowerCase() ?? '';
  return url.includes('instructure.com') || url.includes('canvas.');
}

const NOW_TITLES = new Set([
  'Happening now',
  'Starting soon',
  'Overdue task',
  'Due today',
  'Assignment overdue',
  'Canvas due today',
]);

function rowToAppNotification(row: UserNotificationRow): AppNotification {
  return {
    id: row.id,
    kind: row.kind as NotificationKind,
    title: row.title,
    body: row.body,
    subtitle: row.subtitle,
    href: row.href,
    sourceId: row.source_id,
    priority: row.priority as AppNotification['priority'],
    readAt: row.read_at,
    createdAt: row.created_at,
    relativeTime: formatDistanceToNow(new Date(row.created_at), { addSuffix: true }),
  };
}

function classifyDueDate(due: Date, now: Date, todayStart: Date, todayEnd: Date): DueUrgency {
  if (due < now) return 'overdue';
  if (due >= todayStart && due <= todayEnd) return 'today';
  const threeDaysOut = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  if (due <= threeDaysOut) return 'soon';
  return 'later';
}

function formatDueLabel(due: Date): string {
  return format(due, 'EEE MMM d · h:mm a');
}

function groupNotifications(notifications: AppNotification[]): NotificationGroup[] {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const nowGroup: AppNotification[] = [];
  const todayGroup: AppNotification[] = [];
  const earlierGroup: AppNotification[] = [];

  for (const n of notifications) {
    const isNowRelevant = n.priority === 'high' || NOW_TITLES.has(n.title);
    const createdToday = new Date(n.createdAt).getTime() >= todayStart.getTime();

    if (isNowRelevant) {
      nowGroup.push(n);
    } else if (createdToday) {
      todayGroup.push(n);
    } else {
      earlierGroup.push(n);
    }
  }

  const groups: NotificationGroup[] = [];
  if (nowGroup.length > 0) groups.push({ label: 'Now', notifications: nowGroup });
  if (todayGroup.length > 0) groups.push({ label: 'Today', notifications: todayGroup });
  if (earlierGroup.length > 0) groups.push({ label: 'Earlier', notifications: earlierGroup });
  return groups;
}

async function upsertNotification(
  supabase: SupabaseClient<Database>,
  payload: UpsertPayload,
): Promise<boolean> {
  const { error } = await supabase.from('user_notifications').upsert(
    {
      ...payload,
      dismissed_at: null,
    },
    { onConflict: 'user_id,source_id' },
  );
  if (error) {
    console.error('[notifications] upsert failed:', payload.source_id, error.message);
    return false;
  }
  return true;
}

async function dismissBySourceIds(
  supabase: SupabaseClient<Database>,
  userId: string,
  sourceIds: string[],
): Promise<void> {
  if (sourceIds.length === 0) return;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('user_notifications')
    .update({ dismissed_at: now })
    .eq('user_id', userId)
    .in('source_id', sourceIds)
    .is('dismissed_at', null);
  if (error) {
    console.error('[notifications] dismiss failed:', error.message);
  }
}

async function generateBrunoInsight(userId: string): Promise<string> {
  try {
    const worldState = await getBrunoMasterContext(userId);
    const openTasks = worldState.tasks.slice(0, 8).map((t) => {
      const row = t as Task & { is_assignment?: boolean; due_at?: string };
      const due = row.due_at || row.due_date;
      const dueLabel = due ? format(new Date(due), 'MMM d h:mm a') : 'no date';
      const prefix = row.is_assignment || row.source === 'canvas' ? '[Canvas]' : '';
      return `${prefix} ${row.title} (due ${dueLabel})`.trim();
    });

    const upcomingEvents = worldState.calendarEvents.slice(0, 5).map((e) => {
      const cal = e as { summary?: string; title?: string; start?: { dateTime?: string }; start_time?: string };
      const start = cal.start?.dateTime || cal.start_time;
      const label = cal.summary || cal.title || 'Event';
      return start ? `${label} @ ${format(new Date(start), 'MMM d h:mm a')}` : label;
    });

    const prompt = `You are Bruno, a friendly planning assistant (a bear).
The user opened their notification center.
Generate ONE short, specific insight based on their real workload. Mention a concrete task or Canvas assignment by name when possible.
Do not greet them. Do not say they are "all caught up" if they have tasks, assignments, or events below.
Do not use emojis except maybe a bear 🐻. Keep it under 25 words.

Open tasks & Canvas assignments: ${JSON.stringify(openTasks)}
Upcoming calendar blocks: ${JSON.stringify(upcomingEvents)}
`;

    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) {
      if (openTasks.length > 0) {
        return `You have ${openTasks.length} item${openTasks.length === 1 ? '' : 's'} on your plate — start with "${worldState.tasks[0]?.title}".`;
      }
      return "You've got some open tasks. Let's get to work! 🐻";
    }

    const aiApiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4-nano',
        messages: [{ role: 'system', content: prompt }],
        max_tokens: 60,
      }),
    });

    if (!aiApiResponse.ok) {
      if (openTasks.length > 0) {
        return `Focus on "${worldState.tasks[0]?.title}" next — Bruno has your deadlines mapped.`;
      }
      return 'Ready to get things done today? 🐻';
    }

    const rawData = (await aiApiResponse.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return rawData.choices[0]?.message?.content?.trim() || 'Ready to get things done today? 🐻';
  } catch {
    return 'Ready to get things done today? 🐻';
  }
}

export async function syncUserNotifications(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const threeDaysOut = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const canvasLookback = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: profile },
    { data: notificationPrefsRow },
    { data: integrationAccounts },
    { data: tasks },
    { data: events },
    { data: assignments },
    { data: activeRows, error: activeError },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('name, google_calendar_last_synced_at, scheduling_preferences')
      .eq('id', userId)
      .single(),
    supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('integration_accounts_public' as 'integration_accounts')
      .select('provider, status, last_synced_at')
      .eq('user_id', userId),
    supabase
      .from('tasks')
      .select('id, title, due_date, completed, external_url')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .eq('completed', false)
      .not('due_date', 'is', null)
      .lte('due_date', sevenDaysOut)
      .order('due_date', { ascending: true }),
    supabase
      .from('calendar_events')
      .select('id, title, start_time, end_time, is_completed')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .neq('status', 'rejected')
      .eq('is_completed', false)
      .gte('start_time', todayStart.toISOString())
      .lte('start_time', sevenDaysOut)
      .order('start_time', { ascending: true })
      .limit(15),
    supabase
      .from('canvas_assignments')
      .select('id, name, course_name, due_at, html_url')
      .eq('user_id', userId)
      .not('due_at', 'is', null)
      .gte('due_at', canvasLookback)
      .lte('due_at', sevenDaysOut)
      .order('due_at', { ascending: true })
      .limit(15),
    supabase
      .from('user_notifications')
      .select('source_id')
      .eq('user_id', userId)
      .is('dismissed_at', null),
  ]);

  if (activeError?.message?.includes('does not exist')) {
    return { ok: false, error: 'user_notifications table not found — apply migration_v28' };
  }

  const timezone = normalizeNotificationPreferences(
    parseNotificationPreferencesRow(notificationPrefsRow),
  ).quiet_hours.timezone;
  const todayKey = getLocalDateKey(now, timezone);

  const { data: existingBruno } = await supabase
    .from('user_notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('source_id', `bruno-insight-${todayKey}`)
    .maybeSingle();
  const activeSourceIds = new Set((activeRows ?? []).map((r) => r.source_id));
  const expectedSourceIds = new Set<string>();
  let upsertFailed = false;

  if (!existingBruno) {
    const insight = await generateBrunoInsight(userId);
    const sourceId = `bruno-insight-${todayKey}`;
    expectedSourceIds.add(sourceId);
    const ok = await upsertNotification(supabase, {
      user_id: userId,
      kind: 'bruno_insight',
      title: 'Bruno noticed',
      body: insight,
      subtitle: 'Bruno',
      href: '/dashboard/daily-plan',
      source_id: sourceId,
      priority: 'normal',
    });
    if (!ok) upsertFailed = true;
  } else {
    expectedSourceIds.add(`bruno-insight-${todayKey}`);
  }

  let overdueCount = 0;
  let soonCount = 0;
  const seenTaskIds = new Set<string>();

  const allTasks = tasks ?? [];
  for (const task of allTasks) {
    if (!task.due_date || seenTaskIds.has(task.id)) continue;
    seenTaskIds.add(task.id);

    const due = new Date(task.due_date);
    const urgency = classifyDueDate(due, now, todayStart, todayEnd);
    if (urgency === 'later') continue;

    const isCanvas = isCanvasLinkedTask(task);
    let sourceId: string;
    let priority: 'high' | 'normal' = 'normal';
    let title: string;
    let subtitle: string;

    if (urgency === 'overdue') {
      if (overdueCount >= 5) continue;
      overdueCount += 1;
      sourceId = `task-overdue-${task.id}`;
      priority = 'high';
      title = isCanvas ? 'Assignment overdue' : 'Overdue task';
      subtitle = isCanvas ? 'Canvas' : 'Task';
    } else if (urgency === 'today') {
      sourceId = `task-due-${task.id}`;
      priority = 'high';
      title = isCanvas ? 'Canvas due today' : 'Due today';
      subtitle = isCanvas ? 'Canvas' : 'Task';
    } else {
      if (soonCount >= 5) continue;
      soonCount += 1;
      sourceId = `task-soon-${task.id}`;
      title = isCanvas ? 'Canvas assignment due soon' : 'Due soon';
      subtitle = isCanvas ? 'Canvas' : 'Task';
    }

    expectedSourceIds.add(sourceId);
    const ok = await upsertNotification(supabase, {
      user_id: userId,
      kind: isCanvas ? 'assignment' : 'task',
      title,
      body: `${task.title} · Due ${formatDueLabel(due)}`,
      subtitle,
      href:
        isCanvas && task.external_url
          ? task.external_url
          : '/dashboard/tasks',
      source_id: sourceId,
      priority,
    });
    if (!ok) upsertFailed = true;
  }

  for (const event of events ?? []) {
    const sourceId = `event-${event.id}`;
    const start = new Date(event.start_time);
    const end = event.end_time
      ? new Date(event.end_time)
      : new Date(start.getTime() + 30 * 60 * 1000);
    const isNow = now >= start && now < end;
    const withinHour = !isNow && start.getTime() - now.getTime() <= 60 * 60 * 1000;
    const isToday = start >= todayStart && start <= todayEnd;

    let title = 'Upcoming event';
    let priority: 'high' | 'normal' = 'normal';
    if (isNow) {
      title = 'Happening now';
      priority = 'high';
    } else if (withinHour) {
      title = 'Starting soon';
      priority = 'high';
    } else if (isToday) {
      title = 'On your plan today';
      priority = 'normal';
    }

    expectedSourceIds.add(sourceId);
    const ok = await upsertNotification(supabase, {
      user_id: userId,
      kind: 'event',
      title,
      body: `${event.title} · ${format(start, 'h:mm a')}`,
      subtitle: 'Your plan',
      href: '/dashboard/daily-plan',
      source_id: sourceId,
      priority,
    });
    if (!ok) upsertFailed = true;
  }

  let assignmentCount = 0;
  for (const assignment of assignments ?? []) {
    if (!assignment.due_at || assignmentCount >= 10) continue;
    const due = new Date(assignment.due_at);
    const urgency = classifyDueDate(due, now, todayStart, todayEnd);
    if (urgency === 'later') continue;

    assignmentCount += 1;
    const sourceId = `assignment-${assignment.id}`;
    let title = 'Canvas assignment due soon';
    let priority: 'high' | 'normal' = 'normal';

    if (urgency === 'overdue') {
      title = 'Assignment overdue';
      priority = 'high';
    } else if (urgency === 'today') {
      title = 'Canvas due today';
      priority = 'high';
    } else if (urgency === 'soon') {
      title = 'Canvas assignment due soon';
      priority = 'normal';
    }

    const course = assignment.course_name || 'Canvas';
    expectedSourceIds.add(sourceId);
    const ok = await upsertNotification(supabase, {
      user_id: userId,
      kind: 'assignment',
      title,
      body: `${assignment.name} · ${course} · Due ${formatDueLabel(due)}`,
      subtitle: course,
      href: assignment.html_url || '/dashboard/tasks?filter=canvas',
      source_id: sourceId,
      priority,
    });
    if (!ok) upsertFailed = true;
  }

  const googleAccount = integrationAccounts?.find(
    (a: { provider: string }) => a.provider === 'google_calendar',
  );
  const canvasAccount = integrationAccounts?.find(
    (a: { provider: string }) => a.provider === 'canvas',
  );
  const schedulingPrefs = profile?.scheduling_preferences as
    | { google_sync_frequency?: string }
    | null
    | undefined;

  const connections: DashboardConnections = {
    canvasConnected: canvasAccount?.status === 'connected',
    canvasDueCount: assignments?.length ?? 0,
    googleConnected: googleAccount?.status === 'connected',
    googleLastSyncedAt:
      googleAccount?.last_synced_at || profile?.google_calendar_last_synced_at || null,
    googleSyncFrequency: schedulingPrefs?.google_sync_frequency || 'hourly',
  };

  const priorityAlerts = getPriorityAlerts((tasks ?? []) as Task[], connections);

  for (const alert of priorityAlerts) {
    const sourceId =
      alert.kind === 'stale_sync'
        ? 'system-stale-sync'
        : alert.kind === 'canvas_due'
          ? 'canvas-due-summary'
          : `alert-${alert.id}`;

    if (alert.kind === 'overdue_task') continue;

    expectedSourceIds.add(sourceId);
    const ok = await upsertNotification(supabase, {
      user_id: userId,
      kind: 'system',
      title: alert.title,
      body: alert.subtitle,
      subtitle: alert.kind === 'canvas_due' ? 'Canvas' : 'System',
      href: alert.href ?? '/dashboard/settings/integrations',
      source_id: sourceId,
      priority: alert.kind === 'canvas_due' ? 'high' : 'normal',
    });
    if (!ok) upsertFailed = true;
  }

  const staleSourceIds = [...activeSourceIds].filter((id) => !expectedSourceIds.has(id));
  await dismissBySourceIds(supabase, userId, staleSourceIds);

  return { ok: !upsertFailed };
}

export async function listUserNotifications(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ notifications: AppNotification[]; unreadCount: number; groups: NotificationGroup[] }> {
  const { data, error } = await supabase
    .from('user_notifications')
    .select('*')
    .eq('user_id', userId)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[notifications] list failed:', error.message);
    return { notifications: [], unreadCount: 0, groups: [] };
  }

  const notifications = (data ?? []).map(rowToAppNotification);
  const unreadCount = notifications.filter((n) => !n.readAt).length;
  const groups = groupNotifications(notifications);

  return { notifications, unreadCount, groups };
}

export async function markNotificationRead(
  supabase: SupabaseClient<Database>,
  userId: string,
  notificationId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId);

  return !error;
}

export async function dismissNotification(
  supabase: SupabaseClient<Database>,
  userId: string,
  notificationId: string,
): Promise<boolean> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('user_notifications')
    .update({ dismissed_at: now, read_at: now })
    .eq('id', notificationId)
    .eq('user_id', userId);

  return !error;
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: now })
    .eq('user_id', userId)
    .is('dismissed_at', null)
    .is('read_at', null);

  return !error;
}

export async function getUnreadNotificationCount(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from('user_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('dismissed_at', null)
    .is('read_at', null);

  if (error) return 0;
  return count ?? 0;
}
