import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/auth/get-user';
import type { Json } from '@/types/database';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { googleCalendarsSaveBodySchema } from '@/lib/api/schemas';

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedOriginOrBearer(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const auth = await createAuthenticatedSupabaseClient(request);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { supabase, user } = auth;

    const body = await request.json().catch(() => null);
    const parsed = googleCalendarsSaveBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { selectedCalendarIds } = parsed.data;

    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('scheduling_preferences')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    const preferences =
      (userData.scheduling_preferences as Record<string, unknown> | null) || {};
    preferences.google_selected_calendars = selectedCalendarIds;

    const { error: updateError } = await supabase
      .from('users')
      .update({ scheduling_preferences: preferences as Json })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

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
