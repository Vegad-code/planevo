'use server';

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export type ExportUserDataResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: string };

export async function exportUserDataAction(): Promise<ExportUserDataResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'You must be signed in to export your data.' };
    }

    const userId = user.id;

    const [
      profileResult,
      tasksResult,
      goalsResult,
      calendarResult,
      conversationsResult,
      messagesResult,
      memoryResult,
      metricsResult,
      canvasResult,
    ] = await Promise.all([
      supabase
        .from('users')
        .select(
          'id, email, name, preferred_name, plan_type, onboarding_complete, scheduling_preferences, created_at, updated_at'
        )
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('tasks')
        .select(
          'id, title, description, status, priority, due_at, estimated_minutes, completed_at, created_at, updated_at'
        )
        .eq('user_id', userId),
      supabase
        .from('goals')
        .select('id, title, status, deadline, notes, created_at')
        .eq('user_id', userId),
      supabase
        .from('calendar_events')
        .select(
          'id, title, description, start_time, end_time, status, source, created_at, updated_at'
        )
        .eq('user_id', userId)
        .eq('is_deleted', false),
      supabase
        .from('chat_conversations')
        .select('id, title, created_at, updated_at')
        .eq('user_id', userId),
      supabase
        .from('bruno_messages')
        .select('id, conversation_id, role, content, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
      supabase
        .from('user_ai_memory')
        .select('memory_data, memory_learning_settings, updated_at')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('daily_user_metrics')
        .select('date, focus_time_seconds, tasks_completed, tasks_planned, updated_at')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(365),
      supabaseAdmin
        .from('canvas_assignments')
        .select('id, name, course_name, due_at, synced_at, description')
        .eq('user_id', userId),
    ]);

    const errors = [
      profileResult.error,
      tasksResult.error,
      goalsResult.error,
      calendarResult.error,
      conversationsResult.error,
      messagesResult.error,
      memoryResult.error,
      metricsResult.error,
      canvasResult.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      console.error('[data-export] Partial fetch errors:', errors);
      return { success: false, error: 'We could not gather all of your data. Please try again.' };
    }

    return {
      success: true,
      data: {
        exported_at: new Date().toISOString(),
        format_version: '1.0',
        account: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        },
        profile: profileResult.data,
        tasks: tasksResult.data ?? [],
        goals: goalsResult.data ?? [],
        calendar_events: calendarResult.data ?? [],
        chat_conversations: conversationsResult.data ?? [],
        bruno_messages: messagesResult.data ?? [],
        ai_memory: memoryResult.data,
        daily_metrics: metricsResult.data ?? [],
        canvas_assignments: canvasResult.data ?? [],
      },
    };
  } catch (error) {
    console.error('[data-export] Unexpected failure:', error);
    return { success: false, error: 'Something went wrong while exporting your data.' };
  }
}
