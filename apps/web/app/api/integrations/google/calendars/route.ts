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
});
