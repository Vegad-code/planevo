import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/auth/rateLimit';
import { isAllowedOriginOrCron } from '@/lib/auth/origin-guard';
import { getUserAIMemory, buildMemoryContext } from '@/lib/ai/memory';

/**
 * POST /api/ai/weekly-review
 * 
 * Generates a weekly productivity review powered by Bruno.
 * 
 * SECURITY: The OpenAI API key is used ONLY on the server.
 * The user's browser receives only the generated review text.
 * Rate-limited to prevent abuse.
 */
export async function POST(request: NextRequest) {
  try {
    // --- ORIGIN / CSRF GUARD (with cron exemption) ---
    if (!isAllowedOriginOrCron(request)) {
      return NextResponse.json({ error: 'Forbidden: invalid origin' }, { status: 403 });
    }

    // Rate limit to prevent bill abuse
    const { allowed, error: limitError } = await checkRateLimit('weekly-review');
    if (!allowed) {
      return NextResponse.json({ error: limitError }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch the user's AI memory
    const memory = await getUserAIMemory(supabase, user.id);
    const memoryContext = buildMemoryContext(memory);

    // 2. Fetch schedules from the past 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { data: schedules } = await supabase
      .from('schedules')
      .select('date, schedule_json')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true });

    // 3. Fetch feedback from the past 7 days
    const { data: feedback } = await supabase
      .from('ai_feedback')
      .select('feature_name, action, correction_text, created_at')
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    // 4. Fetch completed tasks from the past 7 days
    const { data: completedTasks } = await supabase
      .from('tasks')
      .select('title, completed_at, priority, estimated_minutes')
      .eq('user_id', user.id)
      .eq('completed', true)
      .gte('completed_at', sevenDaysAgo.toISOString())
      .order('completed_at', { ascending: true });

    // 5. Fetch focus sessions from the past 7 days
    const { data: focusSessions } = await supabase
      .from('focus_sessions')
      .select('duration_minutes, was_interrupted, created_at')
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgo.toISOString());

    // Build context for the AI — API key stays on the server
    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) {
      return NextResponse.json({
        review: {
          headline: 'Weekly Review Unavailable',
          summary: 'AI service is not configured. Check back later!',
          insights: [],
          suggestion: 'Keep up the great work, Pilot! 🌱',
          stats: { tasks_completed: completedTasks?.length || 0 },
        },
      });
    }

    const prompt = `You are Bruno, the AI Life Pilot for Planevo. Generate a warm, insightful weekly review.

USER AI MEMORY:
${memoryContext}

SCHEDULES THIS WEEK (${schedules?.length || 0} days):
${JSON.stringify(schedules?.map(s => ({ date: s.date, blocks: s.schedule_json })) || [], null, 1)}

FEEDBACK THIS WEEK (${feedback?.length || 0} entries):
${JSON.stringify(feedback || [], null, 1)}

COMPLETED TASKS (${completedTasks?.length || 0}):
${JSON.stringify(completedTasks?.map(t => ({ title: t.title, priority: t.priority, minutes: t.estimated_minutes })) || [], null, 1)}

FOCUS SESSIONS (${focusSessions?.length || 0}):
${JSON.stringify(focusSessions?.map(s => ({ minutes: s.duration_minutes, interrupted: s.was_interrupted })) || [], null, 1)}

Generate a weekly review with:
1. "headline" — A catchy 3-5 word title for the week (e.g., "Strong Finish, Steady Growth")
2. "summary" — 2-3 sentences summarizing the week's productivity
3. "insights" — Array of 2-3 specific observations (strings). Be concrete: mention actual tasks, times, patterns.
4. "bruno_learned" — 1-2 sentences about what Bruno learned about the user this week (from memory + feedback)
5. "suggestion" — One actionable suggestion for next week
6. "energy_pattern" — Brief description of when the user was most/least productive
7. "stats" — Object with: tasks_completed (number), total_focus_minutes (number), feedback_given (number)
8. "vibe" — A one-word vibe for the week (e.g., "Grinding", "Flowing", "Building", "Recovering")

Respond ONLY with JSON.`;

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
        max_tokens: 600,
      }),
    });

    if (!response.ok) throw new Error('AI API failure');

    const data = await response.json();
    const review = JSON.parse(data.choices[0].message.content);

    return NextResponse.json({ review });

  } catch (error) {
    console.error('[weekly-review] error:', error);
    return NextResponse.json({ error: 'Failed to generate weekly review' }, { status: 500 });
  }
}
