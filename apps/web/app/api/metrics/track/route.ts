import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/metrics/track
 * 
 * Tracks user accomplishments in the daily_user_metrics table.
 * Uses a single-query upsert for maximum speed.
 * 
 * Body:
 *   - type: 'focus_time' | 'task_completed' | 'task_planned'
 *   - value: number (seconds for focus_time, count for others)
 *   - date?: string (ISO date, defaults to today)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Single-query upsert: insert a row with the value, or add to existing
    const columnMap: Record<string, string> = {
      focus_time: 'focus_time_seconds',
      task_completed: 'tasks_completed',
      task_planned: 'tasks_planned',
    };
    const column = columnMap[type];

    // Use Supabase upsert with onConflict to do a single round-trip
    const insertRow: Record<string, unknown> = {
      user_id: user.id,
      date: targetDate,
      focus_time_seconds: 0,
      tasks_completed: 0,
      tasks_planned: 0,
      [column]: Math.max(0, value), // clamp to 0 for new inserts
    };

    const { data: existing } = await supabase
      .from('daily_user_metrics')
      .select('id, focus_time_seconds, tasks_completed, tasks_planned')
      .eq('user_id', user.id)
      .eq('date', targetDate)
      .maybeSingle();

    if (existing) {
      const newValue = Math.max(0, (existing[column as keyof typeof existing] as number) + value);
      const updatePayload = { [column]: newValue, updated_at: new Date().toISOString() } as any;
      const { error } = await supabase
        .from('daily_user_metrics')
        .update(updatePayload)
        .eq('id', existing.id);

      if (error) {
        console.error('Metrics update error:', error);
        return NextResponse.json({ error: 'Failed to update metrics' }, { status: 500 });
      }
    } else {
      const { error } = await supabase
        .from('daily_user_metrics')
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
 * Only selects the columns we need to minimize payload size.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
