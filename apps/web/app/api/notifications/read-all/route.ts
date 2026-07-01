import { NextResponse } from 'next/server';

import { withAuthClient } from '@/lib/api/route-helpers';
import { markAllNotificationsRead } from '@/lib/notifications/inbox';

export const POST = withAuthClient(async ({ supabase, user }) => {
  try {
    const ok = await markAllNotificationsRead(supabase, user.id);
    return NextResponse.json({ success: ok });
  } catch (err) {
    console.error('[notifications/read-all]', err);
    return NextResponse.json({ error: 'Failed to mark all read' }, { status: 500 });
  }
});
