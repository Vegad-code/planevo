import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/auth/rateLimit';
import { getBrunoMasterContext } from '@/lib/ai/orchestrator';

export async function POST(request: NextRequest) {
  try {
    // --- RATE LIMIT SHIELD ---
    const { allowed, error: limitError } = await checkRateLimit('nudge');
    if (!allowed) {
      return NextResponse.json({ error: limitError }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ nudge: "Stay focused, Pilot. You're doing great! 🚀" });
    }

    const { taskTitle, timeLeft, totalTime, isReturning } = await request.json();

    // Get Unified World State
    const worldState = await getBrunoMasterContext(user.id);
    const memoryContext = worldState.memoryContext;

    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) {
      return NextResponse.json({ nudge: "Keep going, Pilot! You're doing great. 🌱" });
    }

    const minutesLeft = Math.floor(timeLeft / 60);
    const progressPercent = Math.round(((totalTime - timeLeft) / totalTime) * 100);

    const prompt = `You are Bruno, the AI Life Pilot for an app called Planevo. 
The user is in a deep focus session.

Context:
- Task: "${taskTitle || 'Working'}"
- Time Remaining: ${minutesLeft} minutes (${progressPercent}% through session)
- Scenario: ${isReturning ? 'User just returned to the tab after being away.' : 'Periodic check-in.'}
- Current Vibe: ${worldState.energyLevel} Energy

USER MEMORY (Apply tone/style):
${memoryContext}

Rules:
- Be punchy, encouraging, and keep the Planevo vibe (e.g., "steady rhythm", "on track", "clear horizon").
- Max 15 words.
- If they just returned (isReturning: true), acknbearedge they're back.
- If they are near the end (>80% progress), push them to the finish line.

Respond with ONLY the nudge text.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: prompt }],
        max_tokens: 40,
        temperature: 0.8,
      }),
    });

    if (!response.ok) throw new Error('AI API failure');

    const data = await response.json();
    const nudge = data.choices[0].message.content.trim().replace(/^"|"$/g, '');

    return NextResponse.json({ nudge });

  } catch (error) {
    console.error('Nudge Error:', error);
    return NextResponse.json({ nudge: "Stay focused, Pilot. You're doing great! 🚀" });
  }
}
