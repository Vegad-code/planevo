import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/auth/rateLimit';
import { z } from 'zod';

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(2000),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(20),
});

export async function POST(request: NextRequest) {
  try {
    // --- SUBSCRIPTION & RATE LIMIT SHIELD ---
    const { allowed, error: limitError, message } = await checkRateLimit('ollie-chat');
    
    if (!allowed) {
      return NextResponse.json({ 
        error: limitError, 
        message: message || 'You have reached your daily AI limit.' 
      }, { status: limitError === 'Unauthorized' ? 401 : 403 });
    }
    // -----------------------------------------

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser(); // user is guaranteed to exist by checkRateLimit
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsedBody = requestSchema.safeParse(await request.json());

    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid messages' }, { status: 400 });
    }

    const { messages } = parsedBody.data;

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'OpenAI API key missing' }, { status: 500 });
    }

    // Get user context for better responses
    const { data: profile } = await supabase
      .from('users')
      .select('name, plan_type')
      .eq('id', user.id)
      .single();

    const { data: tasks } = await supabase
      .from('tasks')
      .select('title, status, priority, due_date')
      .eq('user_id', user.id)
      .eq('completed', false)
      .limit(10);

    const systemPrompt = `You are Ollie, the AI navigator for "Plan Pilot", a productivity app. 
Your tone is encouraging, tactical, and clear. You use flight/aviation metaphors occasionally but keep it professional.
User Name: ${profile?.name || 'Pilot'}
Current Tasks: ${tasks?.map(t => `${t.title} (${t.priority}, due ${t.due_date || 'soon'})`).join(', ') || 'No active tasks.'}

Guidelines:
1. Be concise.
2. Help the user prioritize or break down tasks.
3. If they seem overwhelmed, suggest a "Quick Refit" (5 min break).
4. Do not offer medical or legal advice.
5. If asked about technical issues, refer to support.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({
            role: m.role,
            content: m.content
          }))
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI Error:', errorData);
      throw new Error('OpenAI API failure');
    }

    const data = await response.json();
    const text = data.choices[0].message.content;

    // Log message to database
    await supabase.from('ollie_messages').insert([
      { user_id: user.id, content: messages[messages.length - 1].content, message_type: 'user' },
      { user_id: user.id, content: text, message_type: 'ollie' }
    ]);

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Error in Ollie chat:', error);
    return NextResponse.json({ error: 'Failed to connect to Ollie' }, { status: 500 });
  }
}
