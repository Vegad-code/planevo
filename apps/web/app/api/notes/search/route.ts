import { NextRequest, NextResponse } from 'next/server';
import { searchNotesSchema } from '@planevo/notes-core';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { NOTE_LIST_COLUMNS } from '@/lib/notes/types';

export async function GET(req: NextRequest) {
  if (!isAllowedOriginOrBearer(req)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = searchNotesSchema.safeParse({
    ...params,
    limit: params.limit ? Number(params.limit) : undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid search query' }, { status: 400 });
  }

  let query = supabaseAdmin
    .from('notes')
    .select(NOTE_LIST_COLUMNS)
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .textSearch('search_vector', parsed.data.query)
    .limit(parsed.data.limit);

  if (parsed.data.notebookId) query = query.eq('notebook_id', parsed.data.notebookId);
  if (parsed.data.noteKind) query = query.eq('note_kind', parsed.data.noteKind);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }

  return NextResponse.json({ notes: data ?? [] });
}
