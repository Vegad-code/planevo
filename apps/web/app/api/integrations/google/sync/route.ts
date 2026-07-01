import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { syncGoogleCalendar } from '@/lib/integrations/google-calendar';
import { posthogServer } from '@/lib/posthog-server';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { emptyStrictBodySchema, parseJsonBody } from '@/lib/api/schemas';

export async function POST(req: NextRequest) {
  try {
    if (!isAllowedOriginOrBearer(req)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = parseJsonBody(emptyStrictBodySchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const url = new URL(req.url);
    const force = url.searchParams.get('force') === 'true';

    const { user, error: authError } = await getAuthenticatedUser(req);

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
      count,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Google Sync Error:', err);
    return NextResponse.json(
      {
        error: 'Failed to synchronize calendar',
      },
      { status: 500 }
    );
  }
}
