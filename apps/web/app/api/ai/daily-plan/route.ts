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
    const { energyLevel = 'medium', localTime, timezone, todayStart, todayEnd } = body;
    const worldState = await getOllieMasterContext(authUser.id, energyLevel);
    
    // Determine "Today" relative to the user's local time
    const now = localTime ? new Date(localTime) : new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Boundaries for scheduling and cleanup
    const dayStart = todayStart ? new Date(todayStart) : new Date(now).setHours(0,0,0,0);
    const dayEnd = todayEnd ? new Date(todayEnd) : new Date(now).setHours(23,59,59,999);

    console.log(`[DailyPlan] Processing ${worldState.tasks.length} tasks for user ${authUser.id}. Local: ${now.toLocaleTimeString()}. Range: ${new Date(dayStart).toISOString()} to ${new Date(dayEnd).toISOString()}`);

    if (worldState.tasks.length === 0) {
      return NextResponse.json({
        plan: [],
        message: "No tasks to plan! Add something new? 🌱"
      });
    }

    // 2. Calculate Gaps with Forbidden Windows
    const constraints = (worldState.memory.avoided_focus_windows as any[])?.map(w => ({
      start: new Date(w.start),
      end: new Date(w.end)
    })) || [];

    const gaps = findGaps(worldState.calendarEvents, now, new Date(dayEnd), constraints);

    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) {
      return NextResponse.json({
        plan: worldState.tasks.slice(0, 1).map(t => ({ id: t.id, title: t.title })),
        message: "Ollie is thinking... here's your top priority! 🌱"
      });
    }

    const prompt = `You are Ollie, a friendly planning assistant. You are preparing a "Daily Plan" for the user. 
    
User Energy Level: ${energyLevel}
User Local Time: ${now.toLocaleTimeString()} (${timezone || 'UTC'})
Schedule Range: ${new Date(dayStart).toISOString()} to ${new Date(dayEnd).toISOString()}
Available Calendar Gaps: ${JSON.stringify(gaps)}

User AI Memory:
${worldState.memoryContext}

Tasks:
${JSON.stringify(worldState.tasks.map(t => ({
  id: t.id,
  title: t.title,
  estimated_minutes: t.estimated_minutes,
  energy_level_required: (t as any).energy_level_required || 'medium',
  priority: t.priority,
  due_at: (t as any).due_at || null,
  is_assignment: (t as any).is_assignment || false
})))}

Rules:
- Suggest 1-3 tasks to work on TODAY.
- PRIORITY 1: Tasks or assignments due TODAY.
- PRIORITY 2: Tasks or assignments due SOON (next 2-7 days). If the user has a light load today, ALWAYS schedule 1-2 upcoming items to help them get ahead.
- Match tasks to available gaps and energy level.
- Apply User AI Memory, especially preferred focus times, break preference, detail level, and disliked patterns.
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

IMPORTANT: The "suggested_start" and "suggested_end" MUST be within the provided gaps and MUST be in the FUTURE (after ${now.toISOString()}).`;

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
      const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      const ghostBlocks = plan.map((item: any) => {
        let startTime = item.suggested_start;
        let endTime = item.suggested_end;

        // Ensure valid date objects
        try {
          startTime = new Date(startTime).toISOString();
          endTime = new Date(endTime).toISOString();
        } catch (e) {
          console.warn('Invalid date from AI:', item.suggested_start);
          startTime = now.toISOString();
          endTime = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
        }

        const taskId = item.id && isUuid(item.id) ? item.id : null;
        const canvasId = item.id && !isUuid(item.id) ? item.id : null;

        return {
          user_id: authUser.id,
          title: item.title,
          start_time: startTime,
          end_time: endTime,
          linked_task_id: taskId,
          external_id: null,
          source: 'schedule',
          energy_level: energyLevel,
          metadata: {
            ...item.metadata,
            canvas_id: canvasId,
            reason: item.reason,
            status: 'pending',
            is_ai_suggested: true,
            is_deleted: false,
          }
        };
      });

      // CLEANUP: Delete old ghost blocks for the range before inserting new ones
      // Note: is_ai_suggested exists in DB but not in generated types — cast to bypass
      await (supabase
        .from('calendar_events')
        .delete() as any)
        .eq('user_id', authUser.id)
        .eq('is_ai_suggested', true)
        .gte('start_time', new Date(dayStart).toISOString())
        .lte('start_time', new Date(dayEnd).toISOString());

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
