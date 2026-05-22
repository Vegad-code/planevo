import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { findGaps } from '@/lib/calendar';
import { checkRateLimit, checkRateLimitForUser } from '@/lib/auth/rateLimit';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { getBrunoMasterContext } from '@/lib/ai/orchestrator';
import { z } from 'zod';

// --- Zod schema for AI response validation ---
const scheduleItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(500),
  reason: z.string().optional(),
  suggested_start: z.string().refine((s) => {
    const d = new Date(s);
    return !isNaN(d.getTime());
  }, 'Invalid ISO date for suggested_start'),
  suggested_end: z.string().refine((s) => {
    const d = new Date(s);
    return !isNaN(d.getTime());
  }, 'Invalid ISO date for suggested_end'),
}).refine((item) => {
  const start = new Date(item.suggested_start);
  const end = new Date(item.suggested_end);
  return end > start;
}, 'suggested_end must be after suggested_start');

const aiResponseSchema = z.object({
  schedule_name: z.string().optional(),
  focus_score: z.number().optional(),
  vibe: z.string().optional(),
  schedule: z.array(scheduleItemSchema).optional(),
  plan: z.array(scheduleItemSchema).optional(),
  message: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // --- ORIGIN / CSRF GUARD (allows Bearer for mobile) ---
    if (!isAllowedOriginOrBearer(request)) {
      return NextResponse.json({ error: 'Forbidden: invalid origin' }, { status: 403 });
    }

    // --- UNIFIED AUTH: Bearer token OR cookie session ---
    const { user: authUser, error: authError, authMethod } = await getAuthenticatedUser(request);

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // --- RATE LIMIT (method-aware) ---
    const rateLimitResult = authMethod === 'bearer'
      ? await checkRateLimitForUser(authUser.id, 'daily-plan', authUser.email)
      : await checkRateLimit('daily-plan');

    if (!rateLimitResult.allowed) {
      return NextResponse.json({ 
        error: rateLimitResult.error, 
        message: (rateLimitResult as any).message || 'You have reached your daily AI limit.' 
      }, { status: rateLimitResult.error === 'Unauthorized' ? 401 : 403 });
    }

    // 1. Get Unified World State
    const body = await request.json();
    const { energyLevel = 'medium', localTime, timezone, todayStart, todayEnd } = body;
    const worldState = await getBrunoMasterContext(authUser.id, energyLevel);
    
    // Determine "Today" relative to the user's local time
    const now = localTime ? new Date(localTime) : new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Boundaries for scheduling and cleanup
    const dayStart = todayStart ? new Date(todayStart) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const dayEnd = todayEnd ? new Date(todayEnd) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    console.log(`[DailyPlan] Processing ${worldState.tasks.length} tasks for user ${authUser.id}. Local: ${now.toLocaleTimeString()}. Range: ${new Date(dayStart).toISOString()} to ${new Date(dayEnd).toISOString()}`);

    if (worldState.tasks.length === 0) {
      return NextResponse.json({
        plan: [],
        message: "No tasks to plan! Add something new?"
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
        message: "Bruno is warming up... here's your top priority!"
      });
    }

    const prompt = `You are Bruno, a friendly planning assistant. You are preparing a "Daily Plan" for the user. 
    
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
  "message": "A warm, helpful message from Bruno (1 sentence)"
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
    let aiResponse: any;
    try {
      aiResponse = JSON.parse(rawData.choices[0].message.content);
    } catch {
      console.error('[DailyPlan] Failed to parse AI JSON output');
      return NextResponse.json({ error: 'AI returned invalid JSON', plan: [] }, { status: 502 });
    }

    // --- Zod validation of AI output ---
    const parsed = aiResponseSchema.safeParse(aiResponse);
    let plan: any[];

    if (parsed.success) {
      plan = parsed.data.schedule || parsed.data.plan || [];
    } else {
      console.warn('[DailyPlan] AI output failed validation:', parsed.error.format());
      // Try to salvage valid items from the raw response
      const rawPlan = aiResponse.schedule || aiResponse.plan || [];
      plan = rawPlan.filter((item: any) => {
        try {
          const start = new Date(item.suggested_start);
          const end = new Date(item.suggested_end);
          return item.title && !isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start;
        } catch {
          return false;
        }
      });
    }

    // 3. AUTO-INFERENCE: Create Ghost Blocks (Pending Calendar Events)
    if (plan.length > 0) {
      const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      const ghostBlocks = plan.map((item: any) => {
        let startTime: string;
        let endTime: string;

        // Ensure valid date objects
        try {
          startTime = new Date(item.suggested_start).toISOString();
          endTime = new Date(item.suggested_end).toISOString();
        } catch {
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
          is_ai_suggested: true,
          status: 'pending',
          metadata: {
            canvas_id: canvasId,
            reason: item.reason,
          }
        };
      });

      // CLEANUP: Delete old AI-suggested PENDING blocks for today before inserting new ones
      await supabaseAdmin
        .from('calendar_events')
        .delete()
        .eq('user_id', authUser.id)
        .eq('is_ai_suggested', true)
        .eq('status', 'pending')
        .gte('start_time', new Date(dayStart).toISOString())
        .lte('start_time', new Date(dayEnd).toISOString());

      const { error: insertError } = await supabaseAdmin
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
