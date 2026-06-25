'use server';

import { createClient } from '@/lib/supabase/server';
import {
  defaultNotificationPreferences,
  type NotificationPreferences as BaseNotificationPreferences,
} from '@/lib/notifications/preferences';
import { getNotificationDeliveryInsight, type NotificationDeliveryInsight } from '@/lib/notifications/insights';
import { revalidatePath } from 'next/cache';

export interface NotificationPreferences extends BaseNotificationPreferences {
  id?: string;
  user_id?: string;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Unauthorized');

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      console.warn('notification_preferences table does not exist yet. Returning defaults.');
      return defaultNotificationPreferences;
    }
    console.error('Failed to fetch notification preferences:', JSON.stringify(error, null, 2));
    throw new Error('Failed to fetch notification preferences');
  }

  // If no preferences exist, return defaults
  if (!data) {
    return defaultNotificationPreferences;
  }

  return {
    ...data,
    master_toggle: data.master_toggle ?? defaultNotificationPreferences.master_toggle,
    channels: {
      ...defaultNotificationPreferences.channels,
      ...(data.channels as Partial<NotificationPreferences['channels']>),
    },
    quiet_hours: {
      ...defaultNotificationPreferences.quiet_hours,
      ...(data.quiet_hours as Partial<NotificationPreferences['quiet_hours']>),
    },
    types: {
      ...defaultNotificationPreferences.types,
      ...(data.types as Partial<NotificationPreferences['types']>),
    },
  };
}

export async function updateNotificationPreferences(
  updates: Partial<Omit<NotificationPreferences, 'id' | 'user_id'>>
): Promise<void> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Unauthorized');

  // Check if they exist first
  const { data: existing } = await supabase
    .from('notification_preferences')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('notification_preferences')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        console.warn('notification_preferences table does not exist yet. Ignoring update.');
        return;
      }
      console.error('Failed to update notification preferences:', JSON.stringify(error, null, 2));
      throw new Error('Failed to update notification preferences');
    }
  } else {
    // Insert with defaults merged with updates
    const insertData = {
      user_id: user.id,
      master_toggle: updates.master_toggle ?? defaultNotificationPreferences.master_toggle,
      channels: updates.channels ?? defaultNotificationPreferences.channels,
      quiet_hours: updates.quiet_hours ?? defaultNotificationPreferences.quiet_hours,
      types: updates.types ?? defaultNotificationPreferences.types,
    };

    const { error } = await supabase
      .from('notification_preferences')
      .insert(insertData);

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        console.warn('notification_preferences table does not exist yet. Ignoring insert.');
        return;
      }
      console.error('Failed to create notification preferences:', JSON.stringify(error, null, 2));
      throw new Error('Failed to create notification preferences');
    }
  }

  revalidatePath('/dashboard/settings/notifications');
}

export async function ensureDetectedTimezone(detectedTimezone: string): Promise<void> {
  if (!detectedTimezone || detectedTimezone === 'UTC') {
    return;
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return;

  const { data: existing } = await supabase
    .from('notification_preferences')
    .select('quiet_hours')
    .eq('user_id', user.id)
    .maybeSingle();

  const currentTimezone = (existing?.quiet_hours as { timezone?: string } | null)?.timezone ?? 'UTC';
  if (currentTimezone !== 'UTC') {
    return;
  }

  await updateNotificationPreferences({
    quiet_hours: {
      ...defaultNotificationPreferences.quiet_hours,
      ...(existing?.quiet_hours as Partial<NotificationPreferences['quiet_hours']> | undefined),
      timezone: detectedTimezone,
    },
  });
}

export async function getNotificationDeliveryStatus(): Promise<NotificationDeliveryInsight> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  const [preferences, userRow] = await Promise.all([
    getNotificationPreferences(),
    supabase
      .from('users')
      .select('plan_type')
      .eq('id', user.id)
      .single(),
  ]);

  return getNotificationDeliveryInsight(
    supabase,
    user.id,
    preferences,
    userRow.data?.plan_type ?? 'free'
  );
}
