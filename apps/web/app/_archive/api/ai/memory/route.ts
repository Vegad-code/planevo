import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserAIMemory, updateUserAIMemory, DEFAULT_USER_AI_MEMORY, userAiMemorySchema } from '@/lib/ai/memory';

/**
 * /api/ai/memory
 * 
 * GET: Fetch full memory context
 * PATCH: Update stable preferences
 * DELETE: Wipe learned memory (reset)
 */

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const memory = await getUserAIMemory(supabase, user.id);
    return NextResponse.json({ memory });
  } catch (error) {
    console.error('[api/ai/memory] GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const patch = await req.json();
    
    // Safety: Only allow patching specific top-level preference fields
    // This prevents malicious deletion of rules/patterns via this general endpoint
    const allowedFields = [
      'break_preference',
      'planning_style',
      'tone_preference',
      'task_detail_preference'
    ];
    
    const safePatch: any = {};
    for (const field of allowedFields) {
      if (patch[field] !== undefined) {
        safePatch[field] = patch[field];
      }
    }

    const updated = await updateUserAIMemory(supabase, user.id, safePatch);
    return NextResponse.json({ memory: updated });
  } catch (error) {
    console.error('[api/ai/memory] PATCH error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Reset: Clear learned data but keep the core schema/settings
    // We fetch current to preserve the manual settings
    const current = await getUserAIMemory(supabase, user.id);
    
    const resetMemory = {
      ...current,
      learned_rules: [],
      disliked_patterns: [],
      accepted_patterns: [],
      avoided_focus_windows: current.avoided_focus_windows.filter(w => w.source === 'manual'),
      source_counters: {},
    };

    const updated = await updateUserAIMemory(supabase, user.id, resetMemory);
    return NextResponse.json({ message: 'Memory reset successful', memory: updated });
  } catch (error) {
    console.error('[api/ai/memory] DELETE error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
