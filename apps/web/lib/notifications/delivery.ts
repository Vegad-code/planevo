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
  }
}
