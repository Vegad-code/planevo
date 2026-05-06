import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const requestSchema = z.object({
  goalId: z.string().uuid(),
});

interface BlueprintTask {
  day: number;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  energy_level_required?: 'low' | 'medium' | 'high';
  estimated_minutes?: number;
}

interface Blueprint {
  tasks: BlueprintTask[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsedBody = requestSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const { goalId } = parsedBody.data;

    // Fetch the goal and its blueprint
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .single();

    if (goalError || !goal || !goal.blueprint) {
      return NextResponse.json({ error: 'Goal or blueprint not found' }, { status: 404 });
    }

    const blueprint = goal.blueprint as unknown as Blueprint;
    const tasks = blueprint.tasks;

    if (!tasks || !Array.isArray(tasks)) {
      return NextResponse.json({ error: 'Invalid blueprint format' }, { status: 400 });
    }

    // Convert blueprint tasks to table tasks
    const tasksToInsert = tasks.map((t: BlueprintTask) => {
      const targetDate = new Date();
      if (t.day) {
        // Day 1 should be today (offset 0), Day 2 tomorrow (offset 1), etc.
        targetDate.setDate(targetDate.getDate() + (t.day - 1));
      }
      return {
        user_id: user.id,
        title: t.title,
        description: t.description || null,
        priority: t.priority || 'medium',
        energy_level_required: t.energy_level_required || 'medium',
        estimated_minutes: t.estimated_minutes || 30,
        status: 'todo',
        is_ai_suggested: true,
        due_date: t.day ? targetDate.toISOString().split('T')[0] : null,
      };
    });

    const { data: insertedTasks, error: taskError } = await supabase
      .from('tasks')
      .insert(tasksToInsert)
      .select();

    if (taskError) {
      console.error('Error importing blueprint tasks:', taskError);
      return NextResponse.json({ error: 'Failed to create tasks' }, { status: 500 });
    }

    // Link tasks to goal
    if (insertedTasks) {
      const subtasks = insertedTasks.map((t: { id: string }, index: number) => ({
        goal_id: goalId,
        task_id: t.id,
        order: index,
      }));
      const { error: subtaskError } = await supabase.from('subtasks').insert(subtasks);
      if (subtaskError) {
        // Cleanup if linking fails
        await supabase.from('tasks').delete().in('id', insertedTasks.map((t: { id: string }) => t.id));
        console.error('Error linking subtasks on import:', subtaskError);
        return NextResponse.json({ error: 'Failed to link tasks to project' }, { status: 500 });
      }
    }

    // Clear the blueprint after successful import
    await supabase
      .from('goals')
      .update({ blueprint: null })
      .eq('id', goalId);

    return NextResponse.json({
      success: true,
      count: insertedTasks?.length || 0,
    });
  } catch (error) {
    console.error('Error in Import Blueprint:', error);
    return NextResponse.json({ error: 'Failed to import blueprint' }, { status: 500 });
  }
}
