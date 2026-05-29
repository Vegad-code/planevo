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
import { streamText, tool, stepCountIs, jsonSchema, convertToModelMessages } from 'ai';
import { openai } from '@ai-sdk/openai';

// --- Request validation (Zod v3 is fine here, not passed to AI SDK) ---
const requestSchema = z.object({
  messages: z.array(z.any()).min(1).max(50),
  assignmentId: z.string().optional(),
  diagnostics: z.boolean().optional(),
});

// --- Tool schemas as raw JSON Schema objects ---
// We use jsonSchema() from 'ai' to bypass the broken Zod v3→v4 conversion.
// This sends valid JSON Schema directly to OpenAI without any Zod intermediary.

const createTaskParams = jsonSchema({
  type: 'object' as const,
  properties: {
    title: { type: 'string', description: 'Task title' },
    priority: { type: 'string', enum: ['low', 'medium', 'high'], description: "Task priority. Default to 'medium'" },
    due_date: { type: 'string', description: 'ISO 8601 date, or empty string if unknown' },
    estimated_minutes: { type: 'number', description: 'Duration in minutes, or 30 if unknown' },
    description: { type: 'string', description: 'Task description, or empty string if none' },
  },
  required: ['title', 'priority', 'due_date', 'estimated_minutes', 'description'],
  additionalProperties: false,
});

const rescheduleTaskParams = jsonSchema({
  type: 'object' as const,
  properties: {
    task_id: { type: 'string', description: 'UUID of the task to reschedule' },
    new_due_date: { type: 'string', description: 'New ISO 8601 due date, or empty string to remove' },
  },
  required: ['task_id', 'new_due_date'],
  additionalProperties: false,
});

const updateTaskParams = jsonSchema({
  type: 'object' as const,
  properties: {
    task_id: { type: 'string', description: 'UUID of the task to update' },
    title: { type: 'string', description: 'New title, or empty string to keep current' },
    description: { type: 'string', description: 'New description, or empty string to keep current' },
    priority: { type: 'string', enum: ['low', 'medium', 'high'], description: "New priority, or 'medium' to keep current" },
    estimated_minutes: { type: 'number', description: 'New duration in minutes, or 0 to keep current' },
  },
  required: ['task_id', 'title', 'description', 'priority', 'estimated_minutes'],
  additionalProperties: false,
});

const completeTaskParams = jsonSchema({
  type: 'object' as const,
  properties: {
    task_id: { type: 'string', description: 'UUID of the task' },
    completed: { type: 'boolean', description: 'Whether the task is completed' },
  },
  required: ['task_id', 'completed'],
  additionalProperties: false,
});

const deleteTaskParams = jsonSchema({
  type: 'object' as const,
  properties: {
    task_id: { type: 'string', description: 'UUID of the task to delete' },
  },
  required: ['task_id'],
  additionalProperties: false,
});

const createCalendarBlockParams = jsonSchema({
  type: 'object' as const,
  properties: {
    title: { type: 'string', description: 'Block title' },
    start_time: { type: 'string', description: 'ISO 8601 datetime format' },
    end_time: { type: 'string', description: 'ISO 8601 datetime format' },
    linked_task_id: { type: 'string', description: 'UUID of linked task, or empty string if none' },
  },
  required: ['title', 'start_time', 'end_time', 'linked_task_id'],
  additionalProperties: false,
});

const moveCalendarBlockParams = jsonSchema({
  type: 'object' as const,
  properties: {
    event_id: { type: 'string', description: 'UUID of the calendar event' },
    new_start_time: { type: 'string', description: 'ISO 8601 datetime format' },
    new_end_time: { type: 'string', description: 'ISO 8601 datetime format' },
  },
  required: ['event_id', 'new_start_time', 'new_end_time'],
  additionalProperties: false,
});

const acceptBlockParams = jsonSchema({
  type: 'object' as const,
  properties: {
    event_id: { type: 'string', description: 'UUID of the calendar event to accept' },
  },
  required: ['event_id'],
  additionalProperties: false,
});

const rejectBlockParams = jsonSchema({
  type: 'object' as const,
  properties: {
    event_id: { type: 'string', description: 'UUID of the calendar event to reject' },
  },
  required: ['event_id'],
  additionalProperties: false,
});

const breakDownTaskParams = jsonSchema({
  type: 'object' as const,
  properties: {
    task_id: { type: 'string', description: 'UUID of the task to break down' },
    subtasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Subtask title' },
          estimated_minutes: { type: 'number', description: 'Estimated minutes for the subtask' },
        },
        required: ['title', 'estimated_minutes'],
        additionalProperties: false,
      },
      description: 'Array of subtasks to create',
    },
  },
  required: ['task_id', 'subtasks'],
  additionalProperties: false,
});

export async function POST(request: NextRequest) {
  const latencyTimer = createAiLatencyTimer('bruno-chat');
  let openAiMs: number | null = null;
  const startAt = performance.now();

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
    const rateLimitResult = await validateHourlyRateLimit(authUser.id, 'bruno-chat', authUser.email);
    latencyTimer.mark('rate_limit');
    
    if (!rateLimitResult.allowed) {
      return jsonWithDiagnostics({ 
        error: rateLimitResult.error, 
        message: rateLimitResult.message || 'You have reached your hourly AI limit.' 
      }, { status: rateLimitResult.error === 'Unauthorized' ? 401 : 429 });
    }

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
    latencyTimer.mark('assignments');

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

    const systemPrompt = `You are Bruno, a hyper-intelligent AI Scholar, Elite Academic Advisor, and daily planning assistant for "Planevo". 

User Name: ${profile?.name || 'User'}

CURRENT USER TASKS:
${taskListContext}

USER MEMORY (Apply these preferences):
${memoryContext}
${assignmentContext}

CORE MISSION:
You are as capable as the world's most advanced LLMs. You are an elite strategic planner and academic advisor. Your mission is to not only help the user manage their time but to actively assist them in achieving their highest ambitions (e.g., top-tier college admissions, career success). 

Rules:
1. Speak as a hyper-intelligent, encouraging bear who gives elite, no-nonsense advice.
2. **Push back and guide:** If a user proposes a flawed plan (like skipping foundational classes, cramming too much, or prioritizing the wrong tasks), you must politely but firmly explain why it is a bad idea and propose a smarter path. 
3. **Be hyper-specific:** When giving advice, give exact, actionable steps (e.g., "Tomorrow, do exactly these 3 things"). Do not give vague platitudes.
4. **Build the schedule directly:** You are a heavy lifter. Use the \`create_calendar_block\` tool aggressively to populate entire weeks of balanced, well-thought-out study schedules directly onto the user's calendar when asked. Ensure you spread out work logically.
5. **Deconstruct complexity:** If a task is huge, offer to "Deconstruct" it into 15-minute micro-steps using the \`break_down_task\` tool.
6. When you create, reschedule, complete, or delete a task, use the corresponding tool. Inform the user of what you did. Always make sure to refer to tasks by their exact name when interacting with them.
7. Use calendar block tools (\`create_calendar_block\`, \`move_calendar_block\`, etc.) to actively manage and optimize the user's schedule. Do the work for them.`;

    const logToolExecution = async (name: string, args: any, result: any) => {
      try {
        await supabaseAdmin.from('bruno_tool_logs').insert({
          user_id: user.id,
          tool_name: name,
          arguments: args,
          result: result,
        });
        posthogServer.capture({
          distinctId: user.id,
          event: 'chat_tool_used',
          properties: { tool_name: name, success: result.success },
        });
      } catch (e) {
        console.error('Failed to log tool execution:', e);
      }
    };

    const tools = {
      create_task: tool({
        description: 'Create a new task for the user.',
        inputSchema: createTaskParams,
        execute: async (validArgs: any) => {
          const { error } = await supabaseAdmin.from('tasks').insert({
            user_id: user.id,
            title: validArgs.title.trim(),
            description: validArgs.description ? validArgs.description.trim() : null,
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
          const result = { success: true, message: `Task "${validArgs.title}" created successfully.` };
          await logToolExecution('create_task', validArgs, result);
          return result;
        }
      } as any),
      reschedule_task: tool({
        description: 'Reschedule an existing task to a new due date.',
        inputSchema: rescheduleTaskParams,
        execute: async (validArgs: any) => {
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
              due_date: validArgs.new_due_date || null,
              rescheduled_count: count,
              updated_at: new Date().toISOString()
            })
            .eq('id', validArgs.task_id)
            .eq('user_id', user.id);

          if (error) throw error;
          const result = { success: true, message: `Task rescheduled to ${validArgs.new_due_date} successfully.` };
          await logToolExecution('reschedule_task', validArgs, result);
          return result;
        }
      } as any),
      update_task: tool({
        description: 'Update a task\'s title, description, priority, or estimated duration.',
        inputSchema: updateTaskParams,
        execute: async (validArgs: any) => {
          const updates: any = { updated_at: new Date().toISOString() };
          if (validArgs.title) updates.title = validArgs.title;
          if (validArgs.description) updates.description = validArgs.description;
          if (validArgs.priority && validArgs.priority !== 'medium') updates.priority = validArgs.priority;
          if (validArgs.estimated_minutes > 0) updates.estimated_minutes = validArgs.estimated_minutes;

          const { error } = await supabaseAdmin
            .from('tasks')
            .update(updates)
            .eq('id', validArgs.task_id)
            .eq('user_id', user.id);

          if (error) throw error;
          const result = { success: true, message: `Task updated successfully.` };
          await logToolExecution('update_task', validArgs, result);
          return result;
        }
      } as any),
      complete_task: tool({
        description: 'Mark a task as completed or uncompleted.',
        inputSchema: completeTaskParams,
        execute: async (validArgs: any) => {
          const updates = validArgs.completed
            ? { completed: true, completed_at: new Date().toISOString(), status: 'done', updated_at: new Date().toISOString() }
            : { completed: false, completed_at: null, status: 'todo', updated_at: new Date().toISOString() };

          const { error } = await supabaseAdmin
            .from('tasks')
            .update(updates)
            .eq('id', validArgs.task_id)
            .eq('user_id', user.id);

          if (error) throw error;
          const result = { success: true, message: `Task marked as ${validArgs.completed ? 'completed' : 'todo'} successfully.` };
          await logToolExecution('complete_task', validArgs, result);
          return result;
        }
      } as any),
      delete_task: tool({
        description: 'Delete a task (soft delete).',
        inputSchema: deleteTaskParams,
        execute: async (validArgs: any) => {
          const { error } = await supabaseAdmin
            .from('tasks')
            .update({ 
              deleted_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', validArgs.task_id)
            .eq('user_id', user.id);

          if (error) throw error;
          const result = { success: true, message: `Task deleted successfully.` };
          await logToolExecution('delete_task', validArgs, result);
          return result;
        }
      } as any),
      create_calendar_block: tool({
        description: 'Create a new calendar block (event).',
        inputSchema: createCalendarBlockParams,
        execute: async (validArgs: any) => {
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
          const result = { success: true, message: 'Calendar block created successfully.' };
          await logToolExecution('create_calendar_block', validArgs, result);
          return result;
        }
      } as any),
      move_calendar_block: tool({
        description: 'Move an existing calendar block to a new time.',
        inputSchema: moveCalendarBlockParams,
        execute: async (validArgs: any) => {
          const { error } = await supabaseAdmin.from('calendar_events').update({
            start_time: validArgs.new_start_time,
            end_time: validArgs.new_end_time,
            updated_at: new Date().toISOString()
          }).eq('id', validArgs.event_id).eq('user_id', user.id);
          if (error) throw error;
          const result = { success: true, message: 'Calendar block moved successfully.' };
          await logToolExecution('move_calendar_block', validArgs, result);
          return result;
        }
      } as any),
      accept_block: tool({
        description: 'Accept an AI-suggested calendar block.',
        inputSchema: acceptBlockParams,
        execute: async (validArgs: any) => {
          const { error } = await supabaseAdmin.from('calendar_events').update({
            status: 'accepted',
            updated_at: new Date().toISOString()
          }).eq('id', validArgs.event_id).eq('user_id', user.id);
          if (error) throw error;
          const result = { success: true, message: 'Calendar block accepted.' };
          await logToolExecution('accept_block', validArgs, result);
          return result;
        }
      } as any),
      reject_block: tool({
        description: 'Reject (delete) an AI-suggested calendar block.',
        inputSchema: rejectBlockParams,
        execute: async (validArgs: any) => {
          const { error } = await supabaseAdmin.from('calendar_events').update({
            is_deleted: true,
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).eq('id', validArgs.event_id).eq('user_id', user.id);
          if (error) throw error;
          const result = { success: true, message: 'Calendar block rejected and deleted.' };
          await logToolExecution('reject_block', validArgs, result);
          return result;
        }
      } as any),
      break_down_task: tool({
        description: 'Break down a complex task into smaller subtasks (15-min increments).',
        inputSchema: breakDownTaskParams,
        execute: async (validArgs: any) => {
          const subtaskInserts = validArgs.subtasks.map((st: any) => ({
            user_id: user.id,
            parent_task_id: validArgs.task_id,
            title: st.title,
            estimated_minutes: st.estimated_minutes,
            status: 'todo',
          }));

          const { error } = await supabaseAdmin.from('tasks').insert(subtaskInserts);
          if (error) throw error;
          const result = { success: true, message: `Task broken down into ${validArgs.subtasks.length} subtasks.` };
          await logToolExecution('break_down_task', validArgs, result);
          return result;
        }
      } as any),
    };

    latencyTimer.mark('openai');
    const modelMessages = await convertToModelMessages(messages);
    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(5),
      onFinish: async () => {
        // --- CONSUME RATE LIMIT ONLY AFTER SUCCESSFUL STREAM COMPLETION ---
        await consumeHourlyRateLimit(user.id, 'bruno-chat');
      }
    });

    return result.toUIMessageStreamResponse({
      headers: {
        'Server-Timing': buildServerTimingHeader(latencyTimer.complete(performance.now() - startAt)),
      }
    });
  } catch (error: any) {
    console.error('Error in Bruno chat:', error?.stack || error);
    Sentry.captureException(error);
    if (error?.name === 'AbortError') {
      return jsonWithDiagnostics({ error: 'Bruno took too long to respond (timeout)' }, { status: 504 });
    }
    return jsonWithDiagnostics({ error: 'Failed to connect to Bruno', details: error?.message }, { status: 500 });
  }
}
