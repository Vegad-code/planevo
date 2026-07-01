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
    const err = error as Error;
    console.error('Fetch Calendars Error:', err);

    const status =
      err.message === 'User not connected to Google Calendar' ||
      err.message.includes('Failed to refresh Google token') ||
      err.message.includes('invalid_grant')
        ? 400
        : 500;

    return NextResponse.json(
      {
        error: err.message || 'Failed to fetch Google calendars',
      },
      { status }
    );
  }
});
