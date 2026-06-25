import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { supabaseAdmin } from '@/lib/supabase/admin';

const paramsSchema = z.object({ id: z.string().uuid() });

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isAllowedOriginOrBearer(req)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: 'Invalid note id' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('note_revisions')
    .select('id, title, created_at')
    .eq('note_id', parsedParams.data.id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: 'Failed to load revisions' }, { status: 500 });
  }

  return NextResponse.json({ revisions: data ?? [] });
}
