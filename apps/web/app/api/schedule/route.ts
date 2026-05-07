import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { OLLIE_SYSTEM_PROMPT } from '@/lib/ollie';
import { checkRateLimit } from '@/lib/auth/rateLimit';

type ScheduleTask = {
  id: string;
  title: string;
  priority: string;
  estimated_minutes: number | null;
};

export async function POST() {
  try {
    const { allowed, error: limitError, message } = await checkRateLimit('schedule');

    if (!allowed) {
      return NextResponse.json({
        error: limitError === 'Unauthorized' ? 'Unauthorized' : 'Forbidden',
        message: message || 'You have reached your daily AI limit.'
      }, { status: limitError === 'Unauthorized' ? 401 : 403 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch active tasks for the user
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

    // Create the prompt for OpenAI
    const taskList = tasks.map((t: { title: string; priority: string }) => `- ${t.title} (Priority: ${t.priority})`).join('\n');
    
    const userPrompt = `Please create a daily schedule based on these tasks:\n${taskList}\n
Format the response as a JSON object with a single key "schedule" containing an array of objects. Each object should represent a scheduled block with the following keys:
- "time": string (e.g. "09:00 AM - 10:30 AM")
- "title": string (the task or activity)
- "type": string (can be "focus", "break", "routine", "flexible")
- "description": string (optional, brief advice or note from Ollie)

Limit to around 5-7 blocks for a realistic day. Be sure to include breaks.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: OLLIE_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI Error:', errorData);
      return NextResponse.json({ error: 'Failed to generate schedule with AI' }, { status: 500 });
    }

    const aiData = await response.json();
    const content = aiData.choices[0].message.content;
    
    try {
      // The prompt asks for a JSON array, but we forced json_object. So we wrap the prompt to ask for {"schedule": [...]}.
      // Wait, let's fix the prompt to ensure it returns an object with a 'schedule' key.
      const parsed = JSON.parse(content);
      // Depending on how GPT returned it, it might be an array or an object containing an array.
      let scheduleArray = [];
      if (Array.isArray(parsed)) {
        scheduleArray = parsed;
      } else if (parsed.schedule && Array.isArray(parsed.schedule)) {
        scheduleArray = parsed.schedule;
      } else {
        // Fallback: extract the first array found in the object
        const firstArrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]));
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
