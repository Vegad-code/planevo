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
 * @deprecated Unused — calendar sync uses encrypted tokens in google-calendar.ts.
 */
export async function getCalendarEvents(timeMin?: string, timeMax?: string): Promise<{ events: CalendarEvent[], error: unknown }> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { events: [], error: 'No active session' };
  }

  const { data: { session } } = await supabase.auth.getSession();
  const providerToken = session?.provider_token;
  
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

export interface TimeWindow {
  start: Date;
  end: Date;
}

/**
 * Identifies gaps between events for today, respecting forbidden windows/constraints.
 */
export function findGaps(
  events: CalendarEvent[], 
  dayStart: Date, 
  dayEnd: Date,
  constraints: TimeWindow[] = []
): TimeGap[] {
  const gaps: TimeGap[] = [];
  
  // 1. Combine events and constraints into a single list of "Blockers"
  const blockers = [
    ...events
      .filter(e => e.start.dateTime && e.end.dateTime)
      .map(e => ({
        start: new Date(e.start.dateTime!),
        end: new Date(e.end.dateTime!)
      })),
    ...constraints
  ].sort((a, b) => a.start.getTime() - b.start.getTime());

  let lastEnd = dayStart;

  for (const blocker of blockers) {
    // If the blocker starts after our lastEnd, there's a potential gap
    if (blocker.start > lastEnd) {
      // Ensure we don't start a gap before dayStart or end it after dayEnd
      const gapStart = lastEnd < dayStart ? dayStart : lastEnd;
      const gapEnd = blocker.start > dayEnd ? dayEnd : blocker.start;

      if (gapEnd > gapStart) {
        const duration = (gapEnd.getTime() - gapStart.getTime()) / (1000 * 60);
        if (duration >= 15) { // Minimum 15 min gap
          gaps.push({
            start: gapStart,
            end: gapEnd,
            durationMinutes: Math.floor(duration)
          });
        }
      }
    }
    
    // Update lastEnd to the end of this blocker, but only if it's further than current lastEnd
    if (blocker.end > lastEnd) {
      lastEnd = blocker.end;
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
