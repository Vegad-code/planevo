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
  content: z.string().trim().min(1).max(10000),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(20),
  assignmentId: z.string().optional(),
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
      console.error('Validation error:', parsedBody.error);
      return jsonWithDiagnostics({ error: 'Invalid messages', details: parsedBody.error.format() }, { status: 400 });
    }

    const { diagnostics, messages, assignmentId } = parsedBody.data;

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

    // Get assignment context if requested
    let assignmentContext = '';
    if (assignmentId) {
      const { data: assignment } = await supabase
        .from('canvas_assignments')
        .select('*')
        .eq('id', assignmentId)
        .eq('user_id', user.id)
        .single();
      
      if (assignment) {
        assignmentContext = `
ASSIGNMENT CONTEXT:
Title: ${assignment.name}
Course: ${assignment.course_name || 'Canvas Course'}
Due: ${assignment.due_at ? new Date(assignment.due_at).toLocaleString() : 'N/A'}
Details: ${assignment.description || 'No details provided.'}
URL: ${assignment.html_url || 'N/A'}
`;
      }
      latencyTimer.mark('assignment_context');
    }

    const systemPrompt = `You are Ollie, a hyper-intelligent AI Scholar and daily planning assistant for "Plan Pilot". 

User Name: ${profile?.name || 'User'}

USER MEMORY (Apply these preferences):
${memoryContext}
${assignmentContext}

CORE MISSION:
You are as capable as the world's most advanced LLMs. Your mission is to not only help the user manage their time but to actively assist them in completing their work. When an assignment context is provided, you should act as a brilliant teaching assistant. 

Rules:
1. Speak as an encouraging owl.
2. Be utility-first. Help the user clear their schedule AND master their tasks.
3. If the user asks "How do I do this?" regarding an assignment, analyze the ASSIGNMENT CONTEXT provided and give a comprehensive, step-by-step breakdown of how to approach the work, providing examples or templates where useful.
4. rember that Plan Pilot acts as an instrument to handle the details so they can just focus on the deep work.
5. If they seem overwhelmed, offer to "Deconstruct" a complex task into 15-minute micro-steps.
6. If they ask about unsupported integrations, mention that N8N, GitHub, and Slack are available on the Elite Tier.`;

    const openAiStartedAt = performance.now();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({
            role: m.role,
            content: m.content
          }))
        ],
        max_tokens: 1000,
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
