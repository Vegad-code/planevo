import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { selectedCalendarIds } = await request.json();
    
    if (!Array.isArray(selectedCalendarIds)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Fetch existing preferences
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('scheduling_preferences')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    const preferences = userData.scheduling_preferences as Record<string, any> || {};
    preferences.google_selected_calendars = selectedCalendarIds;

    // Update preferences
    const { error: updateError } = await supabase
      .from('users')
      .update({ scheduling_preferences: preferences })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save Calendars Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to save Google calendars' 
    }, { status: 500 });
  }
}
