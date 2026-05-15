'use server';

import { CanvasAssignment } from './api';

/**
 * Server-side proxy for Canvas API calls to avoid CORS issues.
 */
export async function testCanvasConnectionAction(url: string, token: string): Promise<boolean> {
  try {
    const cleanUrl = url.trim().replace(/\/$/, '');
    const response = await fetch(`${cleanUrl}/api/v1/users/self`, {
      headers: {
        'Authorization': `Bearer ${token.trim()}`
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
    const cleanUrl = url.trim().replace(/\/$/, '');
    const cleanToken = token.trim();
    
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
    const cleanUrl = url.trim().replace(/\/$/, '');
    const response = await fetch(`${cleanUrl}/api/v1/users/self/todo`, {
      headers: {
        'Authorization': `Bearer ${token.trim()}`
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
