import { NextResponse } from 'next/server';

import { withAuth } from '@/lib/api/route-helpers';
import { fetchGoogleCalendars } from '@/lib/integrations/google-calendar';

export const GET = withAuth(async ({ user }) => {
  try {
    const calendars = await fetchGoogleCalendars(user.id);

    return NextResponse.json({
      success: true,
      calendars,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    console.error('Fetch Calendars Error:', error);

    const isClientError =
      message === 'User not connected to Google Calendar' ||
      message.includes('Failed to refresh Google token') ||
      message.includes('invalid_grant');

    return NextResponse.json(
      {
        error: isClientError
          ? 'Google Calendar connection issue. Please reconnect.'
          : 'Failed to fetch Google calendars',
      },
      { status: isClientError ? 400 : 500 }
    );
  }
});
