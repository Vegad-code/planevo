import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/auth/rateLimit';
import {
  buildServerTimingHeader,
  createAiLatencyTimer,
  shouldReportLatencyDiagnostic,
} from '@/lib/diagnostics/aiLatency';
import { getUserAIMemory, buildMemoryContext } from '@/lib/ai/memory';
import { z } from 'zod';

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(2000),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(20),
  diagnostics: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const latencyTimer = createAiLatencyTimer('ollie-chat');
  let openAiMs: number | null = null;

  const jsonWithDiagnostics = (
    body: Record<string, unknown>,
    init?: ResponseInit,
    forceDiagnostics = false
  ) => {
    const diagnostic = latencyTimer.complete(openAiMs);
    const shouldIncludeDiagnostic = forceDiagnostics || shouldReportLatencyDiagnostic();
    const response = NextResponse.json(
      shouldIncludeDiagnostic ? { ...body, diagnostic } : body,
      init
    );
    response.headers.set('Server-Timing', buildServerTimingHeader(diagnostic));

    if (shouldIncludeDiagnostic && diagnostic.severity !== 'good') {
      console.info('[AI latency diagnostic]', diagnostic);
    }

    return response;
  };

  try {
    // --- SUBSCRIPTION & RATE LIMIT SHIELD ---
    const { allowed, error: limitError, message } = await checkRateLimit('ollie-chat');
    latencyTimer.mark('rate_limit');
    
    if (!allowed) {
      return jsonWithDiagnostics({ 
        error: limitError, 
        message: message || 'You have reached your daily AI limit.' 
      }, { status: limitError === 'Unauthorized' ? 401 : 403 });
    }
    // -----------------------------------------

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser(); // user is guaranteed to exist by checkRateLimit
    latencyTimer.mark('auth');
    if (!user) {
      return jsonWithDiagnostics({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsedBody = requestSchema.safeParse(await request.json());
    latencyTimer.mark('parse_body');

    if (!parsedBody.success) {
      return jsonWithDiagnostics({ error: 'Invalid messages' }, { status: 400 });
    }

    const { diagnostics, messages } = parsedBody.data;

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return jsonWithDiagnostics({ error: 'OpenAI API key missing' }, { status: 500 }, diagnostics);
    }

    // Get user context for better responses
    const { data: profile } = await supabase
      .from('users')
      .select('name, plan_type, canvas_token')
      .eq('id', user.id)
      .single();
    latencyTimer.mark('profile');

    latencyTimer.mark('assignments');

    // Get learned memory
    const memory = await getUserAIMemory(supabase, user.id);
    const memoryContext = buildMemoryContext(memory);
    latencyTimer.mark('memory');

    const systemPrompt = `You are Ollie, the AI assistant for "Plan Pilot", a structured daily planning instrument. 

User Name: ${profile?.name || 'User'}

USER MEMORY (Apply these preferences):
${memoryContext}

Rules:
1. Speak as an encouraging owl.
2. Be utility-first. Help the user clear their schedule and reduce cognitive load.
3. If they ask about organizing work, remind them that Plan Pilot acts as an instrument to handle the details so they can just focus on the work.
4. If they seem overwhelmed by tasks, offer to "Deconstruct" a complex task into 15-minute micro-steps.
5. If they ask about unsupported integrations, mention that N8N, GitHub, and Slack are available on the Elite Tier.`;

    const openAiStartedAt = performance.now();
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
    openAiMs = performance.now() - openAiStartedAt;
    latencyTimer.mark('openai');

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI Error:', errorData);
      throw new Error('OpenAI API failure');
    }

    const data = await response.json();
    const text = data.choices[0].message.content;
    latencyTimer.mark('openai_json');

    return jsonWithDiagnostics({ text }, undefined, diagnostics);
  } catch (error) {
    console.error('Error in Ollie chat:', error);
    return jsonWithDiagnostics({ error: 'Failed to connect to Ollie' }, { status: 500 });
  }
}
