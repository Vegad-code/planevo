import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Adaptive Rescheduling (Step 4 of Phase Two)
 * Moves all incomplete tasks with a past due_date to 'today' without shame.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Fetch overdue incomplete tasks
    const { data: overdueTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, rescheduled_count, title')
      .eq('completed', false)
      .lt('due_date', today.toISOString());

    if (fetchError) throw fetchError;

    if (!overdueTasks || overdueTasks.length === 0) {
      return NextResponse.json({ moved: 0, message: "All caught up! No tasks needed rolling over." });
    }

    // 2. Roll them over to today
    // We use a loop for now because each task might have a different rescheduled_count
    // For large lists, a Postgres function (RPC) would be better
    let movedCount = 0;
    for (const task of (overdueTasks as any[])) {
      const { error: updateError } = await (supabase
        .from('tasks')
        .update as any)({
          due_date: today.toISOString(),
          rescheduled_count: (task.rescheduled_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);
      
      if (!updateError) movedCount++;
    }

    return NextResponse.json({ 
      moved: movedCount, 
      message: `Ollie moved ${movedCount} tasks to your deck today. No sweat! 🌿` 
    });

  } catch (error: any) {
    console.error('Rollover Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
