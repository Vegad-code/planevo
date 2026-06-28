import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import {
  listUserNotifications,
  syncUserNotifications,
} from '@/lib/notifications/inbox';

export async function GET(request: NextRequest) {
  if (!isAllowedOriginOrBearer(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const auth = await createAuthenticatedSupabaseClient(request);
  if (auth.error || !auth.supabase || !auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const shouldSync = request.nextUrl.searchParams.get('sync') !== 'false';
    const syncResult = shouldSync
      ? await syncUserNotifications(auth.supabase, auth.user.id)
      : { ok: true };
    const result = await listUserNotifications(auth.supabase, auth.user.id);
    return NextResponse.json({
      ...result,
      syncOk: syncResult.ok,
      syncError: syncResult.error ?? null,
    });
  } catch (err) {
    console.error('[notifications/inbox]', err);
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
  }
}
