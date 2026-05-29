import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncGoogleCalendar } from '@/lib/integrations/google-calendar';
import { posthogServer } from '@/lib/posthog-server';

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get('force') === 'true';

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await syncGoogleCalendar(user.id, force);

    posthogServer.capture({
      distinctId: user.id,
      event: 'google_connected',
      properties: { event_count: count },
    });

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
