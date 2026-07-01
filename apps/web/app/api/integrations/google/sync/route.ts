import { NextResponse } from 'next/server';

import { withAuth } from '@/lib/api/route-helpers';
import { syncGoogleCalendar } from '@/lib/integrations/google-calendar';
import { posthogServer } from '@/lib/posthog-server';
import { emptyStrictBodySchema, parseJsonBody } from '@/lib/api/schemas';

export const POST = withAuth(async ({ user, request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = parseJsonBody(emptyStrictBodySchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';

    const count = await syncGoogleCalendar(user.id, force);

    posthogServer.capture({
      distinctId: user.id,
      event: 'google_connected',
      properties: { event_count: count },
    });

    return NextResponse.json({
      success: true,
      message: `Synchronized ${count} events from Google Calendar.`,
      count,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Google Sync Error:', err);
    return NextResponse.json(
      {
        error: err.message || 'Failed to synchronize calendar',
      },
      { status: 500 }
    );
  }
});
