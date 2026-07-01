import { NextResponse } from 'next/server';

import { withAuthClient } from '@/lib/api/route-helpers';
import { emptyStrictBodySchema, parseJsonBody } from '@/lib/api/schemas';

/**
 * Adaptive Rescheduling (Step 4 of Phase Two)
 * Moves all incomplete tasks with a past due_date to 'today' without shame.
 */
export const POST = withAuthClient(async ({ supabase, request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = parseJsonBody(emptyStrictBodySchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

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
    const updateErrors: string[] = [];
    for (const task of overdueTasks) {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          due_date: today.toISOString(),
          rescheduled_count: (task.rescheduled_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      if (updateError) {
        console.error(`[rollover] Failed to move task ${task.id} ("${task.title}"):`, updateError.message);
        updateErrors.push(task.id);
      } else {
        movedCount++;
      }
    }

    return NextResponse.json({
      moved: movedCount,
      message: `Bruno moved ${movedCount} tasks to your schedule today. No sweat! 🌿`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Rollover failed';
    console.error('Rollover Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
