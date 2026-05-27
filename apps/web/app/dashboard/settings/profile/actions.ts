'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateProfileAction(data: { name: string; energy_preference: string }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('users')
      .update({
        name: data.name,
        energy_preference: data.energy_preference,
        // We'll also update the scheduling_preferences for consistency if it's there
        scheduling_preferences: {
          preferred_focus_time: data.energy_preference,
        }
      })
      .eq('id', user.id);

    if (error) {
      console.error('Failed to update profile:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/settings/profile');
    
    return { success: true };
  } catch (err: any) {
    console.error('Error updating profile:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}
