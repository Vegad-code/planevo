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
    const message = error instanceof Error ? error.message : 'Failed to synchronize calendar';
    console.error('Google Sync Error:', error);
    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
});
