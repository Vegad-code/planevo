import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

import { getLocalDateKey } from './preferences';

export const MAX_DAILY_PUSH_NOTIFICATIONS = 4;

export type PushPayload = {
  screen: string;
  source?: string;
  itemId?: string;
  eventId?: string;
  prompt?: string;
};

export type PushCandidate = {
  userId: string;
  token: string;
  notificationType: string;
  dedupeKey: string;
  title: string;
  body: string;
  data: PushPayload;
  metadata?: Record<string, unknown>;
};

export async function countPushDeliveriesToday(
  supabase: SupabaseClient<Database>,
  userId: string,
  timezone: string,
  now: Date
): Promise<number> {
  const dedupeKey = getLocalDateKey(now, timezone);
  const { count, error } = await supabase
    .from('notification_deliveries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('channel', 'push')
    .eq('dedupe_key', dedupeKey);

  if (error) {
    console.error('[notifications] Failed to count daily push deliveries:', error);
    return MAX_DAILY_PUSH_NOTIFICATIONS;
  }

  return count ?? 0;
}

export function applyDailyPushCap(
  candidates: PushCandidate[],
  startingCount: number,
  maxPerDay = MAX_DAILY_PUSH_NOTIFICATIONS
): PushCandidate[] {
  let remaining = Math.max(0, maxPerDay - startingCount);
  const accepted: PushCandidate[] = [];

  for (const candidate of candidates) {
    if (remaining <= 0) break;
    accepted.push(candidate);
    remaining -= 1;
  }

  return accepted;
}
