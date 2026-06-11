import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserAIMemory, updateUserAIMemory } from '@/lib/ai/memory';

/**
 * DELETE /api/ai/memory/rules?id=xxx
 * 
 * Removes a specific learned rule by ID.
 */
export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const ruleId = searchParams.get('id');

    if (!ruleId) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

    const current = await getUserAIMemory(supabase, user.id);
    const updatedRules = current.learned_rules.filter(r => r.id !== ruleId);

    const updated = await updateUserAIMemory(supabase, user.id, {
      learned_rules: updatedRules
    });

    return NextResponse.json({ message: 'Rule deleted', memory: updated });
  } catch (error) {
    console.error('[api/ai/memory/rules] DELETE error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
