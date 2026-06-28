import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { markAllNotificationsRead } from '@/lib/notifications/inbox';

export async function POST(request: NextRequest) {
  if (!isAllowedOriginOrBearer(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const auth = await createAuthenticatedSupabaseClient(request);
  if (auth.error || !auth.supabase || !auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const ok = await markAllNotificationsRead(auth.supabase, auth.user.id);
    return NextResponse.json({ success: ok });
  } catch (err) {
    console.error('[notifications/read-all]', err);
    return NextResponse.json({ error: 'Failed to mark all read' }, { status: 500 });
  }
}
