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

    const syncResult = await syncGoogleCalendar(user.id, force);

    posthogServer.capture({
      distinctId: user.id,
      event: 'google_connected',
      properties: {
        event_count: syncResult.count,
        partial: syncResult.partial,
      },
    });

    return NextResponse.json({
      success: true,
      partial: syncResult.partial,
      warnings: syncResult.warnings,
      message: syncResult.partial
        ? `Synchronized ${syncResult.count} events with warnings from some calendars.`
        : `Synchronized ${syncResult.count} events from Google Calendar.`,
      count: syncResult.count,
    });
  } catch (error: unknown) {
    console.error('Google Sync Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to synchronize calendar',
      },
      { status: 500 }
    );
  }
});
