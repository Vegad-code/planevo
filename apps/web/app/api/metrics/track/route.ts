import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';

/**
 * POST /api/metrics/track
 *
 * Tracks user accomplishments in the daily_user_metrics table.
 *
 * Body:
 *   - type: 'focus_time' | 'task_completed' | 'task_planned'
 *   - value: number (seconds for focus_time, count for others)
 *   - date?: string (ISO date, defaults to today)
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAllowedOriginOrBearer(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const auth = await createAuthenticatedSupabaseClient(request);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { supabase, user } = auth;

    const body = await request.json();
    const { type, value, date } = body;

    if (!type || typeof value !== 'number') {
      return NextResponse.json({ error: 'Invalid request. Requires type and value.' }, { status: 400 });
    }

    const validTypes = ['focus_time', 'task_completed', 'task_planned'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    const columnMap: Record<string, string> = {
      focus_time: 'focus_time_seconds',
      task_completed: 'tasks_completed',
      task_planned: 'tasks_planned',
    };
    const column = columnMap[type];

    const insertRow: Record<string, unknown> = {
      user_id: user.id,
      date: targetDate,
      focus_time_seconds: 0,
      tasks_completed: 0,
      tasks_planned: 0,
      [column]: Math.max(0, value),
    };

    const { data: existing } = await supabase
      .from('daily_user_metrics')
      .select('id, focus_time_seconds, tasks_completed, tasks_planned')
      .eq('user_id', user.id)
      .eq('date', targetDate)
      .maybeSingle();

    if (existing) {
      const newValue = Math.max(0, (existing[column as keyof typeof existing] as number) + value);
      const updatePayload = { [column]: newValue, updated_at: new Date().toISOString() };
      const { error } = await supabase
        .from('daily_user_metrics')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(updatePayload as any)
        .eq('id', existing.id);

      if (error) {
        console.error('Metrics update error:', error);
        return NextResponse.json({ error: 'Failed to update metrics' }, { status: 500 });
      }
    } else {
      const { error } = await supabase
        .from('daily_user_metrics')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(insertRow as any);

      if (error) {
        console.error('Metrics insert error:', error);
        return NextResponse.json({ error: 'Failed to insert metrics' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Metrics tracking error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * GET /api/metrics/track
 *
 * Fetches the user's metrics for the last 7 days.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await createAuthenticatedSupabaseClient(request);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { supabase, user } = auth;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const { data: metrics, error } = await supabase
      .from('daily_user_metrics')
      .select('date, focus_time_seconds, tasks_completed, tasks_planned')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgoStr)
      .order('date', { ascending: false });

    if (error) {
      console.error('Metrics fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
    }

    return NextResponse.json({ metrics: metrics || [] });
  } catch (error) {
    console.error('Metrics fetch error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
