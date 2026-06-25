import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/auth/get-user';
import { BRUNO_SYSTEM_PROMPT } from '@/lib/bruno';
import { checkRateLimit, checkRateLimitForUser } from '@/lib/auth/rateLimit';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { scheduleBodySchema } from '@/lib/api/schemas';

type ScheduleTask = {
  id: string;
  title: string;
  priority: string;
  estimated_minutes: number | null;
};

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedOriginOrBearer(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const auth = await createAuthenticatedSupabaseClient(request);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { supabase, user, authMethod } = auth;

    const body = await request.json().catch(() => ({}));
    const parsed = scheduleBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const rateLimitResult =
      authMethod === 'bearer'
        ? await checkRateLimitForUser(user.id, 'schedule', user.email)
        : await checkRateLimit('schedule');

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: rateLimitResult.error === 'Unauthorized' ? 'Unauthorized' : 'Forbidden',
          message:
            'message' in rateLimitResult && rateLimitResult.message
              ? rateLimitResult.message
              : 'You have reached your daily AI limit.',
        },
        { status: rateLimitResult.error === 'Unauthorized' ? 401 : 403 }
      );
    }

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, priority, estimated_minutes')
      .in('status', ['todo', 'in_progress']) as { data: ScheduleTask[] | null; error: unknown };

    if (tasksError) {
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ schedule: [], message: 'No active tasks to schedule.' });
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) {
      return NextResponse.json({ error: 'OpenAI API key is missing' }, { status: 500 });
    }

    const taskList = tasks
      .map((t) => `- ${t.title} (Priority: ${t.priority})`)
      .join('\n');

    const userPrompt = `Please create a daily schedule based on these tasks:\n${taskList}\n
Format the response as a JSON object with a single key "schedule" containing an array of objects. Each object should represent a scheduled block with the following keys:
- "time": string (e.g. "09:00 AM - 10:30 AM")
- "title": string (the task or activity)
- "type": string (can be "focus", "break", "routine", "flexible")
- "description": string (optional, brief advice or note from Bruno)

Limit to around 5-7 blocks for a realistic day. Be sure to include breaks.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: BRUNO_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI Error:', errorData);
      return NextResponse.json({ error: 'Failed to generate schedule with AI' }, { status: 500 });
    }

    const aiData = await response.json();
    const content = aiData.choices[0].message.content;

    try {
      const parsed = JSON.parse(content);
      let scheduleArray = [];
      if (Array.isArray(parsed)) {
        scheduleArray = parsed;
      } else if (parsed.schedule && Array.isArray(parsed.schedule)) {
        scheduleArray = parsed.schedule;
      } else {
        const firstArrayKey = Object.keys(parsed).find((key) => Array.isArray(parsed[key]));
        if (firstArrayKey) {
          scheduleArray = parsed[firstArrayKey];
        }
      }
      return NextResponse.json({ schedule: scheduleArray });
    } catch {
      console.error('Failed to parse AI output', content);
      return NextResponse.json({ error: 'Failed to parse generated schedule' }, { status: 500 });
    }
  } catch (error) {
    console.error('Schedule generation error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
