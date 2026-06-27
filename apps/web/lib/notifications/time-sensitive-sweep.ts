import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

import { hasNotificationDelivery } from './delivery';
import type { PushCandidate } from './push-dispatch';
import {
  canSendNotification,
  getLocalDateKey,
  isLocalTimeWithinWindow,
  normalizeNotificationPreferences,
  type NotificationPreferences,
} from './preferences';

type SweepUser = {
  id: string;
  name: string | null;
  expo_push_token: string | null;
  notification_preferences: Partial<NotificationPreferences> | null;
};

type CalendarEventRow = {
  id: string;
  user_id: string | null;
  title: string;
  start_time: string;
};

export async function collectTimeSensitivePushCandidates(
  supabase: SupabaseClient<Database>,
  users: SweepUser[],
  now: Date
): Promise<PushCandidate[]> {
  const userIds = users.map((user) => user.id);
  if (userIds.length === 0) return [];

  const windowStart = now.toISOString();
  const windowEnd = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const { data: events, error } = await supabase
    .from('calendar_events')
    .select('id, user_id, title, start_time')
    .in('user_id', userIds)
    .eq('is_deleted', false)
    .gte('start_time', windowStart)
    .lte('start_time', windowEnd);

  if (error) {
    console.error('[time-sensitive] Failed to fetch calendar events:', error);
    return [];
  }

  const usersById = new Map(users.map((user) => [user.id, user]));
  const candidates: PushCandidate[] = [];

  for (const event of (events ?? []) as CalendarEventRow[]) {
    if (!event.user_id) continue;
    const user = usersById.get(event.user_id);
    if (!user?.expo_push_token) continue;

    const prefs = user.notification_preferences;
    const timezone = normalizeNotificationPreferences(prefs).quiet_hours.timezone;
    const eventStart = new Date(event.start_time);

    if (!isLocalTimeWithinWindow(now, timezone, formatLocalTime(eventStart, timezone), 60)) {
      continue;
    }

    if (!canSendNotification(prefs, 'push', 'calendar_events', { now, respectQuietHours: true })) {
      continue;
    }

    const dedupeKey = `event-${event.id}-${getLocalDateKey(now, timezone)}`;
    if (await hasNotificationDelivery(supabase, user.id, 'calendar_events', 'push', dedupeKey)) {
      continue;
    }

    candidates.push({
      userId: user.id,
      token: user.expo_push_token,
      notificationType: 'calendar_events',
      dedupeKey,
      title: 'Starting soon',
      body: `${event.title} is coming up. Bruno saved you a spot.`,
      data: {
        screen: 'calendar',
        source: 'calendar',
        eventId: event.id,
      },
      metadata: {
        event_id: event.id,
      },
    });
  }

  return candidates;
}

function formatLocalTime(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  return `${hour}:${minute}`;
}
