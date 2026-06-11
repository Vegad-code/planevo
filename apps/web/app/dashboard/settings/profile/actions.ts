'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateProfileAction(data: { 
  name?: string; 
  energy_preference?: string;
  preferred_name?: string;
  timezone?: string;
  context_type?: string;
  school_name?: string;
  major_role?: string;
  graduation_year?: string;
  term_start?: string | null;
  term_end?: string | null;
  default_canvas_url?: string;
  workload_style?: string;
  default_task_duration?: number;
  preferred_planning_time?: string;
}) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Fetch current user row to get existing scheduling_preferences
    const { data: currentUser } = await supabase
      .from('users')
      .select('name, energy_preference, scheduling_preferences')
      .eq('id', user.id)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingPrefs = (currentUser?.scheduling_preferences as Record<string, any>) || {};

    const newPrefs = {
      ...existingPrefs,
      preferred_focus_time: data.energy_preference !== undefined ? data.energy_preference : existingPrefs.preferred_focus_time,
      timezone: data.timezone !== undefined ? data.timezone : existingPrefs.timezone,
      context_type: data.context_type !== undefined ? data.context_type : existingPrefs.context_type,
      organization_name: data.school_name !== undefined ? data.school_name : existingPrefs.organization_name,
      major_role: data.major_role !== undefined ? data.major_role : existingPrefs.major_role,
      graduation_year: data.graduation_year !== undefined ? data.graduation_year : existingPrefs.graduation_year,
      term_start: data.term_start !== undefined ? data.term_start : existingPrefs.term_start,
      term_end: data.term_end !== undefined ? data.term_end : existingPrefs.term_end,
      default_canvas_url: data.default_canvas_url !== undefined ? data.default_canvas_url : existingPrefs.default_canvas_url,
      workload_style: data.workload_style !== undefined ? data.workload_style : existingPrefs.workload_style,
      default_task_duration: data.default_task_duration !== undefined ? data.default_task_duration : existingPrefs.default_task_duration,
      preferred_planning_time: data.preferred_planning_time !== undefined ? data.preferred_planning_time : existingPrefs.preferred_planning_time,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any = {
      scheduling_preferences: newPrefs
    };

    if (data.name !== undefined) updates.name = data.name;
    // Map preferred_name to name if provided separately
    if (data.preferred_name !== undefined) updates.name = data.preferred_name;
    if (data.energy_preference !== undefined) updates.energy_preference = data.energy_preference;

    const { error: userUpdateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id);

    if (userUpdateError) {
      console.error('Failed to update profile user table:', userUpdateError);
      return { success: false, error: userUpdateError.message };
    }

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/settings/profile');
    
    return { success: true };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error('Error updating profile:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}
