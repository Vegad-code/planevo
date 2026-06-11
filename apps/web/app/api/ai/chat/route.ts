import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { validateHourlyRateLimit, checkRateLimitForUser } from '@/lib/auth/rateLimit';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getBrunoMasterContext } from '@/lib/ai/orchestrator';
import {
  buildServerTimingHeader,
  createAiLatencyTimer,
  shouldReportLatencyDiagnostic,
} from '@/lib/diagnostics/aiLatency';
import { getUserAIMemory, buildMemoryContext, recordPlanFeedbackInMemory } from '@/lib/ai/memory';
import type { PlanDraftItem } from '@/lib/ai/memory';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { normalizePlanType } from '@/lib/auth/plan-types';
import { posthogServer } from '@/lib/posthog-server';
import { streamText, generateText, tool, stepCountIs, jsonSchema, convertToModelMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { pushEventToGoogle, hasGoogleWriteScope } from '@/lib/integrations/google-calendar';

// Secure message schema to prevent role spoofing and excessive payload sizes
const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'tool']),
  content: z.string().max(6000).or(z.array(z.any())).optional().nullable(),
}).passthrough();

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(50),
  assignmentId: z.string().optional(),
  diagnostics: z.boolean().optional(),
  isMobile: z.boolean().optional(),
  timeZone: z.string().optional(),
  localTime: z.string().optional(),
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
    description: { type: 'string', description: 'Detailed execution instructions, resources, and notes' },
    start_time: { type: 'string', description: 'ISO 8601 datetime format' },
    end_time: { type: 'string', description: 'ISO 8601 datetime format' },
    linked_task_id: { type: 'string', description: 'UUID of linked task, or empty string if none' },
  },
  required: ['title', 'description', 'start_time', 'end_time'],
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

// --- PREMIUM TOOLS: Plan Draft Mode ---

const proposePlanDraftParams = jsonSchema({
  type: 'object' as const,
  properties: {
    plan_title: { type: 'string', description: 'Title for the overall plan (e.g., "Monday Study Plan")' },
    plan_objective: { type: 'string', description: 'Why are we doing this plan? What does success look like?' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task title with optional emoji prefix (e.g., "🧪 ACT Full Diagnostic Test")' },
          start_time: { type: 'string', description: 'ISO 8601 datetime for when this task starts' },
          end_time: { type: 'string', description: 'ISO 8601 datetime for when this task ends' },
          energy_level: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Required energy/focus level for this task' },
          execution_description: { type: 'string', description: 'Detailed execution instructions: what exactly to do, rules of engagement (e.g., no phone), materials needed, what to do immediately after. Be specific and actionable.' },
        },
        required: ['title', 'start_time', 'end_time', 'energy_level', 'execution_description'],
        additionalProperties: false,
      },
      description: 'Ordered array of plan items with execution instructions',
    },
  },
  required: ['plan_title', 'plan_objective', 'items'],
  additionalProperties: false,
});

const commitPlanParams = jsonSchema({
  type: 'object' as const,
  properties: {
    plan_title: { type: 'string', description: 'Title of the plan being committed' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task title' },
          start_time: { type: 'string', description: 'ISO 8601 datetime' },
          end_time: { type: 'string', description: 'ISO 8601 datetime' },
          energy_level: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Energy level' },
          execution_description: { type: 'string', description: 'Execution instructions' },
        },
        required: ['title', 'start_time', 'end_time', 'energy_level', 'execution_description'],
        additionalProperties: false,
      },
      description: 'The approved plan items to commit',
    },
    sync_to_google: { type: 'boolean', description: 'Whether to sync the created events to Google Calendar' },
    commit_type: { type: 'string', enum: ['tasks_only', 'calendar_only', 'both'], description: 'Whether to create Tasks in the backlog, Events on the calendar, or both.' },
  },
  required: ['plan_title', 'items', 'sync_to_google', 'commit_type'],
  additionalProperties: false,
});

const editTaskParams = jsonSchema({
  type: 'object' as const,
  properties: {
    task_id: { type: 'string', description: 'The ID of the task to edit' },
    title: { type: 'string', description: 'New title (optional)' },
    description: { type: 'string', description: 'New description (optional)' },
    due_date: { type: 'string', description: 'New due date in YYYY-MM-DD format (optional)' },
    status: { type: 'string', enum: ['todo', 'in_progress', 'done'], description: 'New status (optional)' },
    priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'New priority (optional)' }
  },
  required: ['task_id'],
  additionalProperties: false,
});

const createCalendarEventParams = jsonSchema({
  type: 'object' as const,
  properties: {
    title: { type: 'string', description: 'Event title' },
    description: { type: 'string', description: 'Event description (optional)' },
    start_time: { type: 'string', description: 'ISO 8601 start datetime' },
    end_time: { type: 'string', description: 'ISO 8601 end datetime' },
    energy_level: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Energy level needed' }
  },
  required: ['title', 'start_time', 'end_time'],
  additionalProperties: false,
});

const editCalendarEventParams = jsonSchema({
  type: 'object' as const,
  properties: {
    event_id: { type: 'string', description: 'The ID of the calendar event to edit' },
    title: { type: 'string', description: 'New title (optional)' },
    description: { type: 'string', description: 'New description (optional)' },
    start_time: { type: 'string', description: 'New ISO 8601 start datetime (optional)' },
    end_time: { type: 'string', description: 'New ISO 8601 end datetime (optional)' }
  },
  required: ['event_id'],
  additionalProperties: false,
});

const readScheduleParams = jsonSchema({
  type: 'object' as const,
  properties: {
    start_date: { type: 'string', description: 'ISO 8601 start datetime to read' },
    end_date: { type: 'string', description: 'ISO 8601 end datetime to read' }
  },
  required: ['start_date', 'end_date'],
  additionalProperties: false,
});

const updatePreferredNameParams = jsonSchema({
  type: 'object' as const,
  properties: {
    preferred_name: { type: 'string', description: 'The new preferred name the user wants to be called.' },
  },
  required: ['preferred_name'],
  additionalProperties: false,
});

export async function POST(request: NextRequest) {
  const latencyTimer = createAiLatencyTimer('bruno-chat');
  const openAiMs: number | null = null;
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
      return jsonWithDiagnostics({ error: authError || 'Unauthorized' }, { status: 401 });
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

    // Enforce daily limit AND atomically consume the quota before streaming
    const dailyRateLimitResult = await checkRateLimitForUser(authUser.id, 'bruno-chat', authUser.email);
    if (!dailyRateLimitResult.allowed) {
      return jsonWithDiagnostics({ 
        error: dailyRateLimitResult.error, 
        message: dailyRateLimitResult.message || 'You have reached your daily AI limit.' 
      }, { status: 429 });
    }

    const user = authUser;

    const parsedBody = requestSchema.safeParse(await request.json());
    latencyTimer.mark('parse_body');

    if (!parsedBody.success) {
      console.error('Validation error:', parsedBody.error);
      return jsonWithDiagnostics({ error: 'Invalid messages', details: parsedBody.error.format() }, { status: 400 });
    }

    const { diagnostics, messages, assignmentId, isMobile, timeZone, localTime } = parsedBody.data;

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('[Bruno Chat] OPENAI_API_KEY is missing from environment variables.');
      return jsonWithDiagnostics({ error: 'OpenAI API key missing' }, { status: 500 }, diagnostics);
    }

    // Get user context for better responses (use admin client to bypass RLS for mobile)
    const [
      { data: profile }
    ] = await Promise.all([
      supabaseAdmin
        .from('users')
        .select('name, plan_type, canvas_token, google_calendar_refresh_token, energy_preference, scheduling_preferences')
        .eq('id', user.id)
        .single()
    ]);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (tasks as any[]).map(t => `- [${t.status}] "${t.title}" (ID: ${t.id}, Due: ${t.due_date || 'No due date'}, Priority: ${t.priority}, Duration: ${t.estimated_minutes}m)`).join('\n')
      : 'No active tasks found.';

    // Fetch calendar events for the next 7 days for context
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const { data: events } = await supabaseAdmin
      .from('calendar_events')
      .select('id, title, start_time, end_time, status')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .gte('start_time', today.toISOString())
      .lt('start_time', nextWeek.toISOString())
      .order('start_time', { ascending: true })
      .limit(100);

    const calendarListContext = events && events.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (events as any[]).map(e => `- [${e.status}] "${e.title}" (ID: ${e.id}, ${new Date(e.start_time).toLocaleString()} to ${new Date(e.end_time).toLocaleTimeString()})`).join('\n')
      : 'No upcoming calendar events for the next 7 days.';

    // Get learned memory
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // Determine if user is on a premium plan
    const userPlanType = normalizePlanType(profile?.plan_type);
    const isPremium = userPlanType !== 'free' && userPlanType !== 'canceled';

    // Check if user has Google Calendar connected WITH write scope
    const hasGoogleCalendar = !!profile?.google_calendar_refresh_token;
    const hasGoogleWrite = hasGoogleCalendar ? await hasGoogleWriteScope(user.id) : false;

    const draftModeInstructions = isPremium ? `

ADVANCED PLANNING MODE (Premium Feature):
You have access to an advanced planning system. When a user asks you to plan their day, week, or any project:
1. Use the \`propose_plan_draft\` tool FIRST. Do NOT create tasks or calendar blocks directly.
2. Every item in the draft MUST have a rich \`execution_description\` that details:
   - Exactly WHAT to do (specific actions, not vague goals)
   - Rules of engagement (e.g., "No phone, no breaks beyond official ones")
   - Materials or resources needed (e.g., "Use the free official ACT practice test at act.org")
   - What to do immediately after completing this task
3. After proposing a draft, discuss it with the user. Make adjustments if they ask.
4. Only call \`commit_plan\` when the user explicitly approves (e.g., "looks good", "approve", "let's do it").
5. The commit_plan tool will create both tasks AND calendar events, and optionally sync to Google Calendar.
6. NEVER skip the draft step and directly create tasks/events when the user is asking for a multi-step plan.` : `

NOTE: If the user asks you to build a detailed multi-step plan with calendar integration, let them know this is a premium feature called "Advanced AI Planning" available on the paid plan. You can still help them with individual tasks and quick scheduling using the basic tools.`;

    const userTimeZone = timeZone || 'UTC';
    const userLocalTime = localTime || new Date().toLocaleString();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prefs = (profile?.scheduling_preferences || {}) as any;

    const systemPrompt = `You are Bruno, a hyper-intelligent AI Scholar, Elite Academic Advisor, and Master Planner.
Your job is to read the user's workload (assignments, events, tasks) and architect the perfect schedule for them.

LOCAL TIME: ${userLocalTime} (Time Zone: ${prefs.timezone || userTimeZone})
VERY IMPORTANT: When scheduling tasks or events, YOU MUST schedule them during the user's normal daytime waking hours (e.g., 8:00 AM to 10:00 PM in their local time) UNLESS they explicitly ask otherwise. NEVER schedule things at 1:00 AM or in the middle of the night. Calculate the proper ISO 8601 strings based on their local time offset.
When proposing tasks or plan drafts, YOU MUST ALWAYS populate the \`execution_description\` or \`description\` with highly detailed instructions, including any helpful links, resources, or sources for them to use. NEVER leave it blank or vague.

For speed and efficiency, keep your conversational responses brief and get straight to the point. Do not output massive walls of conversational text before calling the tool.

User Name: ${profile?.name || 'User'}
User Plan: ${userPlanType}
Context: ${prefs.context_type || 'Professional'} (School/Workplace: ${prefs.organization_name || 'N/A'})
Planning Baseline:
- Workload Style: ${prefs.workload_style || 'balanced'}
- Default Task Duration: ${prefs.default_task_duration || 30} mins
- Energy Preference: ${profile?.energy_preference || 'balanced'}

CURRENT USER TASKS:
${taskListContext}

UPCOMING EVENTS (Next 7 Days):
${calendarListContext}

USER MEMORY (Apply these preferences):
CRITICAL: The USER MEMORY below reflects the user's explicit preferences. You MUST adhere to these preferences over any default conversational style or planning rules.
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
7. Use calendar block tools (\`create_calendar_block\`, \`move_calendar_block\`, etc.) to actively manage and optimize the user's schedule. Do the work for them.
8. If the user tells you they want to go by a different name, use the \`update_preferred_name\` tool to remember it permanently.
${draftModeInstructions}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
      reschedule_task: tool({
        description: 'Reschedule an existing task to a new due date.',
        inputSchema: rescheduleTaskParams,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        execute: async (validArgs: any) => {
          const { data: currentTask } = await supabaseAdmin
            .from('tasks')
            .select('rescheduled_count')
            .eq('id', validArgs.task_id)
            .eq('user_id', user.id)
            .single();

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
      update_task: tool({
        description: 'Update a task\'s title, description, priority, or estimated duration.',
        inputSchema: updateTaskParams,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        execute: async (validArgs: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
      complete_task: tool({
        description: 'Mark a task as completed or uncompleted.',
        inputSchema: completeTaskParams,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
      delete_task: tool({
        description: 'Delete a task (soft delete).',
        inputSchema: deleteTaskParams,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
      update_preferred_name: tool({
        description: 'Update the user\'s preferred name if they ask to be called something else.',
        inputSchema: updatePreferredNameParams,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        execute: async (validArgs: any) => {
          const { error } = await supabaseAdmin
            .from('users')
            .update({
              name: validArgs.preferred_name
            })
            .eq('id', user.id);

          if (error) throw error;
          const result = { success: true, message: `Preferred name updated to ${validArgs.preferred_name}.` };
          await logToolExecution('update_preferred_name', validArgs, result);
          return result;
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
      create_calendar_block: tool({
        description: 'Create a new calendar block (event).',
        inputSchema: createCalendarBlockParams,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        execute: async (validArgs: any) => {
          const { error } = await supabaseAdmin.from('calendar_events').insert({
            user_id: user.id,
            title: validArgs.title,
            description: validArgs.description || null,
            bruno_notes: validArgs.description || null,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
      move_calendar_block: tool({
        description: 'Move an existing calendar block to a new time.',
        inputSchema: moveCalendarBlockParams,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
      accept_block: tool({
        description: 'Accept an AI-suggested calendar block.',
        inputSchema: acceptBlockParams,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
      reject_block: tool({
        description: 'Reject (delete) an AI-suggested calendar block.',
        inputSchema: rejectBlockParams,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
      break_down_task: tool({
        description: 'Break down a complex task into smaller subtasks (15-min increments).',
        inputSchema: breakDownTaskParams,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        execute: async (validArgs: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
      // --- PREMIUM TOOLS: conditionally included ---
      ...(isPremium ? {
        propose_plan_draft: tool({
          description: 'Propose a plan draft for user review. Does NOT create any tasks or events. Use this FIRST when the user asks for a multi-step plan.',
          inputSchema: proposePlanDraftParams,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          execute: async (validArgs: any) => {
            // This tool intentionally does NOT mutate the database.
            // It returns the draft data so the frontend can render a rich preview card.
            const result = {
              success: true,
              type: 'plan_draft',
              plan_title: validArgs.plan_title,
              plan_objective: validArgs.plan_objective,
              items: validArgs.items,
              item_count: validArgs.items.length,
              message: `I've drafted "${validArgs.plan_title}" with ${validArgs.items.length} items. Review the plan above and let me know if you'd like any changes, or say "approve" to lock it in!`,
            };
            await logToolExecution('propose_plan_draft', validArgs, { success: true, item_count: validArgs.items.length });
            return result;
          }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any),
        commit_plan: tool({
          description: 'Commit an approved plan draft. Creates tasks AND/OR calendar events based on commit_type. Only call this after the user explicitly approves.',
          inputSchema: commitPlanParams,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          execute: async (validArgs: any) => {
            const items = validArgs.items as PlanDraftItem[];
            const commitType = validArgs.commit_type as 'tasks_only' | 'calendar_only' | 'both';
            const createdTasks: string[] = [];
            const createdEvents: string[] = [];
            const googleSyncResults: string[] = [];

            for (const item of items) {
              let taskId: string | null = null;
              
              // 1. Create the task (if tasks_only or both)
              if (commitType === 'tasks_only' || commitType === 'both') {
                const startMs = new Date(item.start_time).getTime();
                const endMs = new Date(item.end_time).getTime();
                const durationMinutes = Math.round((endMs - startMs) / 60000);

                const { data: taskData, error: taskError } = await supabaseAdmin.from('tasks').insert({
                  user_id: user.id,
                  title: item.title,
                  description: item.execution_description,
                  estimated_minutes: durationMinutes || 30,
                  due_date: item.start_time.split('T')[0],
                  priority: item.energy_level === 'high' ? 'high' : item.energy_level === 'low' ? 'low' : 'medium',
                  status: 'todo',
                  completed: false,
                  is_ai_suggested: true,
                  ai_confidence_score: 0.9,
                  is_recurring: false,
                  rescheduled_count: 0,
                  energy_level_required: item.energy_level,
                }).select('id').single();

                if (taskError) {
                  console.error('Failed to create task:', taskError);
                } else {
                  createdTasks.push(item.title);
                  taskId = taskData?.id;
                }
              }

              // 2. Create the calendar event (if calendar_only or both)
              if (commitType === 'calendar_only' || commitType === 'both') {
                const eventPayload = {
                  user_id: user.id,
                  title: item.title,
                  description: item.execution_description,
                  start_time: item.start_time,
                  end_time: item.end_time,
                  linked_task_id: taskId,
                  source: 'plan_draft',
                  status: 'accepted',
                  is_ai_suggested: true,
                  energy_level: item.energy_level,
                  bruno_notes: item.execution_description,
                };

                const { data: eventData, error: eventError } = await supabaseAdmin
                  .from('calendar_events')
                  .insert(eventPayload)
                  .select('id')
                  .single();

                if (eventError) {
                  console.error('Failed to create calendar event:', eventError);
                } else {
                  createdEvents.push(item.title);

                  // 3. Optionally sync to Google Calendar
                  if (validArgs.sync_to_google && hasGoogleWrite && eventData) {
                    try {
                      const pushResult = await pushEventToGoogle(user.id, {
                        id: eventData.id,
                        title: item.title,
                        description: item.execution_description,
                        start_time: item.start_time,
                        end_time: item.end_time,
                        is_all_day: false,
                      });
                      if (pushResult?.success) {
                        googleSyncResults.push(item.title);
                      }
                    } catch (e) {
                      console.error('Google sync failed for:', item.title, e);
                    }
                  }
                }
              }
            }

            // 4. Record plan feedback in memory (learn from approved plan)
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await recordPlanFeedbackInMemory(supabaseAdmin as any, user.id, items);
            } catch (e) {
              console.error('Failed to record plan feedback in memory:', e);
            }

            const googleMsg = googleSyncResults.length > 0
              ? ` ${googleSyncResults.length} events synced to Google Calendar.`
              : (validArgs.sync_to_google && !hasGoogleWrite
                ? (hasGoogleCalendar ? ' (Google Calendar is connected in read-only mode — events saved locally.)' : ' (Google Calendar not connected — events saved locally.)')
                : '');

            const result = {
              success: true,
              message: `Plan "${validArgs.plan_title}" committed! Created ${createdTasks.length} tasks and ${createdEvents.length} calendar events.${googleMsg}`,
              created_tasks: createdTasks.length,
              created_events: createdEvents.length,
              google_synced: googleSyncResults.length,
            };
            await logToolExecution('commit_plan', { plan_title: validArgs.plan_title, commit_type: commitType, item_count: items.length, sync_to_google: validArgs.sync_to_google }, result);
            return result;
          }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any),
        edit_task: tool({
          description: 'Edit details of an existing task (e.g., change title, description, due date, status, priority).',
          inputSchema: editTaskParams,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          execute: async (validArgs: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updates: any = {};
            if (validArgs.title) updates.title = validArgs.title;
            if (validArgs.description) updates.description = validArgs.description;
            if (validArgs.due_date) updates.due_date = validArgs.due_date;
            if (validArgs.status) updates.status = validArgs.status;
            if (validArgs.priority) updates.priority = validArgs.priority;
            
            const { error } = await supabaseAdmin.from('tasks').update(updates).eq('id', validArgs.task_id).eq('user_id', user.id);
            if (error) throw error;
            const result = { success: true, message: `Task ${validArgs.task_id} updated successfully.` };
            await logToolExecution('edit_task', validArgs, result);
            return result;
          }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any),
        create_calendar_event: tool({
          description: 'Directly create a single calendar event block.',
          inputSchema: createCalendarEventParams,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          execute: async (validArgs: any) => {
            const { error } = await supabaseAdmin.from('calendar_events').insert({
              user_id: user.id,
              title: validArgs.title,
              description: validArgs.description || null,
              start_time: validArgs.start_time,
              end_time: validArgs.end_time,
              status: 'accepted',
              is_ai_suggested: true,
              energy_level: validArgs.energy_level || 'medium',
            });
            if (error) throw error;
            const result = { success: true, message: `Event "${validArgs.title}" created successfully.` };
            await logToolExecution('create_calendar_event', validArgs, result);
            return result;
          }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any),
        edit_calendar_event: tool({
          description: 'Edit details of an existing calendar event (e.g., change title, description, start time, end time).',
          inputSchema: editCalendarEventParams,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          execute: async (validArgs: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updates: any = { updated_at: new Date().toISOString() };
            if (validArgs.title) updates.title = validArgs.title;
            if (validArgs.description) updates.description = validArgs.description;
            if (validArgs.start_time) updates.start_time = validArgs.start_time;
            if (validArgs.end_time) updates.end_time = validArgs.end_time;
            
            const { error } = await supabaseAdmin.from('calendar_events').update(updates).eq('id', validArgs.event_id).eq('user_id', user.id);
            if (error) throw error;
            const result = { success: true, message: `Event ${validArgs.event_id} updated successfully.` };
            await logToolExecution('edit_calendar_event', validArgs, result);
            return result;
          }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any),
        read_schedule: tool({
          description: 'Read the user\'s schedule (tasks and events) for a specific date range if they ask about something beyond the current day.',
          inputSchema: readScheduleParams,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          execute: async (validArgs: any) => {
            const [{ data: tasks }, { data: events }] = await Promise.all([
              supabaseAdmin.from('tasks').select('id, title, status, due_date, priority').eq('user_id', user.id).is('deleted_at', null).gte('due_date', validArgs.start_date.split('T')[0]).lte('due_date', validArgs.end_date.split('T')[0]),
              supabaseAdmin.from('calendar_events').select('id, title, start_time, end_time, status').eq('user_id', user.id).is('deleted_at', null).gte('start_time', validArgs.start_date).lte('start_time', validArgs.end_date)
            ]);
            const result = { 
              success: true, 
              tasks: tasks || [], 
              events: events || [] 
            };
            await logToolExecution('read_schedule', validArgs, { success: true, task_count: result.tasks.length, event_count: result.events.length });
            return result;
          }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any),
      } : {}),
    };

    latencyTimer.mark('openai');
    
    // Polyfill .parts for older clients (like our mobile app) that send standard {role, content}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalizedMessages = (messages as any[]).map(m => {
      if (m.parts) return m;
      return {
        ...m,
        parts: [{ type: 'text', text: typeof m.content === 'string' ? m.content : '' }]
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modelMessages = await convertToModelMessages(normalizedMessages as any);
    if (isMobile) {
      const genResult = await generateText({
        model: openai('gpt-4o-mini'),
        system: systemPrompt,
        messages: modelMessages,
        tools,
        stopWhen: stepCountIs(5)
      });
      return jsonWithDiagnostics({ 
        text: genResult.text, 
        toolCalls: genResult.steps ? genResult.steps.flatMap(s => s.toolCalls) : genResult.toolCalls 
      });
    }

    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(5)
    });

    return result.toUIMessageStreamResponse({
      headers: {
        'Server-Timing': buildServerTimingHeader(latencyTimer.complete(performance.now() - startAt)),
      }
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error in Bruno chat:', error?.stack || error);
    Sentry.captureException(error);
    if (error?.name === 'AbortError') {
      return jsonWithDiagnostics({ error: 'Bruno took too long to respond (timeout)' }, { status: 504 });
    }
    return jsonWithDiagnostics({ error: 'Failed to connect to Bruno', details: error?.message }, { status: 500 });
  }
}
