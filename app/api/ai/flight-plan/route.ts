import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCalendarEvents, findGaps } from '@/lib/calendar';
import { checkRateLimit } from '@/lib/auth/rateLimit';
import type { Task } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    // --- SUBSCRIPTION & RATE LIMIT SHIELD ---
    const { allowed, error: limitError, message } = await checkRateLimit('flight-plan');
    
    if (!allowed) {
      return NextResponse.json({ 
        error: limitError, 
        message: message || 'You have reached your daily AI limit.' 
      }, { status: limitError === 'Unauthorized' ? 401 : 403 });
    }
    // -----------------------------------------

    const supabase = await createClient();

    const { energyLevel } = await request.json(); // 'low', 'medium', 'high'

    // 1. Fetch tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('completed', false)
      .order('priority', { ascending: false });

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        plan: [],
        message: "No tasks to plan! Add something new? 🌱"
      });
    }

    // 2. Fetch Calendar Gaps
    const { events, error: calendarError } = await getCalendarEvents();
    
    let gaps: unknown[] = [];
    if (!calendarError) {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      gaps = findGaps(events, now, endOfDay);
    }

    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) {
      return NextResponse.json({
        plan: (tasks as Task[]).slice(0, 1).map(t => ({ id: t.id, title: t.title })),
        message: "Ollie is thinking... here's your top priority! 🌱"
      });
    }

    const prompt = `You are Ollie, the AI Life Pilot. You are preparing a "Strategic Mission Briefing" for the user. 
    
User Energy Level: ${energyLevel}
Current Time: ${new Date().toLocaleTimeString()}
Available Calendar Gaps: ${JSON.stringify(gaps)}

Tasks:
${JSON.stringify((tasks as Task[]).map(t => ({
  id: t.id,
  title: t.title,
  estimated_minutes: t.estimated_minutes,
  energy_level_required: t.energy_level_required,
  priority: t.priority
})))}

Rules:
- Suggest 1-3 tasks.
- Match tasks to available gaps and energy level.
- Create a cool "Mission Name" (e.g. Operation: Morning Surge).
- Calculate a "Focus Score" (0-100) based on how well this plan matches their energy and calendar.
- Define a "Session Vibe" (e.g. "Deep Work Flow", "Quick Sprints", "Gentle Progress").

Respond ONLY with JSON:
{
  "mission_name": "...",
  "focus_score": 85,
  "vibe": "...",
  "plan": [
    { "id": "task_id", "title": "Task Title", "reason": "Strategic rationale" }
  ],
  "message": "A warm, strategic message from Ollie (1 sentence)"
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

    if (!response.ok) throw new Error('AI API failure');

    const data = await response.json();
    const aiResponse = JSON.parse(data.choices[0].message.content);

    return NextResponse.json(aiResponse);

  } catch (error) {
    console.error('Flight Plan Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Flight plan failed' }, { status: 500 });
  }
}
