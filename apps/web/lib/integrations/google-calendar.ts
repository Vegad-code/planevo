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
    .select('google_calendar_refresh_token, google_calendar_id')
    .eq('id', userId)
    .single();

  if (userError || !user?.google_calendar_refresh_token) {
    throw new Error('User not connected to Google Calendar');
  }

  // 2. Get a fresh access token
  const decryptedToken = decryptToken(user.google_calendar_refresh_token);
  const accessToken = await refreshGoogleToken(decryptedToken);

  // 3. Fetch events (next 7 days)
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const eventsResponse = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${user.google_calendar_id}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const eventsData = await eventsResponse.json();
  if (!eventsResponse.ok) {
    throw new Error('Failed to fetch Google events');
  }

  // 4. Transform to calendar_events format
  const events = eventsData.items.map((item: Record<string, unknown>) => {
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
    };
  });

  if (events.length === 0) return 0;

  // 5. Upsert into calendar_events
  // Since we don't have a unique constraint on (user_id, external_id, source) right now 
  // without changing schema or writing an RPC, we'll do the simple clean & insert approach
  // for future events to avoid duplicates.
  const now = new Date().toISOString();
  await supabase
    .from('calendar_events')
    .delete()
    .eq('user_id', userId)
    .eq('source', 'google_calendar')
    .gte('start_time', now);

  const futureEvents = events.filter((e: Record<string, unknown>) => new Date(e.start_time as string) >= new Date(now));

  if (futureEvents.length > 0) {
    const { error: insertError } = await supabase
      .from('calendar_events')
      .insert(futureEvents);

    if (insertError) throw insertError;
  }

  return futureEvents.length;
}
