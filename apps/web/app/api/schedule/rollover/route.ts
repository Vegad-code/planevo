import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';

/**
 * Adaptive Rescheduling (Step 4 of Phase Two)
 * Moves all incomplete tasks with a past due_date to 'today' without shame.
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

    const { supabase } = auth;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: overdueTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, rescheduled_count, title')
      .eq('completed', false)
      .lt('due_date', today.toISOString());

    if (fetchError) throw fetchError;

    if (!overdueTasks || overdueTasks.length === 0) {
      return NextResponse.json({ moved: 0, message: 'All caught up! No tasks needed rolling over.' });
    }

    let movedCount = 0;
    for (const task of overdueTasks) {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          due_date: today.toISOString(),
          rescheduled_count: (task.rescheduled_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      if (!updateError) movedCount++;
    }

    return NextResponse.json({
      moved: movedCount,
      message: `Bruno moved ${movedCount} tasks to your schedule today. No sweat! 🌿`,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Rollover Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
