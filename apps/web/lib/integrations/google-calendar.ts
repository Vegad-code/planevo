'use server';

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { decryptToken, encryptToken } from '@/lib/crypto';
import { getIntegrationAccount, upsertIntegrationAccount } from '@/lib/integrations/accounts';
import { resilientFetch } from '@/lib/http/resilient-fetch';
import type { Json } from '@/types/database';

function isEncryptedIntegrationToken(value: string): boolean {
  const parts = value.split(':');
  return parts.length === 3 && parts.every((part) => /^[0-9a-f]+$/i.test(part));
}

/**
 * Resolves Google Calendar credentials from integration_accounts, with a legacy
 * fallback to users.google_calendar_refresh_token and automatic backfill.
 */
async function resolveGoogleCalendarCredentials(
  userId: string
): Promise<{ encryptedToken: string; accountId: string }> {
  const account = await getIntegrationAccount(userId, 'google_calendar');
  let encryptedToken = account?.refresh_token_encrypted ?? null;
  let accountId = account?.id;

  if (!encryptedToken) {
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('google_calendar_refresh_token')
      .eq('id', userId)
      .maybeSingle();

    const legacyToken = userRow?.google_calendar_refresh_token;
    if (legacyToken) {
      encryptedToken = isEncryptedIntegrationToken(legacyToken)
        ? legacyToken
        : encryptToken(legacyToken);

      if (accountId) {
        await supabaseAdmin
          .from('integration_accounts')
          .update({ refresh_token_encrypted: encryptedToken, status: 'connected' })
          .eq('id', accountId)
          .eq('user_id', userId);
      } else {
        accountId = await upsertIntegrationAccount({
          userId,
          provider: 'google_calendar',
          refreshTokenEncrypted: encryptedToken,
          status: 'connected',
        });
      }
    }
  }

  if (!encryptedToken || !accountId) {
    throw new Error('Google Calendar is not connected. Reconnect in Settings → Integrations.');
  }

  return { encryptedToken, accountId };
}

/**
 * Check whether the user's Google Calendar integration has write scope.
 * Write-back (pushing/deleting events to Google) requires an explicit
 * scope upgrade beyond calendar.readonly. Until the user grants that,
 * all write operations must be silently skipped.
 */
export async function hasGoogleWriteScope(userId: string): Promise<boolean> {
  const { data: account } = await supabaseAdmin
    .from('integration_accounts')
    .select('scopes')
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .maybeSingle();

  if (!account?.scopes || !Array.isArray(account.scopes)) return false;

  // Write scope variants that indicate the user has granted write access
  const writeScopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ];
  return account.scopes.some(s => writeScopes.includes(s));
}

export async function refreshGoogleToken(refreshToken: string) {
  const response = await resilientFetch('https://oauth2.googleapis.com/token', {
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

const GOOGLE_SYNC_PAST_DAYS = 90;
const GOOGLE_SYNC_FUTURE_DAYS = 365;
const GOOGLE_EVENTS_PAGE_SIZE = 250;

interface GoogleCalendarListItem {
  id: string;
  summary?: string;
  summaryOverride?: string;
  primary?: boolean;
  selected?: boolean;
  hidden?: boolean;
}

async function listGoogleCalendars(accessToken: string): Promise<GoogleCalendarListItem[]> {
  const response = await resilientFetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Google calendar list');
  }

  const data = (await response.json()) as { items?: GoogleCalendarListItem[] };
  return data.items ?? [];
}

export async function persistGoogleCalendarSources(
  userId: string,
  accountId: string,
  calendarIds: string[],
  nameById?: Map<string, string>
) {
  const supabase = await createClient();

  if (calendarIds.length === 0) return;

  const { data: existingSources } = await supabase
    .from('integration_sources')
    .select('external_id')
    .eq('account_id', accountId)
    .eq('source_type', 'calendar');

  const selectedSet = new Set(calendarIds);
  const staleIds =
    existingSources
      ?.map((source) => source.external_id)
      .filter((id) => !selectedSet.has(id)) ?? [];

  if (staleIds.length > 0) {
    await supabase
      .from('integration_sources')
      .update({ sync_enabled: false })
      .eq('account_id', accountId)
      .eq('source_type', 'calendar')
      .in('external_id', staleIds);
  }

  const sourcesToUpsert = calendarIds.map((id) => ({
    account_id: accountId,
    user_id: userId,
    source_type: 'calendar',
    external_id: id,
    name: nameById?.get(id) || (id === 'primary' ? 'Primary Calendar' : 'Google Calendar'),
    sync_enabled: true,
  }));

  await supabase
    .from('integration_sources')
    .upsert(sourcesToUpsert, { onConflict: 'account_id,external_id' });
}

async function resolveCalendarsToSync(
  userId: string,
  accountId: string,
  accessToken: string
): Promise<string[]> {
  const supabase = await createClient();

  const { data: userPrefs } = await supabase
    .from('users')
    .select('scheduling_preferences, google_calendar_id')
    .eq('id', userId)
    .single();

  const prefs = (userPrefs?.scheduling_preferences as Record<string, unknown> | null) || {};
  const prefSelected = Array.isArray(prefs.google_selected_calendars)
    ? (prefs.google_selected_calendars as string[]).filter(Boolean)
    : [];

  if (prefSelected.length > 0) {
    await persistGoogleCalendarSources(userId, accountId, prefSelected);
    return prefSelected;
  }

  const calendars = await listGoogleCalendars(accessToken);
  const selectedInGoogle = calendars
    .filter((cal) => cal.selected !== false && cal.hidden !== true)
    .map((cal) => cal.id);

  const defaultIds =
    selectedInGoogle.length > 0
      ? selectedInGoogle
      : calendars.filter((cal) => cal.primary).map((cal) => cal.id);

  const idsToSync =
    defaultIds.length > 0 ? defaultIds : [userPrefs?.google_calendar_id || 'primary'];

  const nameById = new Map(
    calendars.map((cal) => [cal.id, cal.summaryOverride || cal.summary || cal.id])
  );
  await persistGoogleCalendarSources(userId, accountId, idsToSync, nameById);

  await supabase
    .from('users')
    .update({
      scheduling_preferences: {
        ...prefs,
        google_selected_calendars: idsToSync,
      } as Json,
    })
    .eq('id', userId);

  return idsToSync;
}

async function fetchGoogleEventsForCalendar(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<Array<Record<string, unknown>>> {
  const allItems: Array<Record<string, unknown>> = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: String(GOOGLE_EVENTS_PAGE_SIZE),
      showDeleted: 'false',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;
    const response = await resilientFetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Failed to fetch Google events for calendar ${calendarId}: ${response.status} ${body}`
      );
    }

    const data = (await response.json()) as {
      items?: Array<Record<string, unknown>>;
      nextPageToken?: string;
    };

    if (Array.isArray(data.items)) {
      for (const item of data.items) {
        if (item.status === 'cancelled') continue;
        allItems.push(item);
      }
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return allItems;
}

export async function saveGoogleCalendarSelection(userId: string, selectedCalendarIds: string[]) {
  const account = await getIntegrationAccount(userId, 'google_calendar');
  if (!account) {
    throw new Error('Google Calendar is not connected');
  }

  const supabase = await createClient();
  const { data: userData, error: fetchError } = await supabase
    .from('users')
    .select('scheduling_preferences')
    .eq('id', userId)
    .single();

  if (fetchError) throw fetchError;

  const preferences =
    (userData.scheduling_preferences as Record<string, unknown> | null) || {};
  preferences.google_selected_calendars = selectedCalendarIds;

  const { error: updateError } = await supabase
    .from('users')
    .update({ scheduling_preferences: preferences as Json })
    .eq('id', userId);

  if (updateError) throw updateError;

  await persistGoogleCalendarSources(userId, account.id, selectedCalendarIds);
}

export async function syncGoogleCalendar(userId: string, force = false) {
  const supabase = await createClient();

  const { encryptedToken, accountId } = await resolveGoogleCalendarCredentials(userId);

  // Create sync run
  const { data: syncRun } = await supabase.from('integration_sync_runs').insert({
    user_id: userId,
    account_id: accountId,
    provider: 'google_calendar',
    status: 'running'
  }).select('id').single();

  const syncRunId = syncRun?.id;

  try {
    // 2. Get a fresh access token
    const decryptedToken = decryptToken(encryptedToken);
    const accessToken = await refreshGoogleToken(decryptedToken);

    const calendarsToSync = await resolveCalendarsToSync(userId, accountId, accessToken);

    const timeMin = new Date(
      Date.now() - GOOGLE_SYNC_PAST_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    const timeMax = new Date(
      Date.now() + GOOGLE_SYNC_FUTURE_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allEventsData: any[] = [];
    const fetchErrors: string[] = [];

    for (const calendarId of calendarsToSync) {
      try {
        const items = await fetchGoogleEventsForCalendar(
          accessToken,
          calendarId,
          timeMin,
          timeMax
        );
        const taggedItems = items.map((item) => ({
          ...item,
          _calendarId: calendarId,
        }));
        allEventsData = [...allEventsData, ...taggedItems];
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown fetch error';
        console.warn(message);
        fetchErrors.push(message);
      }
    }

    if (allEventsData.length === 0 && fetchErrors.length === calendarsToSync.length) {
      throw new Error(fetchErrors[0] || 'Failed to fetch Google Calendar events');
    }

    // 5. Transform to calendar_events format
    const rawEvents = allEventsData.map((item: Record<string, unknown>) => {
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
        is_ai_suggested: false,
        status: 'confirmed',
        metadata: { google_calendar_id: item._calendarId }
      };
    });

    const uniqueEventsMap = new Map();
    for (const ev of rawEvents) {
      if (ev.external_id) uniqueEventsMap.set(ev.external_id, ev);
    }
    const events = Array.from(uniqueEventsMap.values());

    if (events.length === 0) {
      const now = new Date().toISOString();
      await supabaseAdmin
        .from('integration_accounts')
        .update({ last_synced_at: now, status: 'connected', last_error: null })
        .eq('id', accountId)
        .eq('user_id', userId);
      await supabase
        .from('users')
        .update({ google_calendar_last_synced_at: now, google_calendar_connected: true })
        .eq('id', userId);
      if (syncRunId) {
        await supabase
          .from('integration_sync_runs')
          .update({ status: 'success', finished_at: now })
          .eq('id', syncRunId);
      }
      return 0;
    }

    // 6. Ghost Events Cleanup and Upsert
    if (force) {
      await supabase.from('calendar_events')
        .delete()
        .eq('user_id', userId)
        .eq('source', 'google_calendar')
        .gte('start_time', timeMin)
        .lte('start_time', timeMax);
    } else if (events.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentGoogleEventIds = events.map((e: any) => e.external_id);
      const { data: existingWindowEvents } = await supabase
        .from('calendar_events')
        .select('id, external_id')
        .eq('user_id', userId)
        .eq('source', 'google_calendar')
        .gte('start_time', timeMin)
        .lte('start_time', timeMax);
        
      if (existingWindowEvents) {
        const currentIdsSet = new Set(currentGoogleEventIds);
        const ghosts = existingWindowEvents.filter(e => !currentIdsSet.has(e.external_id));
        if (ghosts.length > 0) {
          const ghostIds = ghosts.map(g => g.id);
          for (let i = 0; i < ghostIds.length; i += 100) {
            const chunk = ghostIds.slice(i, i + 100);
            await supabase.from('calendar_events').update({ is_deleted: true }).in('id', chunk);
          }
        }
      }
    }

    let itemsCreated = 0;
    let itemsUpdated = 0;

    if (events.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const externalIds = events.map((e: any) => e.external_id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingEvents: any[] = [];
      for (let i = 0; i < externalIds.length; i += 100) {
        const chunk = externalIds.slice(i, i + 100);
        const { data } = await supabase
          .from('calendar_events')
          .select('id, external_id, source, metadata, start_time, end_time')
          .eq('user_id', userId)
          .in('external_id', chunk);
        if (data) existingEvents.push(...data);
      }

      const { data: pushedEvents } = await supabase
        .from('calendar_events')
        .select('id, external_id, source, metadata, start_time, end_time')
        .eq('user_id', userId)
        .not('metadata->>google_event_id', 'is', null);

      if (pushedEvents) {
        for (const p of pushedEvents) {
          if (!existingEvents.some(e => e.id === p.id)) {
            existingEvents.push(p);
          }
        }
      }

      const knownGoogleIds = new Map(
        existingEvents
          .filter(e => e.source === 'google_calendar' && e.external_id)
          .map(e => [e.external_id, e])
      );
      const canvasPushedEvents = new Map(
        existingEvents
          .filter(e => e.metadata?.google_event_id)
          .map(e => [e.metadata.google_event_id, e])
      );

      const toInsert = [];
      const toUpdateFull = [];
      const toUpdatePartial = [];

      for (const event of events) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extId = (event as any).external_id;
        if (canvasPushedEvents.has(extId)) {
          const existing = canvasPushedEvents.get(extId);
          if (existing.start_time !== event.start_time || existing.end_time !== event.end_time) {
            toUpdatePartial.push({
              id: existing.id,
              start_time: event.start_time,
              end_time: event.end_time
            });
            itemsUpdated++;
          }
        } else if (knownGoogleIds.has(extId)) {
          toUpdateFull.push({ ...event, id: knownGoogleIds.get(extId).id });
          itemsUpdated++;
        } else {
          toInsert.push(event);
          itemsCreated++;
        }
      }

      if (toInsert.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insertError } = await supabase.from('calendar_events').insert(toInsert as any);
        if (insertError) throw insertError;
      }

      if (toUpdateFull.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await supabase.from('calendar_events').upsert(toUpdateFull as any, { onConflict: 'id' });
        if (updateError) throw updateError;
      }

      if (toUpdatePartial.length > 0) {
        await Promise.all(toUpdatePartial.map(p => 
          supabase.from('calendar_events').update({ start_time: p.start_time, end_time: p.end_time }).eq('id', p.id)
        ));
      }
    }

    // Record successful sync
    const now = new Date().toISOString();
    await supabaseAdmin
      .from('integration_accounts')
      .update({ last_synced_at: now, status: 'connected', last_error: null })
      .eq('id', accountId)
      .eq('user_id', userId);
    await supabase
      .from('users')
      .update({ google_calendar_last_synced_at: now, google_calendar_connected: true })
      .eq('id', userId);
    if (syncRunId) {
      await supabase.from('integration_sync_runs').update({ 
        status: 'success', 
        finished_at: now,
        items_seen: events.length,
        items_created: itemsCreated,
        items_updated: itemsUpdated
      }).eq('id', syncRunId);
    }

    return events.length;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (syncRunId) {
      await supabase.from('integration_sync_runs').update({ 
        status: 'failed', 
        finished_at: new Date().toISOString(),
        error_message: message
      }).eq('id', syncRunId);
    }
    await supabaseAdmin.from('integration_accounts').update({ status: 'error', last_error: message }).eq('id', accountId).eq('user_id', userId);
    throw err;
  }
}

export async function disconnectGoogleCalendarAction(deleteData: boolean = false) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }
  const userId = user.id;
  
  if (deleteData) {
    await supabase.from('calendar_events').delete().eq('user_id', userId).eq('source', 'google_calendar');
    await supabase.from('source_items').delete().eq('user_id', userId).eq('provider', 'google_calendar');
  }
  // When deleteData is false, imported data stays visible but becomes stale (disconnected).
  // We only revoke credentials below — no soft-delete, no hiding.

  // Update integration_accounts
  await supabaseAdmin.from('integration_accounts')
    .update({ status: 'disconnected', refresh_token_encrypted: null })
    .eq('user_id', userId)
    .eq('provider', 'google_calendar');

  await supabase.from('users')
    .update({
      google_calendar_connected: false,
      google_calendar_id: null,
      google_calendar_last_synced_at: null,
    })
    .eq('id', userId);

  return { success: true };
}

export async function fetchGoogleCalendars(userId: string) {
  const supabase = await createClient();

  const { encryptedToken } = await resolveGoogleCalendarCredentials(userId);
  const account = await getIntegrationAccount(userId, 'google_calendar');

  const decryptedToken = decryptToken(encryptedToken);
  const accessToken = await refreshGoogleToken(decryptedToken);

  const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Google calendars');
  }

  const data = await response.json();
  
  let selectedIds: string[] = [];
  if (account) {
    const { data: sources } = await supabase.from('integration_sources').select('external_id').eq('account_id', account.id).eq('sync_enabled', true);
    if (sources && sources.length > 0) {
      selectedIds = sources.map(s => s.external_id);
    }
  }

  // Fallback to preferences if no sources found
  if (selectedIds.length === 0) {
    const { data: userPrefs } = await supabase.from('users').select('scheduling_preferences').eq('id', userId).single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prefs = userPrefs?.scheduling_preferences as Record<string, any> || {};
    selectedIds = prefs.google_selected_calendars || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calendars = data.items.map((cal: any) => ({
    id: cal.id,
    summary: cal.summaryOverride || cal.summary,
    colorId: cal.colorId,
    primary: !!cal.primary,
    selected: selectedIds.length > 0 ? selectedIds.includes(cal.id) : !!cal.primary,
  }));

  return calendars;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function pushEventToGoogle(userId: string, eventData: any) {
  // Gate: only push if user has explicitly granted write scope
  const canWrite = await hasGoogleWriteScope(userId);
  if (!canWrite) {
    return { success: false, error: 'Write scope not granted. Google Calendar is connected in read-only mode.' };
  }

  const supabase = await createClient();
  const { encryptedToken } = await resolveGoogleCalendarCredentials(userId);
  const account = await getIntegrationAccount(userId, 'google_calendar');
  if (!account) return;

  const decryptedToken = decryptToken(encryptedToken);
  const accessToken = await refreshGoogleToken(decryptedToken);

  const googleEventId = eventData.metadata?.google_event_id || (eventData.source === 'google_calendar' ? eventData.external_id : null);
  const isUpdate = !!googleEventId;
  
  let calendarId = eventData.metadata?.google_calendar_id;
  if (!calendarId && account) {
    const { data: sources } = await supabase.from('integration_sources').select('external_id').eq('account_id', account.id).eq('sync_enabled', true);
    if (sources && sources.length > 0) calendarId = sources[0].external_id;
  }
  if (!calendarId) calendarId = 'primary';
  
  const url = isUpdate 
    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`
    : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

  const method = isUpdate ? 'PUT' : 'POST';

  const body = {
    summary: eventData.title || eventData.description || 'Untitled Event',
    description: eventData.description,
    location: eventData.location,
    start: eventData.is_all_day ? { date: eventData.start_time.split('T')[0] } : { dateTime: eventData.start_time },
    end: eventData.is_all_day ? { date: eventData.end_time.split('T')[0] } : { dateTime: eventData.end_time },
  };

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to push event to Google Calendar', errorText);
    return { success: false, error: errorText };
  }

  const result = await response.json();
  
  if (!isUpdate && eventData.id) {
    const newMetadata = { ...(eventData.metadata || {}), google_event_id: result.id };
    await supabase.from('calendar_events').update({
      metadata: newMetadata
    }).eq('id', eventData.id);
  }

  return { success: true, googleEventId: result.id };
}

export async function deleteEventFromGoogle(userId: string, externalId: string, calendarId?: string) {
  // Gate: only delete from Google if user has explicitly granted write scope
  const canWrite = await hasGoogleWriteScope(userId);
  if (!canWrite) {
    return { success: false, error: 'Write scope not granted. Google Calendar is connected in read-only mode.' };
  }

  const supabase = await createClient();
  const { encryptedToken } = await resolveGoogleCalendarCredentials(userId);
  const account = await getIntegrationAccount(userId, 'google_calendar');
  if (!account) return;

  const decryptedToken = decryptToken(encryptedToken);
  const accessToken = await refreshGoogleToken(decryptedToken);

  let calId = calendarId;
  if (!calId && account) {
    const { data: sources } = await supabase.from('integration_sources').select('external_id').eq('account_id', account.id).eq('sync_enabled', true);
    if (sources && sources.length > 0) calId = sources[0].external_id;
  }
  if (!calId) calId = 'primary';
  
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${externalId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok && response.status !== 410 && response.status !== 404) {
    const errorText = await response.text();
    console.error('Failed to delete event from Google Calendar', errorText);
    return { success: false, error: errorText };
  }

  return { success: true };
}
