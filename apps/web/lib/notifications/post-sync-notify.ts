import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

import { recordNotificationDelivery } from './delivery';
import { applyDailyPushCap, countPushDeliveriesToday, type PushCandidate } from './push-dispatch';
import { collectPostSyncDigestCandidates } from './source-sweep';
import { normalizeNotificationPreferences, parseNotificationPreferencesRow } from './preferences';

type ExpoPushTicket =
  | { status: 'ok'; id?: string }
  | { status: 'error'; message?: string; details?: { error?: string } };

type ExpoPushResponse = {
  data?: ExpoPushTicket[];
};

async function sendPushCandidates(
  supabase: SupabaseClient<Database>,
  candidates: PushCandidate[]
) {
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < candidates.length; i += 100) {
    const batch = candidates.slice(i, i + 100);
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch.map((candidate) => ({
        to: candidate.token,
        sound: 'default',
        title: candidate.title,
        body: candidate.body,
        data: candidate.data,
      }))),
    });

    if (!response.ok) {
      failed += batch.length;
      console.error('[post-sync-notify] Expo error:', await response.text());
      continue;
    }

    const result = await response.json() as ExpoPushResponse;
    if (!result.data) continue;

    for (let idx = 0; idx < result.data.length; idx++) {
      const receipt = result.data[idx];
      const candidate = batch[idx];
      if (!candidate) continue;

      if (receipt.status === 'ok') {
        sent += 1;
        await recordNotificationDelivery(
          supabase,
          candidate.userId,
          candidate.notificationType,
          'push',
          candidate.dedupeKey,
          {
            provider: 'expo',
            ticket_id: receipt.id ?? null,
            ...(candidate.metadata ?? {}),
          }
        );
      } else {
        failed += 1;
      }
    }
  }

  return { sent, failed };
}

export async function evaluatePostSyncNotifications(
  supabase: SupabaseClient<Database>,
  userId: string,
  provider: string,
  newOrUpdatedCount: number
) {
  const candidates = await collectPostSyncDigestCandidates(supabase, userId, provider, newOrUpdatedCount);
  if (candidates.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const { data: user } = await supabase
    .from('users')
    .select('notification_preferences ( quiet_hours )')
    .eq('id', userId)
    .single();

  const prefs = parseNotificationPreferencesRow(
    Array.isArray(user?.notification_preferences)
      ? user.notification_preferences[0]
      : user?.notification_preferences
  );
  const timezone = normalizeNotificationPreferences(prefs).quiet_hours.timezone;
  const startingCount = await countPushDeliveriesToday(supabase, userId, timezone, new Date());
  const capped = applyDailyPushCap(candidates, startingCount);

  return sendPushCandidates(supabase, capped);
}

export async function dispatchPushCandidates(
  supabase: SupabaseClient<Database>,
  candidates: PushCandidate[],
  usersById: Map<string, { timezone: string }>
) {
  const grouped = new Map<string, PushCandidate[]>();
  for (const candidate of candidates) {
    const current = grouped.get(candidate.userId) ?? [];
    current.push(candidate);
    grouped.set(candidate.userId, current);
  }

  const accepted: PushCandidate[] = [];
  const now = new Date();

  for (const [userId, userCandidates] of grouped.entries()) {
    const timezone = usersById.get(userId)?.timezone ?? 'UTC';
    const startingCount = await countPushDeliveriesToday(supabase, userId, timezone, now);
    accepted.push(...applyDailyPushCap(userCandidates, startingCount));
  }

  return sendPushCandidates(supabase, accepted);
}
