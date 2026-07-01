import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { fetchGoogleCalendars } from '@/lib/integrations/google-calendar';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';

export async function GET(request: NextRequest) {
  try {
    if (!isAllowedOriginOrBearer(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const calendars = await fetchGoogleCalendars(user.id);

    return NextResponse.json({
      success: true,
      calendars,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch Google calendars';
    console.error('Fetch Calendars Error:', error);

    const status =
      message === 'User not connected to Google Calendar' ||
      message.includes('Failed to refresh Google token') ||
      message.includes('invalid_grant')
        ? 400
        : 500;

    return NextResponse.json(
      {
        error: message,
      },
      { status }
    );
  }
}
