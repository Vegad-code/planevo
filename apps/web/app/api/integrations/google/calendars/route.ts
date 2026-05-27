import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchGoogleCalendars } from '@/lib/integrations/google-calendar';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const calendars = await fetchGoogleCalendars(user.id);

    return NextResponse.json({ 
      success: true, 
      calendars 
    });
  } catch (error: any) {
    console.error('Fetch Calendars Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch Google calendars' 
    }, { status: 500 });
  }
}
