import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/auth/rateLimit';
import { getUserAIMemory, buildMemoryContext } from '@/lib/ai/memory';

export async function POST(request: NextRequest) {
  try {
    // --- SUBSCRIPTION & RATE LIMIT SHIELD ---
    const { allowed, error: limitError, message } = await checkRateLimit('prioritize');
    
    if (!allowed) {
      return NextResponse.json({ 
        error: limitError, 
        message: message || 'You have reached your daily AI limit.' 
      }, { status: limitError === 'Unauthorized' ? 401 : 403 });
    }
    // -----------------------------------------
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Get Unified World State
    const body = await request.json();
    const { energyLevel = 'medium' } = body;
    const worldState = await getBrunoMasterContext(authUser.id, energyLevel);

    if (worldState.tasks.length === 0) {
      return NextResponse.json({
        today_focus: [],
        this_week: [],
        waiting: [],
        quick_wins: [],
        recommendations: {},
        encouraging_message: "Add some tasks and I'll help you prioritize! 🌱",
      });
    }

    const openAiApiKey = process.env.OPENAI_API_KEY;

    if (!openAiApiKey) {
      // Fallback: return simple date-based prioritization
      console.warn('OPENAI_API_KEY not set — using fallback prioritization');
      return NextResponse.json(buildFallbackResponse(tasks));
    }

    const currentTime = new Date().toISOString();
    const currentHour = new Date().getHours();
    let timeContext = 'morning';
    if (currentHour >= 12 && currentHour < 17) timeContext = 'afternoon';
    else if (currentHour >= 17) timeContext = 'evening';

    const prompt = `You are the AI Life Pilot for Planevo, a shame-free time management app. Analyze these tasks and create an optimal daily plan.

Current time: ${currentTime}
Time of day: ${timeContext}

USER MEMORY (Apply these preferences):
${worldState.memoryContext}

CURRENT ENERGY: ${energyLevel}

Tasks (incomplete only):
${JSON.stringify(worldState.tasks.map((t: any) => ({
  id: t.id,
  title: t.title,
  description: t.description,
  estimated_minutes: t.estimated_minutes,
  best_time_of_day: t.best_time_of_day,
  priority: t.priority,
  due_date: t.due_date,
  energy_level_required: t.energy_level_required,
})), null, 2)}

Rules:
- "today_focus" should have max 5 tasks, prioritized by deadline + importance
- "waiting" are low priority tasks with no imminent deadlines
- "this_week" is everything else
- Never use guilt language — be warm and encouraging
- Consider time of day when suggesting tasks (morning = deep work, afternoon = admin, evening = creative/low-stakes)

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "today_focus": ["task_id_1", "task_id_2"],
  "this_week": ["task_id_3"],
  "waiting": ["task_id_4"],
  "recommendations": {
    "task_id_1": {
      "task_id": "task_id_1",
      "best_time_of_day": "morning",
      "estimated_minutes": 45,
      "priority": "high",
      "reasoning": "Brief reason"
    }
  },
  "encouraging_message": "Brief warm motivational message (1 sentence, 1 emoji max)"
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
      return NextResponse.json(buildFallbackResponse(worldState.tasks));
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content;

    if (!aiText) {
      return NextResponse.json(buildFallbackResponse(tasks));
    }

    try {
      const aiResponse = JSON.parse(aiText);
      return NextResponse.json(aiResponse);
    } catch {
      console.error('Failed to parse OpenAI response:', aiText);
      return NextResponse.json(buildFallbackResponse(worldState.tasks));
    }
  } catch (error) {
    console.error('AI prioritization route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface FallbackTask {
  id: string;
  due_date: string | null;
  priority: string;
  estimated_minutes: number | null;
}

// Simple fallback when Claude is unavailable
function buildFallbackResponse(tasks: FallbackTask[]) {
  const priorityWeight: Record<string, number> = { high: 0, medium: 1, low: 2 };

  const sorted = [...tasks].sort((a, b) => {
    const pa = priorityWeight[a.priority] ?? 1;
    const pb = priorityWeight[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });

  const today_focus = sorted.slice(0, 5).map(t => t.id);
  const waiting = tasks.filter(t => t.priority === 'low' && !t.due_date).map(t => t.id);
  const this_week = sorted
    .filter(t => !today_focus.includes(t.id) && !waiting.includes(t.id))
    .map(t => t.id);

  return {
    today_focus,
    this_week,
    waiting,
    recommendations: {},
    encouraging_message: "You've got a great list — let's tackle it one step at a time! 🌱",
  };
}
