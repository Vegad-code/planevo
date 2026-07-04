import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { metricsTrackBodySchema } from '@/lib/api/schemas';

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

    const body = await request.json().catch(() => null);
    const parsed = metricsTrackBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request. Requires type and value.' }, { status: 400 });
    }

    const { type, value, date } = parsed.data;

    const targetDate = date || new Date().toISOString().split('T')[0];

    const columnMap: Record<string, string> = {
      focus_time: 'focus_time_seconds',
      task_completed: 'tasks_completed',
      task_planned: 'tasks_planned',
    };
    const column = columnMap[type];

    // RPC added in migration 20260702120100 — regenerate database types after db push
    const { error } = await (supabase as { rpc: (fn: string, args: Record<string, unknown>) => ReturnType<typeof supabase.rpc> }).rpc(
      'increment_daily_user_metric',
      {
        p_user_id: user.id,
        p_date: targetDate,
        p_column: column,
        p_delta: Math.max(0, value),
      }
    );

    if (error) {
      console.error('Metrics increment error:', error);
      return NextResponse.json({ error: 'Failed to update metrics' }, { status: 500 });
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
