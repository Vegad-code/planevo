import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/auth/rateLimit';
import { isAllowedOrigin } from '@/lib/auth/origin-guard';
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
  const latencyTimer = createAiLatencyTimer('bruno-chat');
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
    // --- ORIGIN / CSRF GUARD ---
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden: invalid origin' }, { status: 403 });
    }

    // --- SUBSCRIPTION & RATE LIMIT SHIELD ---
    const { allowed, error: limitError, message } = await checkRateLimit('bruno-chat');
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
      console.error('[Bruno Chat] OPENAI_API_KEY is missing from environment variables.');
      return jsonWithDiagnostics({ error: 'OpenAI API key missing' }, { status: 500 }, diagnostics);
    }

    // Get user context for better responses
    const { data: profile } = await supabase
      .from('users')
      .select('name, plan_type, canvas_token')
      .eq('id', user.id)
      .single();
    latencyTimer.mark('profile');

    // Fetch active tasks for Bruno to have context of task names and IDs
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status, due_date, priority, estimated_minutes')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(100);
    latencyTimer.mark('assignments'); // mark assignments step completed with tasks query

    const taskListContext = tasks && tasks.length > 0
      ? tasks.map(t => `- [${t.status}] "${t.title}" (ID: ${t.id}, Due: ${t.due_date || 'No due date'}, Priority: ${t.priority}, Duration: ${t.estimated_minutes}m)`).join('\n')
      : 'No active tasks found.';

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
Details: ${(assignment as any).description || 'No details provided.'}
URL: ${assignment.html_url || 'N/A'}
`;
      }
      latencyTimer.mark('assignment_context');
    }

    const systemPrompt = `You are Bruno, a hyper-intelligent AI Scholar and daily planning assistant for "Planevo". 

User Name: ${profile?.name || 'User'}

CURRENT USER TASKS:
${taskListContext}

USER MEMORY (Apply these preferences):
${memoryContext}
${assignmentContext}

CORE MISSION:
You are as capable as the world's most advanced LLMs. Your mission is to not only help the user manage their time but to actively assist them in completing their work. When an assignment context is provided, you should act as a brilliant teaching assistant. 

Rules:
1. Speak as an encouraging bear.
2. Be utility-first. Help the user clear their schedule AND master their tasks.
3. If the user asks "How do I do this?" regarding an assignment, analyze the ASSIGNMENT CONTEXT provided and give a comprehensive, step-by-step breakdown of how to approach the work, providing examples or templates where useful.
4. rember that Planevo acts as an instrument to handle the details so they can just focus on the deep work.
5. If they seem overwhelmed, offer to "Deconstruct" a complex task into 15-minute micro-steps.
6. If they ask about unsupported integrations, mention that N8N, GitHub, and Slack are available on the Premium plan.
7. When you create, reschedule, complete, or delete a task, use the corresponding tool. Inform the user in a warm bear-like way of what you did. Always make sure to refer to tasks by their exact name when interacting with them.`;

    const tools = [
      {
        type: 'function',
        function: {
          name: 'create_task',
          description: 'Create a new task for the user.',
          parameters: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'The title of the task.',
              },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
                description: 'The priority of the task. Defaults to medium.',
              },
              due_date: {
                type: 'string',
                description: 'ISO 8601 datetime format (e.g. 2026-05-22T09:00:00Z) when the task is due.',
              },
              estimated_minutes: {
                type: 'integer',
                description: 'Estimated time to complete in minutes. Defaults to 30.',
              },
            },
            required: ['title'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'reschedule_task',
          description: 'Reschedule an existing task to a new due date.',
          parameters: {
            type: 'object',
            properties: {
              task_id: {
                type: 'string',
                description: 'The UUID of the task to reschedule.',
              },
              new_due_date: {
                type: 'string',
                description: 'ISO 8601 datetime format (e.g. 2026-05-23T14:00:00Z) for the new due date.',
              },
            },
            required: ['task_id', 'new_due_date'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'mark_task_completed',
          description: 'Mark a task as completed or uncompleted.',
          parameters: {
            type: 'object',
            properties: {
              task_id: {
                type: 'string',
                description: 'The UUID of the task.',
              },
              completed: {
                type: 'boolean',
                description: 'Whether the task is completed (true) or todo (false).',
              },
            },
            required: ['task_id', 'completed'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'delete_task',
          description: 'Delete a task (soft delete).',
          parameters: {
            type: 'object',
            properties: {
              task_id: {
                type: 'string',
                description: 'The UUID of the task to delete.',
              },
            },
            required: ['task_id'],
          },
        },
      },
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

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
        tools,
        tool_choice: 'auto',
        max_tokens: 1000,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    openAiMs = performance.now() - openAiStartedAt;
    latencyTimer.mark('openai');

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('OpenAI Error:', response.status, response.statusText, errorData);
      throw new Error(`OpenAI API failure: ${response.status}`);
    }

    const data = await response.json();
    latencyTimer.mark('openai_json');

    const choice = data.choices[0];
    let text = '';

    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCalls = choice.message.tool_calls;
      const toolMessages: any[] = [];

      for (const toolCall of toolCalls) {
        const { name } = toolCall.function;
        const args = JSON.parse(toolCall.function.arguments);
        let result: any = { success: false };

        try {
          if (name === 'create_task') {
            const { error } = await supabase.from('tasks').insert({
              user_id: user.id,
              title: args.title.trim(),
              description: args.description?.trim() || null,
              estimated_minutes: args.estimated_minutes || 30,
              due_date: args.due_date || null,
              priority: args.priority || 'medium',
              status: 'todo',
              completed: false,
              is_ai_suggested: false,
              ai_confidence_score: 0,
              is_recurring: false,
              rescheduled_count: 0,
            });
            if (error) throw error;
            result = { success: true, message: `Task "${args.title}" created successfully.` };
          } 
          else if (name === 'reschedule_task') {
            const { data: currentTask } = await supabase
              .from('tasks')
              .select('rescheduled_count')
              .eq('id', args.task_id)
              .eq('user_id', user.id)
              .single();

            const count = ((currentTask as any)?.rescheduled_count || 0) + 1;

            const { error } = await supabase
              .from('tasks')
              .update({
                due_date: args.new_due_date,
                rescheduled_count: count,
                updated_at: new Date().toISOString()
              })
              .eq('id', args.task_id)
              .eq('user_id', user.id);

            if (error) throw error;
            result = { success: true, message: `Task rescheduled to ${args.new_due_date} successfully.` };
          } 
          else if (name === 'mark_task_completed') {
            const updates = args.completed
              ? { completed: true, completed_at: new Date().toISOString(), status: 'done', updated_at: new Date().toISOString() }
              : { completed: false, completed_at: null, status: 'todo', updated_at: new Date().toISOString() };

            const { error } = await supabase
              .from('tasks')
              .update(updates)
              .eq('id', args.task_id)
              .eq('user_id', user.id);

            if (error) throw error;
            result = { success: true, message: `Task marked as ${args.completed ? 'completed' : 'todo'} successfully.` };
          } 
          else if (name === 'delete_task') {
            const { error } = await supabase
              .from('tasks')
              .update({ 
                deleted_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', args.task_id)
              .eq('user_id', user.id);

            if (error) throw error;
            result = { success: true, message: `Task deleted successfully.` };
          }
        } catch (opError: any) {
          console.error(`Error executing tool ${name}:`, opError);
          result = { success: false, error: opError.message || 'Operation failed' };
        }

        toolMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: name,
          content: JSON.stringify(result),
        });
      }

      const secondOpenAiStartedAt = performance.now();
      const secondResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            })),
            choice.message,
            ...toolMessages
          ],
          max_tokens: 1000,
        }),
        signal: controller.signal,
      });
      openAiMs = (openAiMs || 0) + (performance.now() - secondOpenAiStartedAt);
      latencyTimer.mark('openai_second_call');

      const secondData = await secondResponse.json();
      if (!secondResponse.ok) {
        console.error('OpenAI Second Call Error:', secondResponse.status, secondResponse.statusText, secondData);
        throw new Error(`OpenAI API second call failure: ${secondResponse.status}`);
      }

      text = secondData.choices[0].message.content;
      latencyTimer.mark('openai_second_json');
    } else {
      text = choice.message.content;
    }

    return jsonWithDiagnostics({ text }, undefined, diagnostics);
  } catch (error: any) {
    console.error('Error in Bruno chat:', error?.stack || error);
    if (error?.name === 'AbortError') {
      return jsonWithDiagnostics({ error: 'Bruno took too long to respond (timeout)' }, { status: 504 });
    }
    return jsonWithDiagnostics({ error: 'Failed to connect to Bruno', details: error?.message }, { status: 500 });
  }
}
