import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createNoteSchema } from '@planevo/notes-core';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createNoteRecord, ensureDefaultNotebooks, syncCourseNotebooks } from '@/lib/notes/noteService';
import { NOTE_LIST_COLUMNS } from '@/lib/notes/types';

const listQuerySchema = z.object({
  notebookId: z.string().uuid().optional(),
  noteKind: z.string().optional(),
  includeArchived: z.enum(['true', 'false']).optional(),
  q: z.string().optional(),
});

export async function GET(req: NextRequest) {
  if (!isAllowedOriginOrBearer(req)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = listQuerySchema.safeParse(params);

  let query = supabaseAdmin
    .from('notes')
    .select(NOTE_LIST_COLUMNS)
    .eq('user_id', user.id)
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false });

  if (parsed.success) {
    if (parsed.data.notebookId) query = query.eq('notebook_id', parsed.data.notebookId);
    if (parsed.data.noteKind) query = query.eq('note_kind', parsed.data.noteKind);
    if (parsed.data.includeArchived !== 'true') query = query.eq('is_archived', false);
    if (parsed.data.q) query = query.textSearch('search_vector', parsed.data.q);
  } else {
    query = query.eq('is_archived', false);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[Notes API] list error:', error);
    return NextResponse.json({ error: 'Failed to load notes' }, { status: 500 });
  }

  return NextResponse.json({ notes: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!isAllowedOriginOrBearer(req)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid note payload', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await ensureDefaultNotebooks(supabaseAdmin, user.id);

  const { data, error } = await createNoteRecord(supabaseAdmin, user.id, {
    ...parsed.data,
    isBrunoContent: body.isBrunoContent === true,
  });

  if (error) {
    console.error('[Notes API] create error:', error);
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
  }

  return NextResponse.json({ note: data });
}

export async function PUT(req: NextRequest) {
  if (!isAllowedOriginOrBearer(req)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const { data: assignments } = await supabaseAdmin
    .from('canvas_assignments')
    .select('course_name')
    .eq('user_id', user.id);

  const courses = (assignments ?? []).map((a) => a.course_name).filter(Boolean) as string[];
  await syncCourseNotebooks(supabaseAdmin, user.id, courses);
  const notebooks = await ensureDefaultNotebooks(supabaseAdmin, user.id);

  return NextResponse.json({ notebooks });
}
