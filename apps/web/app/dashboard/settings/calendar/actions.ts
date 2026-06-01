'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { updateUserAIMemory } from '@/lib/ai/memory';

export async function updateCalendarPreferencesAction(data: {
  default_view?: string;
  start_hour?: number;
  end_hour?: number;
  show_completed?: boolean;
}) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('calendar_preferences')
      .upsert({
        user_id: user.id,
        default_view: data.default_view,
        start_hour: data.start_hour,
        end_hour: data.end_hour,
        show_completed: data.show_completed,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Failed to update calendar preferences:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/settings/calendar');
    
    return { success: true };
  } catch (err: any) {
    console.error('Error updating calendar preferences:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

export async function updatePlanningStyleAction(data: {
  mode?: 'strict' | 'balanced' | 'flexible';
  max_planned_minutes_per_day?: number;
  allow_buffers?: boolean;
  rollover_style?: 'automatic' | 'review' | 'manual';
  weekly_review_day?: string;
  weekly_review_time?: string;
  work_hours?: any;
}) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // We fetch current planning style to merge updates securely
    const { data: currentMemory } = await supabase
      .from('user_ai_memory')
      .select('planning_style')
      .eq('user_id', user.id)
      .maybeSingle();

    const currentStyle = (currentMemory?.planning_style as any) || {};

    await updateUserAIMemory(supabase, user.id, {
      planning_style: {
        ...currentStyle,
        ...(data.mode && { mode: data.mode }),
        ...(data.max_planned_minutes_per_day && { max_planned_minutes_per_day: data.max_planned_minutes_per_day }),
        ...(data.allow_buffers !== undefined && { allow_buffers: data.allow_buffers }),
        ...(data.rollover_style && { rollover_style: data.rollover_style }),
        ...(data.weekly_review_day && { weekly_review_day: data.weekly_review_day }),
        ...(data.weekly_review_time && { weekly_review_time: data.weekly_review_time }),
        ...(data.work_hours && { work_hours: data.work_hours })
      }
    });

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/settings/calendar');
    
    return { success: true };
  } catch (err: any) {
    console.error('Error updating planning style:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

export async function updateBreakPreferencesAction(data: {
  frequency?: 'minimal' | 'balanced' | 'frequent';
  preferred_minutes?: number;
}) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data: currentMemory } = await supabase
      .from('user_ai_memory')
      .select('break_preference')
      .eq('user_id', user.id)
      .maybeSingle();

    const currentPref = (currentMemory?.break_preference as any) || {};

    await updateUserAIMemory(supabase, user.id, {
      break_preference: {
        ...currentPref,
        ...(data.frequency && { frequency: data.frequency }),
        ...(data.preferred_minutes && { preferred_minutes: data.preferred_minutes })
      }
    });

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/settings/calendar');
    
    return { success: true };
  } catch (err: any) {
    console.error('Error updating break preferences:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

export async function updateFocusWindowsAction(data: {
  preferred_focus_windows?: any[];
  avoided_focus_windows?: any[];
}) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const updates: any = {};
    if (data.preferred_focus_windows) updates.preferred_focus_windows = data.preferred_focus_windows;
    if (data.avoided_focus_windows) updates.avoided_focus_windows = data.avoided_focus_windows;

    await updateUserAIMemory(supabase, user.id, updates);

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/settings/calendar');
    
    return { success: true };
  } catch (err: any) {
    console.error('Error updating focus windows:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}
