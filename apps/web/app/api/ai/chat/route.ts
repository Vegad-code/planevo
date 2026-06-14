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
import {
  buildPageContextBlock,
  pageContextSchema,
} from '@/lib/bruno/page-context';

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
  pageContext: pageContextSchema.optional(),
});

// --- Tool schemas as raw JSON Schema objects ---
const proposeActionParams = jsonSchema({
  type: 'object' as const,
  properties: {
    type: { 
      type: 'string', 
      enum: ['CREATE_TASK', 'UPDATE_TASK', 'RESCHEDULE_TASK', 'CREATE_TIME_BLOCK', 'UPDATE_DAILY_PLAN', 'EXPLAIN_PLAN', 'NO_ACTION'] 
    },
    title: { type: 'string', minLength: 1, maxLength: 120 },
    description: { type: 'string', minLength: 1, maxLength: 500 },
    riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
    requiresConfirmation: { type: 'boolean' },
    payload: {
      type: 'object',
      properties: {
        taskTitle: { type: 'string' },
        notes: { type: 'string' },
        estimatedMinutes: { type: 'number' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        dueDate: { type: 'string' },
        source: { type: 'string', enum: ['bruno'] }
      },
      additionalProperties: true
    }
  },
  required: ['type', 'title', 'description']
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

    const {
      diagnostics,
      messages,
      assignmentId,
      isMobile,
      timeZone,
      localTime,
      pageContext,
    } = parsedBody.data;

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

    

    const userTimeZone = timeZone || 'UTC';
    const userLocalTime = localTime || new Date().toLocaleString();
    const pageContextBlock = buildPageContextBlock(pageContext);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prefs = (profile?.scheduling_preferences || {}) as any;

    const systemPrompt = `You are Bruno, a hyper-intelligent AI Scholar, Elite Academic Advisor, and Master Planner.
Your job is to read the user's workload (assignments, events, tasks) and architect the perfect schedule for them.

LOCAL TIME: ${userLocalTime} (Time Zone: ${prefs.timezone || userTimeZone})

User Name: ${profile?.name || 'User'}
User Plan: ${userPlanType}
Context: ${prefs.context_type || 'Professional'} (School/Workplace: ${prefs.organization_name || 'N/A'})
Planning Baseline:
- Workload Style: ${prefs.workload_style || 'balanced'}
- Default Task Duration: ${prefs.default_task_duration || 30} mins
- Energy Preference: ${profile?.energy_preference || 'balanced'}
${pageContextBlock}

CURRENT USER TASKS:
${taskListContext}

UPCOMING EVENTS (Next 7 Days):
${calendarListContext}

USER MEMORY (Apply these preferences):
CRITICAL: The USER MEMORY below reflects the user's explicit preferences. You MUST adhere to these preferences over any default conversational style or planning rules.
${memoryContext}
${assignmentContext}

CORE MISSION:
You are as capable as the world's most advanced LLMs. You are an elite strategic planner and academic advisor.

BRUNO ACTION SAFETY RULES

1. You cannot directly mutate tasks, calendars, or daily plans.
2. You must propose actions through propose_action.
3. The app will render proposal cards.
4. The user must click Confirm before any mutation happens.
5. Never say "I created", "I moved", "I changed", or "I rescheduled" unless the app reports execution success.
6. Use "I recommend", "I can prepare", "Here is a proposed change", or "Confirm the tasks you want me to add."
7. For assignment/project breakdowns, call propose_action once for each task using type CREATE_TASK.
8. Do not respond with only a long plain-text task list for breakdown requests.
9. If proposal cards exist, keep visible text short.

RESPONSE FORMATTING RULES (CRITICAL — follow these in EVERY response):
1. Use markdown headers (## and ###) to create clear sections. NEVER dump content as a flat wall of text.
2. Use bullet points (-) for lists of items. Use numbered lists (1. 2. 3.) for sequential steps.
3. Use **bold** for key terms, time durations, and important labels.
4. Add a blank line between every section/topic. Whitespace is mandatory between logical blocks.
5. For study plans and schedules: Use ### for each day/phase, then bullet points for tasks within each.
6. For time-based items, format as: **Duration:** Description (each on its own bullet)
7. Start responses with a brief 1-2 sentence intro. End with a short call-to-action or follow-up question.
8. Use markdown tables (|col1|col2|) when comparing options or showing schedules with multiple columns.
9. Keep bullet items concise (1-2 sentences max). Break long explanations into sub-bullets.
10. For breaks/transitions between major sections, use --- (horizontal rule) sparingly.`;

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
      propose_action: tool({
        description: `Use this tool whenever Bruno wants to suggest a Planevo app action.
This tool is proposal-only. It does not create, update, delete, move, or reschedule anything.
For assignment/project/task breakdown requests, call this tool once per proposed CREATE_TASK.
Do not only write the tasks in text.
If you mention "confirm" or "create these tasks", corresponding CREATE_TASK proposal cards must exist.`,
        inputSchema: proposeActionParams,
        execute: async (validArgs: any) => {
          console.log("[API] propose_action tool called with args:", validArgs);
          await logToolExecution('propose_action', validArgs, { success: true });
          return {
            success: true,
            message: "Proposal recorded. Waiting for user confirmation.",
          };
        }
      })
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
