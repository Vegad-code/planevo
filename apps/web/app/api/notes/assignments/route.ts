import { NextResponse } from 'next/server';

import { withAuth } from '@/lib/api/route-helpers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const GET = withAuth(async ({ user }) => {
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
});
