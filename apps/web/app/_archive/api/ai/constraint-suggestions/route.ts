import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mineConstraintCandidates } from '@/lib/ai/memory';

/**
 * GET /api/ai/constraint-suggestions
 * 
 * Returns pending constraint suggestions for the current user.
 * This is pure database analysis — no OpenAI API key is used.
 * The user's browser never sees any secrets.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const candidates = await mineConstraintCandidates(supabase, user.id);

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error('[constraint-suggestions] error:', error);
    return NextResponse.json({ error: 'Failed to mine constraints' }, { status: 500 });
  }
}
