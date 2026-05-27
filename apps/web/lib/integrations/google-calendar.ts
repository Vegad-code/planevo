'use server';

import { createClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/crypto';

export async function refreshGoogleToken(refreshToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || 'Failed to refresh Google token');
  }

  return data.access_token;
}

export async function syncGoogleCalendar(userId: string) {
  const supabase = await createClient();

  // 1. Get the refresh token
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('google_calendar_refresh_token, google_calendar_id, scheduling_preferences')
    .eq('id', userId)
    .single();

  if (userError || !user?.google_calendar_refresh_token) {
    throw new Error('User not connected to Google Calendar');
  }

  // 2. Get a fresh access token
  const decryptedToken = decryptToken(user.google_calendar_refresh_token);
  const accessToken = await refreshGoogleToken(decryptedToken);

  // 3. Determine which calendars to sync
  const preferences = user.scheduling_preferences as Record<string, any> || {};
  let calendarsToSync: string[] = preferences.google_selected_calendars || [];
  if (!calendarsToSync || calendarsToSync.length === 0) {
    if (user.google_calendar_id) {
      calendarsToSync = [user.google_calendar_id];
    } else {
      calendarsToSync = ['primary'];
    }
  }

  // 4. Fetch events (next 7 days) for each selected calendar
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  let allEventsData: any[] = [];

  for (const calendarId of calendarsToSync) {
    const eventsResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (eventsResponse.ok) {
      const eventsData = await eventsResponse.json();
      if (eventsData.items) {
        // Tag each item with the calendarId so we know where it came from
        const taggedItems = eventsData.items.map((item: any) => ({
          ...item,
          _calendarId: calendarId
        }));
        allEventsData = [...allEventsData, ...taggedItems];
      }
    } else {
      console.warn(`Failed to fetch Google events for calendar ${calendarId}`);
    }
  }

  // 5. Transform to calendar_events format
  const events = allEventsData.map((item: Record<string, unknown>) => {
    const start = item.start as Record<string, unknown>;
    const end = item.end as Record<string, unknown>;
    const isAllDay = !!start.date;
    return {
      user_id: userId,
      title: (item.summary as string) || 'Untitled Event',
      start_time: (start.dateTime as string) || `${start.date}T00:00:00.000Z`,
      end_time: (end.dateTime as string) || `${end.date}T23:59:59.999Z`,
      is_all_day: isAllDay,
      source: 'google_calendar',
      external_id: item.id as string,
      description: (item.description as string) || null,
      location: (item.location as string) || null,
      icon: null,
      color: null,
      energy_level: null,
      is_completed: false,
      is_deleted: false,
      metadata: { google_calendar_id: item._calendarId }
    };
  });

  if (events.length === 0) {
    await supabase.from('users').update({ google_calendar_last_synced_at: new Date().toISOString() }).eq('id', userId);
    return 0;
  }

  // 6. Upsert into calendar_events
  const now = new Date().toISOString();
  const futureEvents = events.filter((e: Record<string, unknown>) => new Date(e.start_time as string) >= new Date(now));

  if (futureEvents.length > 0) {
    // Supabase JS doesn't support partial index constraints for ON CONFLICT.
    // We must fetch existing events to get their PKs (id) and update them, or insert if new.
    const externalIds = futureEvents.map((e: any) => e.external_id);
    const { data: existingEvents } = await supabase
      .from('calendar_events')
      .select('id, external_id')
      .eq('user_id', userId)
      .eq('source', 'google_calendar')
      .in('external_id', externalIds);

    const existingMap = new Map(existingEvents?.map((e: any) => [e.external_id, e.id]) || []);

    const toInsert = [];
    const toUpdate = [];

    for (const event of futureEvents) {
      const extId = (event as any).external_id;
      if (existingMap.has(extId)) {
        toUpdate.push({ ...event, id: existingMap.get(extId) });
      } else {
        toInsert.push(event);
      }
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from('calendar_events').insert(toInsert);
      if (insertError) throw insertError;
    }

    if (toUpdate.length > 0) {
      const { error: updateError } = await supabase.from('calendar_events').upsert(toUpdate, { onConflict: 'id' });
      if (updateError) throw updateError;
    }
  }

  // Record successful sync
  await supabase.from('users').update({ google_calendar_last_synced_at: now }).eq('id', userId);

  return futureEvents.length;
}

export async function disconnectGoogleCalendarAction() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }
  const userId = user.id;
  
  // 1. Soft-delete all imported google events
  const { error: eventsError } = await supabase
    .from('calendar_events')
    .update({ is_deleted: true })
    .eq('user_id', userId)
    .eq('source', 'google_calendar');
    
  if (eventsError) {
    console.error('Failed to soft-delete Google events:', eventsError);
    return { success: false, error: eventsError.message };
  }

  // 2. Clear Google Calendar connection state
  const { error: userError } = await supabase
    .from('users')
    .update({ 
      google_calendar_connected: false,
      google_calendar_refresh_token: null,
      google_calendar_id: null,
      google_calendar_last_synced_at: null
    })
    .eq('id', userId);

  if (userError) {
    console.error('Failed to disconnect Google Calendar:', userError);
    return { success: false, error: userError.message };
  }

  return { success: true };
}

export async function fetchGoogleCalendars(userId: string) {
  const supabase = await createClient();

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('google_calendar_refresh_token, scheduling_preferences')
    .eq('id', userId)
    .single();

  if (userError || !user?.google_calendar_refresh_token) {
    throw new Error('User not connected to Google Calendar');
  }

  const decryptedToken = decryptToken(user.google_calendar_refresh_token);
  const accessToken = await refreshGoogleToken(decryptedToken);

  const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Google calendars');
  }

  const data = await response.json();
  const preferences = user.scheduling_preferences as Record<string, any> || {};
  const selectedIds: string[] = preferences.google_selected_calendars || [];

  const calendars = data.items.map((cal: any) => ({
    id: cal.id,
    summary: cal.summaryOverride || cal.summary,
    colorId: cal.colorId,
    primary: !!cal.primary,
    selected: selectedIds.length > 0 ? selectedIds.includes(cal.id) : !!cal.primary,
  }));

  return calendars;
}
