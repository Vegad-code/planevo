import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncGoogleCalendar } from '@/lib/integrations/google-calendar';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await syncGoogleCalendar(user.id);

    return NextResponse.json({ 
      success: true, 
      message: `Synchronized ${count} events from Google Calendar.`,
      count 
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Google Sync Error:', err);
    return NextResponse.json({ 
      error: err.message || 'Failed to synchronize calendar' 
    }, { status: 500 });
  }
}
