import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { validateHourlyRateLimit, consumeHourlyRateLimit } from '@/lib/auth/rateLimit';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { getBrunoMasterContext } from '@/lib/ai/orchestrator';
import {
  buildServerTimingHeader,
  createAiLatencyTimer,
  shouldReportLatencyDiagnostic,
} from '@/lib/diagnostics/aiLatency';
import { getUserAIMemory, buildMemoryContext } from '@/lib/ai/memory';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { normalizePlanType } from '@/lib/auth/plan-types';
import { posthogServer } from '@/lib/posthog-server';


const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(10000),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(20),
  assignmentId: z.string().optional(),
  diagnostics: z.boolean().optional(),
});

const createTaskSchema = z.object({
  title: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  due_date: z.string().nullable().optional(),
  estimated_minutes: z.number().optional(),
  description: z.string().nullable().optional()
});

const rescheduleTaskSchema = z.object({
  task_id: z.string().uuid(),
  new_due_date: z.string().nullable()
});

const updateTaskSchema = z.object({
  task_id: z.string().uuid(),
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  estimated_minutes: z.number().optional()
});

const completeTaskSchema = z.object({
  task_id: z.string().uuid(),
  completed: z.boolean()
});

const deleteTaskSchema = z.object({
  task_id: z.string().uuid()
});

const createCalendarBlockSchema = z.object({
  title: z.string().min(1),
  start_time: z.string().describe("ISO 8601 datetime format"),
  end_time: z.string().describe("ISO 8601 datetime format"),
  linked_task_id: z.string().uuid().optional(),
});

const moveCalendarBlockSchema = z.object({
  event_id: z.string().uuid(),
  new_start_time: z.string().describe("ISO 8601 datetime format"),
  new_end_time: z.string().describe("ISO 8601 datetime format"),
});

const acceptBlockSchema = z.object({
  event_id: z.string().uuid(),
});

const rejectBlockSchema = z.object({
  event_id: z.string().uuid(),
});

const breakDownTaskSchema = z.object({
  task_id: z.string().uuid(),
  subtasks: z.array(z.object({
    title: z.string(),
    estimated_minutes: z.number(),
  }))
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
    // --- ORIGIN / CSRF GUARD (allows Bearer for mobile) ---
    if (!isAllowedOriginOrBearer(request)) {
      return NextResponse.json({ error: 'Forbidden: invalid origin' }, { status: 403 });
    }

    // --- UNIFIED AUTH: Bearer token OR cookie session ---
    const { user: authUser, error: authError, authMethod } = await getAuthenticatedUser(request);
    latencyTimer.mark('auth');

    if (authError || !authUser) {
      return jsonWithDiagnostics({ error: 'Unauthorized' }, { status: 401 });
    }

    // --- RATE LIMIT (method-aware) ---
    const rateLimitResult = await validateHourlyRateLimit(authUser.id, 'bruno-chat');
    latencyTimer.mark('rate_limit');
    
    if (!rateLimitResult.allowed) {
      return jsonWithDiagnostics({ 
        error: rateLimitResult.error, 
        message: rateLimitResult.message || 'You have reached your hourly AI limit.' 
      }, { status: rateLimitResult.error === 'Unauthorized' ? 401 : 429 });
    }

    // Use authUser directly — no need for redundant supabase.auth.getUser()
    const user = authUser;

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

    // Get user context for better responses (use admin client to bypass RLS for mobile)
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('name, plan_type, canvas_token')
      .eq('id', user.id)
      .single();
    latencyTimer.mark('profile');

    // Set Sentry tags and user context
    Sentry.setUser({ id: user.id, email: user.email || undefined });
    Sentry.setTag('route', '/api/ai/chat');
    Sentry.setTag('feature', 'bruno-chat');
    Sentry.setTag('plan_type', normalizePlanType(profile?.plan_type));
    Sentry.setTag('auth_method', authMethod || 'unknown');


    // Fetch active tasks for Bruno to have context of task names and IDs
    const { data: tasks } = await supabaseAdmin
      .from('tasks')
      .select('id, title, status, due_date, priority, estimated_minutes')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(100);
    latencyTimer.mark('assignments'); // mark assignments step completed with tasks query

    const taskListContext = tasks && tasks.length > 0
      ? (tasks as any[]).map(t => `- [${t.status}] "${t.title}" (ID: ${t.id}, Due: ${t.due_date || 'No due date'}, Priority: ${t.priority}, Duration: ${t.estimated_minutes}m)`).join('\n')
      : 'No active tasks found.';

    // Get learned memory
    const memory = await getUserAIMemory(supabaseAdmin as any, user.id);
    const memoryContext = buildMemoryContext(memory);
    latencyTimer.mark('memory');

    // Get assignment context if requested
    let assignmentContext = '';
    if (assignmentId) {
      const { data: assignment } = await supabaseAdmin
        .from('canvas_assignments')
        .select('*')
        .eq('id', assignmentId)
        .eq('user_id', user.id)
        .single();
      
      if (assignment) {
        const a = assignment as any;
        assignmentContext = `
ASSIGNMENT CONTEXT:
Title: ${a.name}
Course: ${a.course_name || 'Canvas Course'}
Due: ${a.due_at ? new Date(a.due_at).toLocaleString() : 'N/A'}
Details: ${a.description || 'No details provided.'}
URL: ${a.html_url || 'N/A'}
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
4. Remember that Planevo acts as an instrument to handle the details so they can just focus on the deep work.
5. If they seem overwhelmed, offer to "Deconstruct" a complex task into 15-minute micro-steps using the break_down_task tool.
6. When you create, reschedule, complete, or delete a task, use the corresponding tool. Inform the user in a warm bear-like way of what you did. Always make sure to refer to tasks by their exact name when interacting with them.
7. Use calendar block tools to manage the user's schedule.`;

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
          name: 'update_task',
          description: 'Update a task\'s title, description, priority, or estimated duration.',
          parameters: {
            type: 'object',
            properties: {
              task_id: {
                type: 'string',
                description: 'The UUID of the task to update.',
              },
              title: {
                type: 'string',
                description: 'The new title of the task.',
              },
              description: {
                type: 'string',
                description: 'The new description of the task.',
              },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
                description: 'The new priority.',
              },
              estimated_minutes: {
                type: 'integer',
                description: 'New estimated time to complete in minutes.',
              },
            },
            required: ['task_id'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'complete_task',
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
      {
        type: 'function',
        function: {
          name: 'create_calendar_block',
          description: 'Create a new calendar block (event).',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              start_time: { type: 'string', description: 'ISO 8601 datetime format' },
              end_time: { type: 'string', description: 'ISO 8601 datetime format' },
              linked_task_id: { type: 'string', description: 'UUID of the linked task if applicable' },
            },
            required: ['title', 'start_time', 'end_time'],
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'move_calendar_block',
          description: 'Move an existing calendar block to a new time.',
          parameters: {
            type: 'object',
            properties: {
              event_id: { type: 'string', description: 'UUID of the calendar event' },
              new_start_time: { type: 'string', description: 'ISO 8601 datetime format' },
              new_end_time: { type: 'string', description: 'ISO 8601 datetime format' },
            },
            required: ['event_id', 'new_start_time', 'new_end_time'],
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'accept_block',
          description: 'Accept an AI-suggested calendar block.',
          parameters: {
            type: 'object',
            properties: {
              event_id: { type: 'string', description: 'UUID of the calendar event' },
            },
            required: ['event_id'],
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'reject_block',
          description: 'Reject (delete) an AI-suggested calendar block.',
          parameters: {
            type: 'object',
            properties: {
              event_id: { type: 'string', description: 'UUID of the calendar event' },
            },
            required: ['event_id'],
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'break_down_task',
          description: 'Break down a complex task into smaller subtasks (15-min increments).',
          parameters: {
            type: 'object',
            properties: {
              task_id: { type: 'string', description: 'UUID of the task to break down' },
              subtasks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    estimated_minutes: { type: 'integer' }
                  },
                  required: ['title', 'estimated_minutes']
                }
              }
            },
            required: ['task_id', 'subtasks'],
          }
        }
      }
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

    const openAiStartedAt = performance.now();
    const response = await Sentry.startSpan(
      { name: 'OpenAI Chat Completion - First Call', op: 'ai.completion' },
      async () => {
        return await fetch('https://api.openai.com/v1/chat/completions', {
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
            tools,
            tool_choice: 'auto',
            max_tokens: 1000,
          }),
          signal: controller.signal,
        });
      }
    );
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
            const parsed = createTaskSchema.safeParse(args);
            if (!parsed.success) throw new Error(`Invalid arguments: ${parsed.error.message}`);
            const validArgs = parsed.data;
            const { error } = await supabaseAdmin.from('tasks').insert({
              user_id: user.id,
              title: validArgs.title.trim(),
              description: validArgs.description?.trim() || null,
              estimated_minutes: validArgs.estimated_minutes || 30,
              due_date: validArgs.due_date || null,
              priority: validArgs.priority || 'medium',
              status: 'todo',
              completed: false,
              is_ai_suggested: false,
              ai_confidence_score: 0,
              is_recurring: false,
              rescheduled_count: 0,
            });
            if (error) throw error;
            result = { success: true, message: `Task "${validArgs.title}" created successfully.` };
          } 
          else if (name === 'reschedule_task') {
            const parsed = rescheduleTaskSchema.safeParse(args);
            if (!parsed.success) throw new Error(`Invalid arguments: ${parsed.error.message}`);
            const validArgs = parsed.data;
            const { data: currentTask } = await supabaseAdmin
              .from('tasks')
              .select('rescheduled_count')
              .eq('id', validArgs.task_id)
              .eq('user_id', user.id)
              .single();

            const count = ((currentTask as any)?.rescheduled_count || 0) + 1;

            const { error } = await supabaseAdmin
              .from('tasks')
              .update({
                due_date: validArgs.new_due_date,
                rescheduled_count: count,
                updated_at: new Date().toISOString()
              })
              .eq('id', validArgs.task_id)
              .eq('user_id', user.id);

            if (error) throw error;
            result = { success: true, message: `Task rescheduled to ${validArgs.new_due_date} successfully.` };
          } 
          else if (name === 'update_task') {
            const parsed = updateTaskSchema.safeParse(args);
            if (!parsed.success) throw new Error(`Invalid arguments: ${parsed.error.message}`);
            const validArgs = parsed.data;
            const updates: any = { updated_at: new Date().toISOString() };
            if (validArgs.title !== undefined) updates.title = validArgs.title;
            if (validArgs.description !== undefined) updates.description = validArgs.description;
            if (validArgs.priority !== undefined) updates.priority = validArgs.priority;
            if (validArgs.estimated_minutes !== undefined) updates.estimated_minutes = validArgs.estimated_minutes;

            const { error } = await supabaseAdmin
              .from('tasks')
              .update(updates)
              .eq('id', validArgs.task_id)
              .eq('user_id', user.id);

            if (error) throw error;
            result = { success: true, message: `Task updated successfully.` };
          }
          else if (name === 'complete_task') {
            const parsed = completeTaskSchema.safeParse(args);
            if (!parsed.success) throw new Error(`Invalid arguments: ${parsed.error.message}`);
            const validArgs = parsed.data;
            const updates = validArgs.completed
              ? { completed: true, completed_at: new Date().toISOString(), status: 'done', updated_at: new Date().toISOString() }
              : { completed: false, completed_at: null, status: 'todo', updated_at: new Date().toISOString() };

            const { error } = await supabaseAdmin
              .from('tasks')
              .update(updates)
              .eq('id', validArgs.task_id)
              .eq('user_id', user.id);

            if (error) throw error;
            result = { success: true, message: `Task marked as ${validArgs.completed ? 'completed' : 'todo'} successfully.` };
          } 
          else if (name === 'delete_task') {
            const parsed = deleteTaskSchema.safeParse(args);
            if (!parsed.success) throw new Error(`Invalid arguments: ${parsed.error.message}`);
            const validArgs = parsed.data;
            const { error } = await supabaseAdmin
              .from('tasks')
              .update({ 
                deleted_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', validArgs.task_id)
              .eq('user_id', user.id);

            if (error) throw error;
            result = { success: true, message: `Task deleted successfully.` };
          }
          else if (name === 'create_calendar_block') {
            const parsed = createCalendarBlockSchema.safeParse(args);
            if (!parsed.success) throw new Error(`Invalid arguments: ${parsed.error.message}`);
            const validArgs = parsed.data;
            const { error } = await supabaseAdmin.from('calendar_events').insert({
              user_id: user.id,
              title: validArgs.title,
              start_time: validArgs.start_time,
              end_time: validArgs.end_time,
              linked_task_id: validArgs.linked_task_id || null,
              source: 'schedule',
              status: 'pending',
              is_ai_suggested: true,
            });
            if (error) throw error;
            result = { success: true, message: 'Calendar block created successfully.' };
          }
          else if (name === 'move_calendar_block') {
            const parsed = moveCalendarBlockSchema.safeParse(args);
            if (!parsed.success) throw new Error(`Invalid arguments: ${parsed.error.message}`);
            const validArgs = parsed.data;
            const { error } = await supabaseAdmin.from('calendar_events').update({
              start_time: validArgs.new_start_time,
              end_time: validArgs.new_end_time,
              updated_at: new Date().toISOString()
            }).eq('id', validArgs.event_id).eq('user_id', user.id);
            if (error) throw error;
            result = { success: true, message: 'Calendar block moved successfully.' };
          }
          else if (name === 'accept_block') {
            const parsed = acceptBlockSchema.safeParse(args);
            if (!parsed.success) throw new Error(`Invalid arguments: ${parsed.error.message}`);
            const validArgs = parsed.data;
            const { error } = await supabaseAdmin.from('calendar_events').update({
              status: 'accepted',
              updated_at: new Date().toISOString()
            }).eq('id', validArgs.event_id).eq('user_id', user.id);
            if (error) throw error;
            result = { success: true, message: 'Calendar block accepted.' };
          }
          else if (name === 'reject_block') {
            const parsed = rejectBlockSchema.safeParse(args);
            if (!parsed.success) throw new Error(`Invalid arguments: ${parsed.error.message}`);
            const validArgs = parsed.data;
            const { error } = await supabaseAdmin.from('calendar_events').update({
              is_deleted: true,
              deleted_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }).eq('id', validArgs.event_id).eq('user_id', user.id);
            if (error) throw error;
            result = { success: true, message: 'Calendar block rejected and deleted.' };
          }
          else if (name === 'break_down_task') {
            const parsed = breakDownTaskSchema.safeParse(args);
            if (!parsed.success) throw new Error(`Invalid arguments: ${parsed.error.message}`);
            const validArgs = parsed.data;
            
            const subtaskInserts = validArgs.subtasks.map((st: any) => ({
              user_id: user.id,
              parent_task_id: validArgs.task_id,
              title: st.title,
              estimated_minutes: st.estimated_minutes,
              status: 'todo',
            }));

            const { error } = await supabaseAdmin.from('tasks').insert(subtaskInserts);
            if (error) throw error;
            result = { success: true, message: `Task broken down into ${validArgs.subtasks.length} subtasks.` };
          }
        } catch (opError: any) {
          console.error(`Error executing tool ${name}:`, opError);
          result = { success: false, error: opError.message || 'Operation failed' };
        }

        // Log the tool call
        try {
          await supabaseAdmin.from('bruno_tool_logs').insert({
            user_id: user.id,
            tool_name: name,
            arguments: args,
            result: result,
          });
        } catch (logError) {
          console.error(`Failed to log tool execution to bruno_tool_logs:`, logError);
        }

        // Track tool usage in PostHog
        posthogServer.capture({
          distinctId: user.id,
          event: 'chat_tool_used',
          properties: {
            tool_name: name,
            success: result.success,
          },
        });

        toolMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: name,
          content: JSON.stringify(result),
        });
      }

      let secondResponse: Response;
      let secondOpenAiStartedAt = performance.now();
      
      const makeSecondCall = async (model: string) => {
        const secondController = new AbortController();
        const secondTimeout = setTimeout(() => secondController.abort(), 15000);
        try {
          const res = await Sentry.startSpan(
            { name: `OpenAI Chat Completion - Second Call (${model})`, op: 'ai.completion' },
            async () => {
              return await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${openaiApiKey}`,
                },
                body: JSON.stringify({
                  model,
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
                signal: secondController.signal,
              });
            }
          );
          clearTimeout(secondTimeout);
          return res;
        } catch (err) {
          clearTimeout(secondTimeout);
          throw err;
        }
      };


      try {
        secondResponse = await makeSecondCall('gpt-4o-mini');
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message.includes('timeout')) {
          console.log('[Bruno Chat] Second call timed out with gpt-4o-mini, falling back to gpt-4o');
          secondOpenAiStartedAt = performance.now();
          secondResponse = await makeSecondCall('gpt-4o');
        } else {
          throw err;
        }
      }
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

    // --- CONSUME RATE LIMIT ONLY AFTER SUCCESSFUL RESPONSE ---
    await consumeHourlyRateLimit(user.id, 'bruno-chat');

    return jsonWithDiagnostics({ text }, undefined, diagnostics);
  } catch (error: any) {
    console.error('Error in Bruno chat:', error?.stack || error);
    Sentry.captureException(error);
    if (error?.name === 'AbortError') {
      return jsonWithDiagnostics({ error: 'Bruno took too long to respond (timeout)' }, { status: 504 });
    }
    return jsonWithDiagnostics({ error: 'Failed to connect to Bruno', details: error?.message }, { status: 500 });
  }
}
