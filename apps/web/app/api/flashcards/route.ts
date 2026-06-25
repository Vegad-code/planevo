import { NextRequest, NextResponse } from 'next/server';
import { createFlashcardSchema, reviewFlashcardSchema } from '@planevo/notes-core';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { defaultFlashcardSrs, reviewFlashcard } from '@planevo/notes-core';

export async function GET(req: NextRequest) {
  if (!isAllowedOriginOrBearer(req)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const dueOnly = req.nextUrl.searchParams.get('due') === 'true';
  let query = supabaseAdmin
    .from('note_flashcards')
    .select('*, notes(id, title)')
    .eq('user_id', user.id)
    .order('next_review_at', { ascending: true });

  if (dueOnly) {
    query = query.lte('next_review_at', new Date().toISOString());
  }

  const { data, error } = await query.limit(100);
  if (error) {
    return NextResponse.json({ error: 'Failed to load flashcards' }, { status: 500 });
  }

  return NextResponse.json({ flashcards: data ?? [] });
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

  if (body.action === 'review') {
    const parsed = reviewFlashcardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid review payload' }, { status: 400 });
    }

    const { data: card } = await supabaseAdmin
      .from('note_flashcards')
      .select('*')
      .eq('id', parsed.data.flashcardId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!card) return NextResponse.json({ error: 'Flashcard not found' }, { status: 404 });

    const result = reviewFlashcard(parsed.data.quality, card.interval_days, card.ease_factor);
    const { data, error } = await supabaseAdmin
      .from('note_flashcards')
      .update({
        interval_days: result.interval,
        ease_factor: result.ease,
        next_review_at: result.nextReviewAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', card.id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: 'Review failed' }, { status: 500 });
    return NextResponse.json({ flashcard: data });
  }

  const parsed = createFlashcardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid flashcard payload' }, { status: 400 });
  }

  const srs = defaultFlashcardSrs();
  const { data, error } = await supabaseAdmin
    .from('note_flashcards')
    .insert({
      user_id: user.id,
      note_id: parsed.data.noteId,
      block_id: parsed.data.blockId ?? null,
      front: parsed.data.front,
      back: parsed.data.back,
      interval_days: srs.interval,
      ease_factor: srs.ease,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create flashcard' }, { status: 500 });
  }

  return NextResponse.json({ flashcard: data });
}
