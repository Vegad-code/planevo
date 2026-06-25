import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

import { hasNotificationDelivery } from './delivery';
import type { PushCandidate } from './push-dispatch';
import {
  canSendNotification,
  getLocalDateKey,
  isPastLocalTime,
  normalizeNotificationPreferences,
  parseNotificationPreferencesRow,
  type NotificationPreferences,
  type NotificationType,
} from './preferences';

type SourceItemRow = {
  id: string;
  provider: string;
  title: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  item_type: string;
};

type SweepUser = {
  id: string;
  name: string | null;
  expo_push_token: string | null;
  preferred_morning_time: string | null;
  notification_preferences: Partial<NotificationPreferences> | null;
};

const PROVIDER_NOTIFICATION_TYPE: Record<string, NotificationType> = {
  canvas: 'canvas_assignments',
  slack: 'work_slack',
  linear: 'work_linear',
  notion: 'work_notion',
};

const PROVIDER_LABEL: Record<string, string> = {
  canvas: 'Canvas',
  slack: 'Slack',
  linear: 'Linear',
  notion: 'Notion',
};

function isDueWithinDays(dueDate: string | null, timezone: string, now: Date, minDays: number, maxDays: number) {
  if (!dueDate) return false;
  const localToday = getLocalDateKey(now, timezone);
  const localDue = getLocalDateKey(new Date(dueDate), timezone);
  const daysUntil = Math.floor(
    (Date.parse(`${localDue}T12:00:00.000Z`) - Date.parse(`${localToday}T12:00:00.000Z`))
    / (24 * 60 * 60 * 1000)
  );
  return daysUntil >= minDays && daysUntil <= maxDays;
}

function isRecentlyChanged(item: SourceItemRow, since: Date) {
  const created = new Date(item.created_at).getTime();
  const updated = new Date(item.updated_at).getTime();
  const threshold = since.getTime();
  return created >= threshold || updated >= threshold;
}

export async function collectIntegrationDigestCandidates(
  supabase: SupabaseClient<Database>,
  users: SweepUser[],
  now: Date,
  options: { since?: Date } = {}
): Promise<PushCandidate[]> {
  const since = options.since ?? new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const userIds = users.map((user) => user.id);
  if (userIds.length === 0) return [];

  const { data: items, error } = await supabase
    .from('source_items')
    .select('id, user_id, provider, title, due_date, created_at, updated_at, item_type')
    .in('user_id', userIds)
    .in('provider', ['canvas', 'slack', 'linear', 'notion'])
    .is('deleted_at', null);

  if (error) {
    console.error('[source-sweep] Failed to fetch source items:', error);
    return [];
  }

  const itemsByUserProvider = new Map<string, SourceItemRow[]>();
  for (const row of (items ?? []) as Array<SourceItemRow & { user_id: string }>) {
    const key = `${row.user_id}:${row.provider}`;
    const current = itemsByUserProvider.get(key) ?? [];
    current.push(row);
    itemsByUserProvider.set(key, current);
  }

  const candidates: PushCandidate[] = [];

  for (const user of users) {
    if (!user.expo_push_token) continue;

    const prefs = user.notification_preferences;
    const timezone = normalizeNotificationPreferences(prefs).quiet_hours.timezone;
    const dedupeKey = getLocalDateKey(now, timezone);
    const morningTime = user.preferred_morning_time || '09:00';
    if (!isPastLocalTime(now, timezone, morningTime)) continue;

    for (const provider of Object.keys(PROVIDER_NOTIFICATION_TYPE)) {
      const notificationType = PROVIDER_NOTIFICATION_TYPE[provider];
      if (!canSendNotification(prefs, 'push', notificationType, { now, respectQuietHours: true })) {
        continue;
      }

      const providerItems = itemsByUserProvider.get(`${user.id}:${provider}`) ?? [];
      const relevant = providerItems.filter((item) => {
        if (isRecentlyChanged(item, since)) return true;
        if (provider === 'canvas' && item.item_type === 'assignment') {
          return isDueWithinDays(item.due_date, timezone, now, 1, 3);
        }
        return false;
      });

      if (relevant.length === 0) continue;

      const digestDedupe = `${provider}-digest-${dedupeKey}`;
      if (await hasNotificationDelivery(supabase, user.id, notificationType, 'push', digestDedupe)) {
        continue;
      }

      const label = PROVIDER_LABEL[provider] ?? provider;
      const headline = relevant.length === 1
        ? relevant[0].title
        : `${relevant.length} ${label} updates`;

      candidates.push({
        userId: user.id,
        token: user.expo_push_token,
        notificationType,
        dedupeKey: digestDedupe,
        title: `${label} from Bruno`,
        body: relevant.length === 1
          ? `New on your radar: ${headline}`
          : `${headline} need your attention.`,
        data: {
          screen: provider === 'canvas' ? 'tasks' : 'index',
          source: provider,
          itemId: relevant[0]?.id,
        },
        metadata: {
          provider,
          item_count: relevant.length,
        },
      });
    }
  }

  return candidates;
}

export async function collectPostSyncDigestCandidates(
  supabase: SupabaseClient<Database>,
  userId: string,
  provider: string,
  newOrUpdatedCount: number
): Promise<PushCandidate[]> {
  if (newOrUpdatedCount <= 0) return [];

  const notificationType = PROVIDER_NOTIFICATION_TYPE[provider];
  if (!notificationType) return [];

  const { data: user, error } = await supabase
    .from('users')
    .select(`
      id, name, expo_push_token,
      notification_preferences ( master_toggle, channels, types, quiet_hours )
    `)
    .eq('id', userId)
    .single();

  if (error || !user?.expo_push_token) return [];

  const prefs = parseNotificationPreferencesRow(
    Array.isArray(user.notification_preferences)
      ? user.notification_preferences[0]
      : user.notification_preferences
  );
  const now = new Date();
  if (!canSendNotification(prefs, 'push', notificationType, { now, respectQuietHours: true })) {
    return [];
  }

  const timezone = normalizeNotificationPreferences(prefs).quiet_hours.timezone;
  const dedupeKey = `${provider}-sync-${getLocalDateKey(now, timezone)}`;
  if (await hasNotificationDelivery(supabase, userId, notificationType, 'push', dedupeKey)) {
    return [];
  }

  const label = PROVIDER_LABEL[provider] ?? provider;
  return [{
    userId,
    token: user.expo_push_token,
    notificationType,
    dedupeKey,
    title: `${label} update`,
    body: newOrUpdatedCount === 1
      ? `Bruno found something new in ${label}.`
      : `Bruno found ${newOrUpdatedCount} updates in ${label}.`,
    data: {
      screen: provider === 'canvas' ? 'tasks' : 'index',
      source: provider,
    },
    metadata: {
      provider,
      item_count: newOrUpdatedCount,
      trigger: 'post_sync',
    },
  }];
}
