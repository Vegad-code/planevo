import { createClient } from './supabase/server';

export interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

export interface TimeGap {
  start: Date;
  end: Date;
  durationMinutes: number;
}

/**
 * Fetches events from Google Calendar for the current user.
 * Requires the user to have logged in via Google OAuth with the calendar scope.
 */
export async function getCalendarEvents(timeMin?: string, timeMax?: string): Promise<{ events: CalendarEvent[], error: any }> {
  const supabase = await createClient();
  
  // Get the session to retrieve the provider_token
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return { events: [], error: 'No active session' };
  }

  const providerToken = session.provider_token;
  
  if (!providerToken) {
    return { events: [], error: 'No Google provider token found. Please re-login.' };
  }

  const now = new Date();
  const defaultMin = timeMin || now.toISOString();
  const defaultMax = timeMax || new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${defaultMin}&timeMax=${defaultMax}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${providerToken}`,
        },
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      return { events: [], error: errData.error?.message || 'Failed to fetch calendar' };
    }

    const data = await response.json();
    return { events: data.items || [], error: null };
  } catch (err) {
    return { events: [], error: err };
  }
}

/**
 * Identifies gaps between events for today.
 */
export function findGaps(events: CalendarEvent[], dayStart: Date, dayEnd: Date): TimeGap[] {
  const gaps: TimeGap[] = [];
  
  // Filter and sort events that have dateTime (ignore all-day events for now)
  const sortedEvents = events
    .filter(e => e.start.dateTime && e.end.dateTime)
    .map(e => ({
      start: new Date(e.start.dateTime!),
      end: new Date(e.end.dateTime!)
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  let lastEnd = dayStart;

  for (const event of sortedEvents) {
    if (event.start > lastEnd) {
      const duration = (event.start.getTime() - lastEnd.getTime()) / (1000 * 60);
      if (duration >= 15) { // Minimum 15 min gap
        gaps.push({
          start: lastEnd,
          end: event.start,
          durationMinutes: Math.floor(duration)
        });
      }
    }
    if (event.end > lastEnd) {
      lastEnd = event.end;
    }
  }

  // Final gap until end of day
  if (lastEnd < dayEnd) {
    const duration = (dayEnd.getTime() - lastEnd.getTime()) / (1000 * 60);
    if (duration >= 15) {
      gaps.push({
        start: lastEnd,
        end: dayEnd,
        durationMinutes: Math.floor(duration)
      });
    }
  }

  return gaps;
}
