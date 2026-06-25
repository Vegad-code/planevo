import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  if (!isAllowedOriginOrBearer(req)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('canvas_assignments')
    .select('id, name, course_name, due_at')
    .eq('user_id', user.id)
    .order('due_at', { ascending: true })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: 'Failed to load assignments' }, { status: 500 });
  }

  return NextResponse.json({ assignments: data ?? [] });
}
