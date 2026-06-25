'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { profileUpdateSchema, parseJsonBody } from '@/lib/api/schemas';

export async function updateProfileAction(data: unknown) {
  const parsed = parseJsonBody(profileUpdateSchema, data);
  if (!parsed.success) {
    return { success: false, error: parsed.error };
  }
  const validated = parsed.data;
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
      preferred_focus_time: validated.energy_preference !== undefined ? validated.energy_preference : existingPrefs.preferred_focus_time,
      timezone: validated.timezone !== undefined ? validated.timezone : existingPrefs.timezone,
      context_type: validated.context_type !== undefined ? validated.context_type : existingPrefs.context_type,
      organization_name: validated.school_name !== undefined ? validated.school_name : existingPrefs.organization_name,
      major_role: validated.major_role !== undefined ? validated.major_role : existingPrefs.major_role,
      graduation_year: validated.graduation_year !== undefined ? validated.graduation_year : existingPrefs.graduation_year,
      term_start: validated.term_start !== undefined ? validated.term_start : existingPrefs.term_start,
      term_end: validated.term_end !== undefined ? validated.term_end : existingPrefs.term_end,
      default_canvas_url: validated.default_canvas_url !== undefined ? validated.default_canvas_url : existingPrefs.default_canvas_url,
      workload_style: validated.workload_style !== undefined ? validated.workload_style : existingPrefs.workload_style,
      default_task_duration: validated.default_task_duration !== undefined ? validated.default_task_duration : existingPrefs.default_task_duration,
      preferred_planning_time: validated.preferred_planning_time !== undefined ? validated.preferred_planning_time : existingPrefs.preferred_planning_time,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any = {
      scheduling_preferences: newPrefs
    };

    if (validated.name !== undefined) updates.name = validated.name;
    if (validated.preferred_name !== undefined) updates.name = validated.preferred_name;
    if (validated.energy_preference !== undefined) updates.energy_preference = validated.energy_preference;

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
