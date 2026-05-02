import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/auth/rateLimit';

/**
 * Academic Search API
 * 
 * Searches across the user's tasks, goals, and (if Canvas is connected)
 * synced assignments. Returns ranked results. Uses one AI quota unit
 * when the query is non-trivial.
 */

export async function POST(request: NextRequest) {
  try {
    const { allowed, error: limitError, message } = await checkRateLimit('academic-search');

    if (!allowed) {
      return NextResponse.json(
        { error: limitError, message: message || 'Search limit reached.' },
        { status: limitError === 'Unauthorized' ? 401 : 403 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const query = (body.query || '').trim().toLowerCase();

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [], message: 'Query too short.' });
    }

    // Search tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, completed')
      .eq('user_id', user.id)
      .ilike('title', `%${query}%`)
      .limit(10);

    // Search goals
    const { data: goals } = await supabase
      .from('goals')
      .select('id, title, status')
      .eq('user_id', user.id)
      .ilike('title', `%${query}%`)
      .limit(5);

    // Search Canvas assignments (if synced)
    const { data: assignments } = await supabase
      .from('canvas_assignments')
      .select('id, name, due_at, course_name, points_possible')
      .eq('user_id', user.id)
      .or(`name.ilike.%${query}%,course_name.ilike.%${query}%`)
      .limit(10);

    // Special case: if user searches for "Canvas", show all recent assignments
    if (query === 'canvas' && assignments?.length === 0) {
      const { data: allCanvas } = await supabase
        .from('canvas_assignments')
        .select('id, name, due_at, course_name, points_possible')
        .eq('user_id', user.id)
        .order('due_at', { ascending: true })
        .limit(10);
      
      if (allCanvas) {
        assignments?.push(...allCanvas);
      }
    }

    const results = [
      ...(tasks || []).map(t => ({
        type: 'task' as const,
        id: t.id,
        title: t.title,
        subtitle: `${t.priority} priority · ${t.completed ? 'Done' : t.status}`,
        due: t.due_date,
        href: '/dashboard/tasks',
      })),
      ...(goals || []).map(g => ({
        type: 'goal' as const,
        id: g.id,
        title: g.title,
        subtitle: `Goal · ${g.status}`,
        due: null,
        href: '/dashboard/goals',
      })),
      ...(assignments || []).map(a => ({
        type: 'assignment' as const,
        id: a.id,
        title: a.name,
        subtitle: `${a.course_name || 'Canvas'} · ${a.points_possible ? a.points_possible + ' pts' : ''}`,
        due: a.due_at,
        href: '/dashboard/briefing',
      })),
    ];

    return NextResponse.json({ results, count: results.length });
  } catch (error) {
    console.error('Academic search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
