import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateNoteSchema } from '@planevo/notes-core';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { updateNoteRecord } from '@/lib/notes/noteService';
import { NOTE_DETAIL_COLUMNS } from '@/lib/notes/types';
import type { BlockNoteBlock } from '@planevo/notes-core';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

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
    .from('notes')
    .select(`${NOTE_DETAIL_COLUMNS}, note_tag_assignments(tag_id, note_tags(id, name, color))`)
    .eq('id', parsedParams.data.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Failed to load note' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  }

  return NextResponse.json({ note: data });
}

export async function PATCH(
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

  const parsedBody = updateNoteSchema.safeParse(await req.json());
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Invalid update payload' }, { status: 400 });
  }

  const { data, error } = await updateNoteRecord(supabaseAdmin, user.id, parsedParams.data.id, {
    ...parsedBody.data,
    contentJson: parsedBody.data.contentJson as BlockNoteBlock[] | undefined,
    isPinned: parsedBody.data.isPinned,
    isArchived: parsedBody.data.isArchived,
  });

  if (error) {
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  }

  return NextResponse.json({ note: data });
}

export async function DELETE(
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

  const { error } = await supabaseAdmin
    .from('notes')
    .delete()
    .eq('id', parsedParams.data.id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
