import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserAIMemory, updateUserAIMemory } from '@/lib/ai/memory';
import type { ConstraintCandidate } from '@/lib/ai/memory';

/**
 * POST /api/ai/confirm-constraint
 * 
 * Accepts or dismisses a constraint suggestion from Ollie.
 * If accepted, writes the avoided window into user_ai_memory.
 * No OpenAI API key is used here — purely database writes.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidate, action } = await request.json() as {
      candidate: ConstraintCandidate;
      action: 'accept' | 'dismiss';
    };

    if (!candidate || !action) {
      return NextResponse.json({ error: 'Missing candidate or action' }, { status: 400 });
    }

    if (action === 'dismiss') {
      // User said "no thanks" — record that we asked so we don't suggest again
      const memory = await getUserAIMemory(supabase, user.id);
      await updateUserAIMemory(supabase, user.id, {
        source_counters: {
          ...memory.source_counters,
          [`constraint_dismissed_${candidate.label.toLowerCase().replace(/\s+/g, '_')}`]:
            (memory.source_counters[`constraint_dismissed_${candidate.label.toLowerCase().replace(/\s+/g, '_')}`] || 0) + 1,
        },
      });
      return NextResponse.json({ success: true, action: 'dismissed' });
    }

    if (action === 'accept') {
      const memory = await getUserAIMemory(supabase, user.id);

      // Add the avoided window
      const newWindow = {
        label: candidate.label,
        start: candidate.start,
        end: candidate.end,
        days: [] as string[], // applies to all days
        confidence: Math.min(1, 0.5 + candidate.evidence_count * 0.1),
        source: 'constraint_mining',
      };

      await updateUserAIMemory(supabase, user.id, {
        avoided_focus_windows: [...memory.avoided_focus_windows, newWindow],
        learned_rules: [
          ...memory.learned_rules,
          {
            id: `mined-constraint-${candidate.label.toLowerCase().replace(/\s+/g, '-')}`,
            text: `Avoid scheduling focus work during ${candidate.label.toLowerCase()} (${candidate.start}-${candidate.end}). ${candidate.reason}`,
            feature: 'constraint_mining',
            confidence: newWindow.confidence,
            evidence_count: candidate.evidence_count,
            last_seen_at: new Date().toISOString(),
          },
        ].slice(-30),
        source_counters: {
          ...memory.source_counters,
          constraint_accepted: (memory.source_counters.constraint_accepted || 0) + 1,
        },
      });

      return NextResponse.json({ success: true, action: 'accepted' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[confirm-constraint] error:', error);
    return NextResponse.json({ error: 'Failed to process constraint' }, { status: 500 });
  }
}
