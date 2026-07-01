import { NextResponse } from 'next/server';

import { withAuth } from '@/lib/api/route-helpers';
import { googleCalendarsSaveBodySchema } from '@/lib/api/schemas';
import { saveGoogleCalendarSelection } from '@/lib/integrations/google-calendar';

export const POST = withAuth(async ({ user, request }) => {
  try {
    const body = await request.json().catch(() => null);
    const parsed = googleCalendarsSaveBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    await saveGoogleCalendarSelection(user.id, parsed.data.selectedCalendarIds);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save Google calendars';
    console.error('Save Calendars Error:', error);
    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
});
