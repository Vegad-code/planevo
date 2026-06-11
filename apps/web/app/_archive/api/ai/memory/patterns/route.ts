import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserAIMemory, updateUserAIMemory } from '@/lib/ai/memory';

/**
 * DELETE /api/ai/memory/patterns?label=xxx&feature=xxx
 * 
 * Removes a specific disliked pattern by label and feature.
 */
export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const label = searchParams.get('label');
    const feature = searchParams.get('feature');

    if (!label) {
      return NextResponse.json({ error: 'Label is required' }, { status: 400 });
    }

    const current = await getUserAIMemory(supabase, user.id);
    const updatedPatterns = current.disliked_patterns.filter(
      p => !(p.label === label && p.feature === (feature || 'global'))
    );

    const updated = await updateUserAIMemory(supabase, user.id, {
      disliked_patterns: updatedPatterns
    });

    return NextResponse.json({ message: 'Pattern deleted', memory: updated });
  } catch (error) {
    console.error('[api/ai/memory/patterns] DELETE error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
