import { createClient } from '@/lib/supabase/server';

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
  const accessToken = await refreshGoogleToken(user.google_calendar_refresh_token);

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

  // 4. Transform and Upsert to calendar_events
  const events = eventsData.items.map((item: any) => ({
    user_id: userId,
    title: item.summary || 'Untitled Event',
    start_time: item.start.dateTime || item.start.date,
    end_time: item.end.dateTime || item.end.date,
    source: 'google_calendar',
    metadata: {
      google_event_id: item.id,
      description: item.description,
      location: item.location
    }
  }));

  // Simple clean up and insert (or upsert if we had an external ID mapping)
  // For now, let's just clear future google events and re-insert
  await supabase
    .from('calendar_events')
    .delete()
    .eq('user_id', userId)
    .eq('source', 'google_calendar');

  const { error: insertError } = await supabase
    .from('calendar_events')
    .insert(events);

  if (insertError) throw insertError;

  return events.length;
}
