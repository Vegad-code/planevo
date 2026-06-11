import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/database';

export type NotificationDeliveryChannel = 'push' | 'email';

export async function hasNotificationDelivery(
  supabase: SupabaseClient<Database>,
  userId: string,
  type: string,
  channel: NotificationDeliveryChannel,
  dedupeKey: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('notification_deliveries')
    .select('id')
    .eq('user_id', userId)
    .eq('notification_type', type)
    .eq('channel', channel)
    .eq('dedupe_key', dedupeKey)
    .maybeSingle();

  if (error) {
    console.error('[notifications] Failed to check delivery ledger:', error);
    return false;
  }

  return !!data;
}

export async function recordNotificationDelivery(
  supabase: SupabaseClient<Database>,
  userId: string,
  type: string,
  channel: NotificationDeliveryChannel,
  dedupeKey: string,
  metadata: Json = {}
) {
  const { error } = await supabase
    .from('notification_deliveries')
    .upsert(
      {
        user_id: userId,
        notification_type: type,
        channel,
        dedupe_key: dedupeKey,
        metadata,
        sent_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,notification_type,channel,dedupe_key' }
    );

  if (error) {
    console.error('[notifications] Failed to record delivery:', error);
    throw error;
  }
}

export async function getRecentTestNotificationCount(
  supabase: SupabaseClient<Database>,
  userId: string,
  channel: NotificationDeliveryChannel,
  hours: number = 24
): Promise<number> {
  const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const notificationType = channel === 'email' ? 'test_email' : 'test_push';

  const { count, error } = await supabase
    .from('notification_deliveries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('notification_type', notificationType)
    .eq('channel', channel)
    .gte('sent_at', timeAgo);

  if (error) {
    console.error('[notifications] Failed to count recent test notifications:', error);
    return 999; // Fail closed if we can't verify
  }

  return count || 0;
}
