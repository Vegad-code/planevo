/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { CanvasAssignment } from './api';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { encryptToken, decryptToken } from '@/lib/crypto';
import { getIntegrationAccount, upsertIntegrationAccount } from '@/lib/integrations/accounts';
import { resilientFetch } from '@/lib/http/resilient-fetch';
import { evaluatePostSyncNotifications } from '@/lib/notifications/post-sync-notify';

/**
 * Server-side proxy for Canvas API calls to avoid CORS issues.
 */
export async function testCanvasConnectionAction(url: string, token: string): Promise<boolean> {
  try {
    let cleanToken = '';
    if (token && token.startsWith('••••')) {
      const { success, data } = await getCanvasCredentialsAction(true); // pass true to get unmasked token
      if (success && data?.canvasToken) {
        cleanToken = data.canvasToken.trim();
      } else {
        return false;
      }
    } else {
      cleanToken = decryptToken(token).trim();
    }
    
    const cleanUrl = url.trim().replace(/\/$/, '');
    const response = await resilientFetch(`${cleanUrl}/api/v1/users/self`, {
      headers: {
        'Authorization': `Bearer ${cleanToken}`
      },
      cache: 'no-store'
    });
    return response.ok;
  } catch (error) {
    console.error('Canvas connection test failed (Server):', error);
    return false;
  }
}

export async function fetchCanvasUpcomingAction(url: string, token: string): Promise<CanvasAssignment[]> {
  try {
    const decryptedToken = decryptToken(token);
    const cleanUrl = url.trim().replace(/\/$/, '');
    const cleanToken = decryptedToken.trim();
    
    // Step 1: Get active courses from the user's dashboard cards
    // This is CRITICAL because the standard /courses endpoint returns Section IDs 
    // for cross-listed courses, which causes assignment fetches to return empty arrays.
    // The dashboard_cards endpoint contains the true Master Course ID in the assetString.
    const coursesRes = await fetch(`${cleanUrl}/api/v1/dashboard/dashboard_cards`, { 
      headers: { 'Authorization': `Bearer ${cleanToken}` }, 
      cache: 'no-store' 
    });
    
    let contextCodes: string[] = [];
    if (coursesRes.ok) {
      const cards = await coursesRes.json() as Array<{ assetString?: string }>;
      // Extract the true course ID from the assetString (e.g. "course_179010000001161785")
      contextCodes = cards.filter((c) => c.assetString?.startsWith('course_')).map((c) => c.assetString as string);
    }

    if (contextCodes.length === 0) {
      return [];
    }

    // Step 2: Fetch events and assignments for those specific courses with per_page=100
    // We add user_xyz as a context code just in case there are personal calendar events
    let contextQuery = contextCodes.map(c => `context_codes[]=${c}`).join('&');
    if (contextQuery) contextQuery = '&' + contextQuery;

    // Use a date range of -1 month to +3 months from today to ensure we don't hit pagination limits on old data
    const today = new Date();
    const startDate = new Date(today.setMonth(today.getMonth() - 1)).toISOString();
    const endDate = new Date(today.setMonth(today.getMonth() + 4)).toISOString(); // +4 because we subtracted 1

    // Aggressively fetch multiple pages to bypass strict 10-item server limits
    // Consolidate fetching to prevent network congestion (reducing 14 parallel requests to 6 critical ones)
    const fetchPage = async (url: string, page: number) => {
      try {
        const res = await fetch(`${url}&page=${page}`, { 
          headers: { 'Authorization': `Bearer ${cleanToken}` }, 
          cache: 'no-store',
          signal: AbortSignal.timeout(15000) // 15s timeout
        });
        return res.ok ? await res.json() : [];
      } catch (e) {
        console.error(`Canvas Page ${page} failed:`, e);
        return [];
      }
    };

    const results = await Promise.allSettled([
      // 1-3. Core Calendar & Assignments
      fetchPage(`${cleanUrl}/api/v1/calendar_events?type=assignment&per_page=100&start_date=${startDate}&end_date=${endDate}${contextQuery}`, 1),
      fetchPage(`${cleanUrl}/api/v1/calendar_events?type=event&per_page=100&start_date=${startDate}&end_date=${endDate}${contextQuery}`, 1),
      
      // 4. Planner Items (Rich data)
      fetchPage(`${cleanUrl}/api/v1/planner/items?per_page=100&start_date=${startDate}&end_date=${endDate}`, 1),
      
      // 5-6. System Backups
      fetch(`${cleanUrl}/api/v1/users/self/todo`, { headers: { 'Authorization': `Bearer ${cleanToken}` }, cache: 'no-store', signal: AbortSignal.timeout(10000) }).then(r => r.ok ? r.json() : []),
      fetch(`${cleanUrl}/api/v1/users/self/upcoming_events`, { headers: { 'Authorization': `Bearer ${cleanToken}` }, cache: 'no-store', signal: AbortSignal.timeout(10000) }).then(r => r.ok ? r.json() : [])
    ]);
    
    const allAssignments = results[0].status === 'fulfilled' ? results[0].value : [];
    const allEvents = results[1].status === 'fulfilled' ? results[1].value : [];
    const allPlannerItems = results[2].status === 'fulfilled' ? results[2].value : [];
    const todoData = results[3].status === 'fulfilled' ? results[3].value : [];
    const upcomingData = results[4].status === 'fulfilled' ? results[4].value : [];
    
    const todos = Array.isArray(todoData) ? todoData.map((t: Record<string, unknown>) => (t.assignment || t.quiz || t) as Record<string, unknown>) : [];
    const upcoming = Array.isArray(upcomingData) ? upcomingData.map((u: Record<string, unknown>) => (u.assignment || u) as Record<string, unknown>) : [];

    let combinedItems: Record<string, unknown>[] = [...allAssignments, ...allEvents, ...todos, ...upcoming] as Record<string, unknown>[];
    
    if (Array.isArray(allPlannerItems)) {
      const unwrapped = allPlannerItems.map((p: Record<string, unknown>) => ({
        ...(p.plannable as Record<string, unknown>),
        context_name: p.context_name,
        html_url: p.html_url,
        plannable_type: p.plannable_type
      }));
      combinedItems = [...combinedItems, ...unwrapped] as Record<string, unknown>[];
    }

    // Deduplicate by ID
    const uniqueItemsMap = new Map();
    for (const item of combinedItems) {
      const target = (item.assignment || item) as any;
      if (target && target.id) {
        uniqueItemsMap.set(target.id, target);
      }
    }
    const uniqueItems = Array.from(uniqueItemsMap.values());
    
    // Filter out irrelevant staff events from the school district
    const clutterKeywords = ['support professionals', 'administrators', 'licensed employees', 'staff development day - no school'];
    const filteredItems = uniqueItems.filter((target: any) => {
      const title = (target.title || target.name || '').toLowerCase();
      // Always keep events explicitly meant for students
      if (title.includes('no school students')) return true;
      if (title.includes('staff development day - no school')) {
        // Many schools use this generic title, we should probably keep it if it implies no school
        return true; 
      }
      
      // Filter out admin/staff internal events
      if (clutterKeywords.some(kw => title.includes(kw)) && !title.includes('no school')) return false;
      
      return true;
    });
    
    // Map them to our standard format and categorize
    const mappedItems = filteredItems.map((target: any) => {
      let itemType: 'assignment' | 'milestone' | 'event' = 'event';
      const title = (target.title || target.name || '').toLowerCase();
      
      // If it has submission types or points, or is explicitly an assignment/quiz, it's actual class work
      if (
        target.submission_types || 
        target.points_possible !== undefined || 
        target.plannable_type === 'assignment' || 
        target.plannable_type === 'quiz' ||
        target.type === 'assignment' ||
        title.includes('assignment') ||
        title.includes('homework') ||
        title.includes('quiz') ||
        title.includes('exam')
      ) {
        itemType = 'assignment';
      } 
      // If it's a district-level account event or mentions specific milestone words
      else if (
        target.context_type === 'Account' || 
        target.context_name?.includes('School District') ||
        title.includes('end of') || 
        title.includes('semester') ||
        title.includes('break') ||
        title.includes('closed') ||
        title.includes('no school') ||
        title.includes('holiday')
      ) {
        itemType = 'milestone'; 
      }
      // If it doesn't fit the above, it's a standard event (e.g. a class meeting)
      else {
        itemType = 'event';
      }
      
      return {
        id: target.id,
        name: target.title || target.name || 'Untitled Event',
        description: target.description || '',
        due_at: target.start_at || target.due_at || target.end_at || new Date().toISOString(),
        course_id: target.course_id || target.context_code || 'Account',
        html_url: target.html_url || target.url || '',
        type: itemType,
        context_type: target.context_type || 'Course'
      };
    });

    const now = new Date().getTime();
    // We give a 24-hour grace period so things due at midnight don't instantly vanish 
    const cutoffTime = now - (24 * 60 * 60 * 1000);

    return mappedItems.filter((item) => {
      // Hide assignments and regular events that are in the past
      if (item.type === 'assignment' || item.type === 'event') {
        const itemTime = new Date(item.due_at).getTime();
        if (itemTime < cutoffTime) {
          return false;
        }
      }
      // We keep milestones regardless because they are useful for the academic calendar
      return true;
    });
  } catch (error) {
    console.error('Error fetching Canvas assignments (Server):', error);
    return [];
  }
}

export async function fetchCanvasTodoAction(url: string, token: string): Promise<CanvasAssignment[]> {
  try {
    const decryptedToken = decryptToken(token);
    const cleanUrl = url.trim().replace(/\/$/, '');
    const response = await fetch(`${cleanUrl}/api/v1/users/self/todo`, {
      headers: {
        'Authorization': `Bearer ${decryptedToken.trim()}`
      },
      cache: 'no-store'
    });
    
    if (!response.ok) throw new Error('Failed to fetch todo items');
    const items = await response.json();
    
    return items.map((i: Record<string, unknown>) => {
      const target = (i.assignment || i) as Record<string, unknown>;
      return {
        id: target.id,
        name: target.title || target.name,
        description: target.description || '',
        due_at: target.due_at || target.start_at,
        course_id: target.course_id,
        html_url: target.html_url || target.url
      };
    });
  } catch (error) {
    console.error('Error fetching Canvas todo (Server):', error);
    return [];
  }
}

export async function saveCanvasCredentialsAction(url: string, token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const encryptedToken = (token && !token.startsWith('••••')) ? encryptToken(token) : undefined;

    await upsertIntegrationAccount({
      userId: user.id,
      provider: 'canvas',
      accessTokenEncrypted: token === '' ? null : encryptedToken ?? undefined,
      metadata: { canvas_url: url },
      status: token === '' ? 'disconnected' : 'connected',
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error saving Canvas credentials:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

export async function saveOnboardingProgressAction(data: {
  name?: string;
  profileType?: string;
  energyPreference?: string;
  googleCalendarConnected?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data: existingProfile } = await supabase
      .from('users')
      .select('scheduling_preferences')
      .eq('id', user.id)
      .maybeSingle();

    const existingPreferences =
      existingProfile?.scheduling_preferences &&
      typeof existingProfile.scheduling_preferences === 'object' &&
      !Array.isArray(existingProfile.scheduling_preferences)
        ? existingProfile.scheduling_preferences as Record<string, unknown>
        : {};

    const updates: Record<string, unknown> = {};
    if (data.name) updates.name = data.name;
    if (data.energyPreference) updates.energy_preference = data.energyPreference;
    
    // Merge new scheduling_preferences
    const newPrefs = { ...existingPreferences };
    if (data.profileType) newPrefs.onboarding_profile_type = data.profileType;
    if (data.energyPreference) newPrefs.preferred_focus_time = data.energyPreference;
    
    if (!newPrefs.onboarding_sources) {
      newPrefs.onboarding_sources = {};
    }
    if (data.googleCalendarConnected !== undefined) {
      (newPrefs.onboarding_sources as any).google_calendar = data.googleCalendarConnected;
    }

    updates.scheduling_preferences = newPrefs;

    const { error } = await supabase
      .from('users')
      .update(updates as any)
      .eq('id', user.id);

    if (error) {
      console.error('Failed to save onboarding progress:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error saving onboarding progress:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}


export async function saveOnboardingDataAction(data: {
  name: string;
  energyPreference: string;
  canvasUrl: string;
  canvasToken: string;
  identityChecks: Record<number, boolean>;
  profileType?: string;
  calendarSkipped?: boolean;
  googleCalendarConnected?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: userError?.message || 'Unauthorized - saveOnboardingDataAction' };
    }

    const activeChecks = Object.keys(data.identityChecks)
      .filter((k: any) => data.identityChecks[k])
      .map(k => parseInt(k, 10));

    const encryptedToken = data.canvasToken ? encryptToken(data.canvasToken) : null;

    const { data: existingProfile } = await supabase
      .from('users')
      .select('scheduling_preferences')
      .eq('id', user.id)
      .maybeSingle();

    const existingPreferences =
      existingProfile?.scheduling_preferences &&
      typeof existingProfile.scheduling_preferences === 'object' &&
      !Array.isArray(existingProfile.scheduling_preferences)
        ? existingProfile.scheduling_preferences as Record<string, unknown>
        : {};

    const updates: Record<string, unknown> = {
      name: data.name || 'Pilot',
      energy_preference: data.energyPreference || 'morning',
      scheduling_preferences: {
        ...existingPreferences,
        preferred_focus_time: data.energyPreference || 'morning',
        identity_checks: activeChecks,
        onboarding_profile_type: data.profileType || 'student',
        onboarding_sources: {
          canvas: Boolean(data.canvasUrl && data.canvasToken),
          google_calendar: Boolean(data.googleCalendarConnected),
          skipped_canvas: !data.canvasUrl || !data.canvasToken,
          skipped_calendar: Boolean(data.calendarSkipped && !data.googleCalendarConnected),
        },
      },
    };

    if (data.canvasUrl && encryptedToken) {
      await upsertIntegrationAccount({
        userId: user.id,
        provider: 'canvas',
        accessTokenEncrypted: encryptedToken,
        metadata: { canvas_url: data.canvasUrl },
        status: 'connected',
      });
    }

    const { error } = await supabase
      .from('users')
      .update(updates as any)
      .eq('id', user.id);

    if (error) {
      console.error('Failed to save onboarding data:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error saving onboarding data:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

export async function completeFreeOnboardingAction() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: userError?.message || 'Unauthorized - completeFreeOnboardingAction' };
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update({
        onboarding_complete: true,
        plan_type: 'free',
      })
      .eq('id', user.id);

    if (error) {
      console.error('Failed to complete free onboarding:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error completing free onboarding:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

export async function getCanvasCredentialsAction(returnUnmasked = false): Promise<{ success: boolean; data?: { canvasUrl: string; canvasToken: string }; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const account = await getIntegrationAccount(user.id, 'canvas');

    const encryptedToken = account?.access_token_encrypted ?? '';
    const canvasUrl = (account?.metadata as { canvas_url?: string } | null)?.canvas_url ?? '';

    const decryptedToken = encryptedToken
      ? decryptToken(encryptedToken)
      : '';
    let displayToken = decryptedToken;
    
    if (!returnUnmasked && decryptedToken) {
      displayToken = decryptedToken.length > 4 ? `••••${decryptedToken.slice(-4)}` : '••••';
    }

    return {
      success: true,
      data: {
        canvasUrl,
        canvasToken: displayToken
      }
    };
  } catch (err: any) {
    console.error('Error getting Canvas credentials:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

export async function disconnectCanvasAction(deleteData: boolean = false): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    if (deleteData) {
      // Hard delete imported items from canvas
      await supabase.from('calendar_events').delete().eq('user_id', user.id).eq('source', 'canvas');
      await (supabase.from('source_items') as any).delete().eq('user_id', user.id).eq('provider', 'canvas');
      await (supabase.from('canvas_assignments') as any).delete().eq('user_id', user.id);
    }
    // When deleteData is false, imported data stays visible but becomes stale (disconnected).
    // We only revoke credentials below — no soft-delete, no hiding.

    // Update integration_accounts
    await (supabaseAdmin.from('integration_accounts') as any)
      .update({
        status: 'disconnected',
        access_token_encrypted: null
      })
      .eq('user_id', user.id)
      .eq('provider', 'canvas');

    return { success: true };
  } catch (err: any) {
    console.error('Error disconnecting Canvas:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function syncCanvasIntegrationAction(force = false): Promise<number> {
  const supabase = await createClient();

  // Derive userId from authenticated session — never trust client-provided userId
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }
  const userId = user.id;

  const account = await getIntegrationAccount(userId, 'canvas');
  const encryptedToken = account?.access_token_encrypted;
  const canvasUrl = (account?.metadata as { canvas_url?: string } | null)?.canvas_url;
  const accountId = account?.id;

  if (!encryptedToken || !canvasUrl || !accountId) {
    throw new Error('User not connected to Canvas');
  }

  const { data: syncRun } = await supabase.from('integration_sync_runs').insert({
    user_id: userId,
    account_id: accountId,
    provider: 'canvas',
    status: 'running'
  }).select('id').single();

  const syncRunId = syncRun?.id;

  try {
    let upcoming = await fetchCanvasUpcomingAction(canvasUrl, encryptedToken);
    if (upcoming.length === 0) {
      upcoming = await fetchCanvasTodoAction(canvasUrl, encryptedToken);
    }
    
    const assignmentsOnly = upcoming.filter(item => item.type === 'assignment');
    const eventsOnly = upcoming.filter(item => item.type === 'event');
    const milestonesOnly = upcoming.filter(item => item.type === 'milestone');

    let itemsCreated = 0;
    const itemsUpdated = 0;

    // We will save courses (context_codes) as sources
    const courseIds = new Set<string>();
    upcoming.forEach(item => {
      if (item.course_id) courseIds.add(String(item.course_id));
    });

    if (courseIds.size > 0) {
      const sourcesToUpsert = Array.from(courseIds).map(cid => ({
        account_id: accountId,
        user_id: userId,
        source_type: 'course',
        external_id: cid,
        name: `Canvas Course ${cid}`,
        sync_enabled: true
      }));
      await supabase.from('integration_sources').upsert(sourcesToUpsert, { onConflict: 'account_id,external_id' });
    }

    const { data: dbSources } = await supabase.from('integration_sources')
      .select('id, external_id')
      .eq('account_id', accountId)
      .in('external_id', Array.from(courseIds));
      
    const sourceMap = new Map<string, string>();
    if (dbSources) {
      dbSources.forEach(s => sourceMap.set(s.external_id, s.id));
    }

    // 1. Upsert Assignments into source_items
    if (assignmentsOnly.length > 0) {
      const toUpsertAssignments = assignmentsOnly.map(a => {
        const sourceId = a.course_id ? sourceMap.get(String(a.course_id)) : null;
        return {
          user_id: userId,
          provider: 'canvas',
          source_id: sourceId,
          external_id: String(a.id),
          item_type: 'assignment',
          title: a.name,
          description: a.description || null,
          due_date: a.due_at || null,
          url: a.html_url || null,
          raw_data: a as any
        };
      });
      const { error } = await supabase.from('source_items').upsert(toUpsertAssignments, { onConflict: 'user_id,provider,external_id' });
      if (error) throw error;
      itemsCreated += toUpsertAssignments.length; // rough estimate
    }

    // 2. Upsert Events & Milestones into calendar_events
    const allEvents = [...eventsOnly, ...milestonesOnly];
    if (allEvents.length > 0) {
      const toUpsertEvents = allEvents.map(e => ({
        external_id: String(e.id),
        user_id: userId,
        title: e.name,
        start_time: e.due_at, // In Canvas, events use start_at mapped to due_at in our action
        end_time: new Date(new Date(e.due_at).getTime() + 60 * 60 * 1000).toISOString(), // Default 1hr
        source: 'canvas',
        is_deleted: false,
        description: e.description || `Canvas Course: ${e.course_id}`,
        metadata: { canvas_course_id: e.course_id, html_url: e.html_url }
      }));
      const { error } = await supabase.from('calendar_events').upsert(toUpsertEvents, {
        onConflict: 'user_id,source,external_id',
      });
      if (error) throw error;
      itemsCreated += toUpsertEvents.length;
    }

    const now = new Date().toISOString();
    await supabaseAdmin.from('integration_accounts').update({ last_synced_at: now, status: 'connected', last_error: null }).eq('id', accountId).eq('user_id', userId);
    if (syncRunId) {
      await supabase.from('integration_sync_runs').update({ 
        status: 'success', 
        finished_at: now,
        items_seen: upcoming.length,
        items_created: itemsCreated,
        items_updated: itemsUpdated
      }).eq('id', syncRunId);
    }

    const assignmentCount = assignmentsOnly.length;
    if (assignmentCount > 0) {
      await evaluatePostSyncNotifications(supabaseAdmin, userId, 'canvas', assignmentCount);
    }

    return upcoming.length;
  } catch (err: any) {
    if (syncRunId) {
      await supabase.from('integration_sync_runs').update({ 
        status: 'failed', 
        finished_at: new Date().toISOString(),
        error_message: err.message
      }).eq('id', syncRunId);
    }
    await supabaseAdmin.from('integration_accounts').update({ status: 'error', last_error: err.message }).eq('id', accountId).eq('user_id', userId);
    throw err;
  }
}
