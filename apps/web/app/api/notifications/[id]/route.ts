import { NextResponse } from 'next/server';

import { withAuthClient } from '@/lib/api/route-helpers';
import {
  dismissNotification,
  markNotificationRead,
} from '@/lib/notifications/inbox';

export const PATCH = withAuthClient(async ({ supabase, user, request, params }) => {
  const { id } = await params as { id: string };
  let body: { read?: boolean; dismiss?: boolean };
  try {
    body = (await request.json()) as { read?: boolean; dismiss?: boolean };
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  try {
    if (body.dismiss) {
      const ok = await dismissNotification(supabase, user.id, id);
      return NextResponse.json({ success: ok });
    }
    if (body.read) {
      const ok = await markNotificationRead(supabase, user.id, id);
      return NextResponse.json({ success: ok });
    }
    return NextResponse.json({ error: 'No action specified' }, { status: 400 });
  } catch (err) {
    console.error('[notifications/id]', err);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
});
