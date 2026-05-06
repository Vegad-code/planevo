import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/auth/rateLimit';
import { getUserAIMemory, buildMemoryContext } from '@/lib/ai/memory';

export async function POST(request: NextRequest) {
  try {
    // --- SUBSCRIPTION & RATE LIMIT SHIELD ---
    const { allowed, error: limitError, message } = await checkRateLimit('breakdown');
    
    if (!allowed) {
      return NextResponse.json({ 
        error: limitError, 
        message: message || 'You have reached your daily AI limit.' 
      }, { status: limitError === 'Unauthorized' ? 401 : 403 });
    }
    // -----------------------------------------
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const memory = user ? await getUserAIMemory(supabase, user.id) : null;
    const memoryContext = memory ? buildMemoryContext(memory) : 'No user memory available.';

    const { title, description } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    const openAiApiKey = process.env.OPENAI_API_KEY;

    if (!openAiApiKey) {
      return NextResponse.json({ error: 'AI key not configured' }, { status: 500 });
    }

    const prompt = `You are the AI Life Pilot for Plant Pilot. The user needs help breaking down a daunting task into smaller, highly actionable steps to overcome procrastination.

Task: ${title}
${description ? `Notes: ${description}` : ''}

USER MEMORY (Apply these preferences):
${memoryContext}

Break this task down into 2 to 5 extremely specific, actionable subtasks. Make them simple enough that the user can just execute without thinking.

Respond ONLY with valid JSON (no markdown, no text outside JSON):
{
  "subtasks": [
    {
      "title": "First small step",
      "estimated_minutes": 5
    }
  ]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, await response.text());
      return NextResponse.json({ error: 'Failed to generate breakdown' }, { status: 502 });
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content;

    try {
      const parsed = JSON.parse(aiText);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }
  } catch (error) {
    console.error('AI breakdown route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
