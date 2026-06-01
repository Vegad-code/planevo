'use server';

import { createClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/crypto';

/**
 * Check whether the user's Google Calendar integration has write scope.
 * Write-back (pushing/deleting events to Google) requires an explicit
 * scope upgrade beyond calendar.readonly. Until the user grants that,
 * all write operations must be silently skipped.
 */
export async function hasGoogleWriteScope(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: account } = await supabase
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

export async function syncGoogleCalendar(userId: string, force = false) {
  const supabase = await createClient();

  // 1. Get the account and refresh token
  const { data: account } = await supabase
    .from('integration_accounts')
    .select('id, refresh_token_encrypted, metadata')
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .maybeSingle();

  let encryptedToken = account?.refresh_token_encrypted;
  let accountId = account?.id;
  
  if (!encryptedToken) {
    // Fallback to legacy
    const { data: user } = await supabase
      .from('users')
      .select('google_calendar_refresh_token, scheduling_preferences, google_calendar_id')
      .eq('id', userId)
      .single();
      
    if (!user?.google_calendar_refresh_token) {
      throw new Error('User not connected to Google Calendar');
    }
    encryptedToken = user.google_calendar_refresh_token;
    
    // Backfill account
    const { data: newAcc } = await supabase.from('integration_accounts').insert({
      user_id: userId,
      provider: 'google_calendar',
      refresh_token_encrypted: encryptedToken,
      status: 'connected'
    }).select('id').single();
    if (newAcc) accountId = newAcc.id;
  }

  if (!encryptedToken || !accountId) throw new Error('Account unresolvable');

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

    // 3. Determine which calendars to sync
    const { data: sources } = await supabase
      .from('integration_sources')
      .select('external_id')
      .eq('account_id', accountId)
      .eq('source_type', 'calendar')
      .eq('sync_enabled', true);

    let calendarsToSync: string[] = sources?.map(s => s.external_id) || [];

    if (calendarsToSync.length === 0) {
      // Fallback to legacy preferences
      const { data: userPrefs } = await supabase.from('users').select('scheduling_preferences, google_calendar_id').eq('id', userId).single();
      const prefs = userPrefs?.scheduling_preferences as Record<string, any> || {};
      calendarsToSync = prefs.google_selected_calendars || [];
      if (calendarsToSync.length === 0) {
        calendarsToSync = [userPrefs?.google_calendar_id || 'primary'];
      }
      
      // Backfill sources
      const sourcesToInsert = calendarsToSync.map(id => ({
        account_id: accountId,
        user_id: userId,
        source_type: 'calendar',
        external_id: id,
        name: id === 'primary' ? 'Primary Calendar' : 'Google Calendar',
        sync_enabled: true
      }));
      await supabase.from('integration_sources').insert(sourcesToInsert).select('id');
    }

    // 4. Fetch events (last 30 days to next 60 days) for each selected calendar
    const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    
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
        metadata: { google_calendar_id: item._calendarId }
      };
    });

    const uniqueEventsMap = new Map();
    for (const ev of rawEvents) {
      if (ev.external_id) uniqueEventsMap.set(ev.external_id, ev);
    }
    const events = Array.from(uniqueEventsMap.values());

    if (events.length === 0) {
      await supabase.from('integration_accounts').update({ last_synced_at: new Date().toISOString() }).eq('id', accountId);
      if (syncRunId) await supabase.from('integration_sync_runs').update({ status: 'success', finished_at: new Date().toISOString() }).eq('id', syncRunId);
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
      const externalIds = events.map((e: any) => e.external_id);
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
        const { error: insertError } = await supabase.from('calendar_events').insert(toInsert as any);
        if (insertError) throw insertError;
      }

      if (toUpdateFull.length > 0) {
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
    await supabase.from('integration_accounts').update({ last_synced_at: now, status: 'connected', last_error: null }).eq('id', accountId);
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
  } catch (err: any) {
    if (syncRunId) {
      await supabase.from('integration_sync_runs').update({ 
        status: 'failed', 
        finished_at: new Date().toISOString(),
        error_message: err.message
      }).eq('id', syncRunId);
    }
    await supabase.from('integration_accounts').update({ status: 'error', last_error: err.message }).eq('id', accountId);
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
  await supabase.from('integration_accounts')
    .update({ status: 'disconnected', refresh_token_encrypted: null })
    .eq('user_id', userId)
    .eq('provider', 'google_calendar');

  // Clear legacy state
  await supabase.from('users')
    .update({ 
      google_calendar_connected: false,
      google_calendar_refresh_token: null,
      google_calendar_id: null,
      google_calendar_last_synced_at: null
    })
    .eq('id', userId);

  return { success: true };
}

export async function fetchGoogleCalendars(userId: string) {
  const supabase = await createClient();

  const { data: account } = await supabase
    .from('integration_accounts')
    .select('id, refresh_token_encrypted')
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .maybeSingle();

  let encryptedToken = account?.refresh_token_encrypted;
  
  if (!encryptedToken) {
    const { data: user } = await supabase.from('users').select('google_calendar_refresh_token').eq('id', userId).single();
    if (!user?.google_calendar_refresh_token) throw new Error('User not connected to Google Calendar');
    encryptedToken = user.google_calendar_refresh_token;
  }

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
    const prefs = userPrefs?.scheduling_preferences as Record<string, any> || {};
    selectedIds = prefs.google_selected_calendars || [];
  }

  const calendars = data.items.map((cal: any) => ({
    id: cal.id,
    summary: cal.summaryOverride || cal.summary,
    colorId: cal.colorId,
    primary: !!cal.primary,
    selected: selectedIds.length > 0 ? selectedIds.includes(cal.id) : !!cal.primary,
  }));

  return calendars;
}

export async function pushEventToGoogle(userId: string, eventData: any) {
  // Gate: only push if user has explicitly granted write scope
  const canWrite = await hasGoogleWriteScope(userId);
  if (!canWrite) {
    return { success: false, error: 'Write scope not granted. Google Calendar is connected in read-only mode.' };
  }

  const supabase = await createClient();
  const { data: account } = await supabase
    .from('integration_accounts')
    .select('id, refresh_token_encrypted')
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .maybeSingle();

  let encryptedToken = account?.refresh_token_encrypted;
  if (!encryptedToken) {
    const { data: user } = await supabase.from('users').select('google_calendar_refresh_token').eq('id', userId).single();
    if (!user?.google_calendar_refresh_token) return; // Silently fail if not connected
    encryptedToken = user.google_calendar_refresh_token;
  }

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
  const { data: account } = await supabase
    .from('integration_accounts')
    .select('id, refresh_token_encrypted')
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .maybeSingle();

  let encryptedToken = account?.refresh_token_encrypted;
  if (!encryptedToken) {
    const { data: user } = await supabase.from('users').select('google_calendar_refresh_token').eq('id', userId).single();
    if (!user?.google_calendar_refresh_token) return;
    encryptedToken = user.google_calendar_refresh_token;
  }

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
