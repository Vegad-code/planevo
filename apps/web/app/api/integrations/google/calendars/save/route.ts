import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { googleCalendarsSaveBodySchema } from '@/lib/api/schemas';
import { saveGoogleCalendarSelection } from '@/lib/integrations/google-calendar';

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedOriginOrBearer(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const auth = await createAuthenticatedSupabaseClient(request);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = googleCalendarsSaveBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    await saveGoogleCalendarSelection(auth.user.id, parsed.data.selectedCalendarIds);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Save Calendars Error:', err);
    return NextResponse.json(
      {
        error: err.message || 'Failed to save Google calendars',
      },
      { status: 500 }
    );
  }
}
