import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findGaps } from '@/lib/calendar';
import { checkRateLimit } from '@/lib/auth/rateLimit';
import { getOllieMasterContext } from '@/lib/ai/orchestrator';

export async function POST(request: NextRequest) {
  try {
    // --- SUBSCRIPTION & RATE LIMIT SHIELD ---
    const { allowed, error: limitError, message } = await checkRateLimit('daily-plan');
    
    if (!allowed) {
      return NextResponse.json({ 
        error: limitError, 
        message: message || 'You have reached your daily AI limit.' 
      }, { status: limitError === 'Unauthorized' ? 401 : 403 });
    }

    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get Unified World State
    const body = await request.json();
    const { energyLevel = 'medium' } = body;
    const worldState = await getOllieMasterContext(authUser.id, energyLevel);
    
    console.log(`[DailyPlan] Processing ${worldState.tasks.length} tasks for user ${authUser.id}`);

    if (worldState.tasks.length === 0) {
      return NextResponse.json({
        plan: [],
        message: "No tasks to plan! Add something new? 🌱"
      });
    }

    // 2. Calculate Gaps with Forbidden Windows
    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const constraints = (worldState.memory.avoided_focus_windows as any[])?.map(w => ({
      start: new Date(w.start),
      end: new Date(w.end)
    })) || [];

    const gaps = findGaps(worldState.calendarEvents, now, endOfDay, constraints);

    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) {
      return NextResponse.json({
        plan: worldState.tasks.slice(0, 1).map(t => ({ id: t.id, title: t.title })),
        message: "Ollie is thinking... here's your top priority! 🌱"
      });
    }

    const prompt = `You are Ollie, a friendly planning assistant. You are preparing a "Daily Plan" for the user. 
    
User Energy Level: ${energyLevel}
Current Time: ${now.toLocaleTimeString()}
Available Calendar Gaps: ${JSON.stringify(gaps)}

User AI Memory:
${worldState.memoryContext}

Tasks:
${JSON.stringify(worldState.tasks.map(t => ({
  id: t.id,
  title: t.title,
  estimated_minutes: t.estimated_minutes,
  energy_level_required: t.energy_level_required,
  priority: t.priority,
  due_at: (t as any).due_at || null
})))}

Rules:
- Suggest 1-3 tasks.
- Match tasks to available gaps and energy level.
- Apply User AI Memory, especially preferred focus times, break preference, detail level, and disliked patterns.
- Create a helpful "Daily Plan Title" (e.g. Focused Morning, Steady Afternoon, Evening Wrap-up).
- Calculate a "Focus Score" (0-100).
- Define a "Session Vibe" (e.g. "Deep Work Flow", "Quick Sprints").
- For each task in the plan, you MUST provide a "suggested_start" and "suggested_end" in ISO format within one of the provided gaps.

Respond ONLY with JSON:
{
  "schedule_name": "...",
  "focus_score": 85,
  "vibe": "...",
  "schedule": [
    { 
      "id": "task_id", 
      "title": "Task Title", 
      "reason": "Strategic rationale",
      "suggested_start": "YYYY-MM-DDTHH:MM:SSZ",
      "suggested_end": "YYYY-MM-DDTHH:MM:SSZ"
    }
  ],
  "message": "A warm, helpful message from Ollie (1 sentence)"
}

IMPORTANT: The "suggested_start" and "suggested_end" MUST be for TODAY (${now.toISOString().split('T')[0]}) and include the full date part. Use ISO format.`;

    const aiApiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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

    if (!aiApiResponse.ok) throw new Error('AI API failure');

    const rawData = await aiApiResponse.json();
    const aiResponse = JSON.parse(rawData.choices[0].message.content);

    // 3. AUTO-INFERENCE: Create Ghost Blocks (Pending Calendar Events)
    const plan = aiResponse.schedule || aiResponse.plan || [];
    
    if (plan.length > 0) {
      const todayStr = now.toISOString().split('T')[0];
      
      const ghostBlocks = plan.map((item: any) => {
        let startTime = item.suggested_start;
        let endTime = item.suggested_end;

        // Defensive: If AI only returned "HH:MM", prepend today's date
        if (startTime && startTime.length <= 8) startTime = `${todayStr}T${startTime}`;
        if (endTime && endTime.length <= 8) endTime = `${todayStr}T${endTime}`;

        // Ensure valid date objects
        try {
          startTime = new Date(startTime).toISOString();
          endTime = new Date(endTime).toISOString();
        } catch (e) {
          console.warn('Invalid date from AI:', item.suggested_start);
          // Fallback to now + 1hr if invalid
          startTime = now.toISOString();
          endTime = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
        }

        return {
          user_id: authUser.id,
          title: item.title,
          start_time: startTime,
          end_time: endTime,
          status: 'pending',
          is_ai_suggested: true,
          linked_task_id: item.id,
          source: 'ollie_plan',
          energy_level: energyLevel
        };
      });

      const { error: insertError } = await supabase
        .from('calendar_events')
        .insert(ghostBlocks);

      if (insertError) {
        console.error('Failed to insert ghost blocks:', insertError);
      }
    }

    // Ensure we return both plan and schedule for backwards/forwards compatibility
    return NextResponse.json({
      ...aiResponse,
      schedule: plan,
      plan: plan
    });

  } catch (error) {
    console.error('Daily Plan Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Daily plan failed' }, { status: 500 });
  }
}
