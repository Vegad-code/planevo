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
    const err = error as Error;
    console.error('Fetch Calendars Error:', err);

    const isClientError =
      err.message === 'User not connected to Google Calendar' ||
      err.message.includes('Failed to refresh Google token') ||
      err.message.includes('invalid_grant');

    return NextResponse.json(
      {
        error: isClientError
          ? 'Google Calendar connection issue. Please reconnect.'
          : 'Failed to fetch Google calendars',
      },
      { status: isClientError ? 400 : 500 }
    );
  }
}
