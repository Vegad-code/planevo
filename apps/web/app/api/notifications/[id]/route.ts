import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import {
  dismissNotification,
  markNotificationRead,
} from '@/lib/notifications/inbox';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAllowedOriginOrBearer(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const auth = await createAuthenticatedSupabaseClient(request);
  if (auth.error || !auth.supabase || !auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  let body: { read?: boolean; dismiss?: boolean };
  try {
    body = (await request.json()) as { read?: boolean; dismiss?: boolean };
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  try {
    if (body.dismiss) {
      const ok = await dismissNotification(auth.supabase, auth.user.id, id);
      return NextResponse.json({ success: ok });
    }
    if (body.read) {
      const ok = await markNotificationRead(auth.supabase, auth.user.id, id);
      return NextResponse.json({ success: ok });
    }
    return NextResponse.json({ error: 'No action specified' }, { status: 400 });
  } catch (err) {
    console.error('[notifications/id]', err);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
