import { NextResponse } from 'next/server';

import { withAuthClient } from '@/lib/api/route-helpers';
import {
  listUserNotifications,
  syncUserNotifications,
} from '@/lib/notifications/inbox';

export const GET = withAuthClient(async ({ supabase, user, request }) => {
  try {
    const shouldSync = request.nextUrl.searchParams.get('sync') !== 'false';
    const syncResult = shouldSync
      ? await syncUserNotifications(supabase, user.id)
      : { ok: true };
    const result = await listUserNotifications(supabase, user.id);
    return NextResponse.json({
      ...result,
      syncOk: syncResult.ok,
      syncError: syncResult.error ?? null,
    });
  } catch (err) {
    console.error('[notifications/inbox]', err);
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
  }
});
