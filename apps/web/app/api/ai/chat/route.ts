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
import { getUserAIMemory, buildMemoryContext } from '@/lib/ai/memory';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { normalizePlanType } from '@/lib/auth/plan-types';
import { posthogServer } from '@/lib/posthog-server';
import { streamText, tool, stepCountIs, jsonSchema, convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { openai } from '@ai-sdk/openai';
import {
  buildPageContextBlock,
  pageContextSchema,
} from '@/lib/bruno/page-context';
import { handleBrunoChatV2 } from '@/lib/bruno/handleChatV2';
import {
  BRUNO_DETECTOR_EVASION_RESPONSE,
  detectDocumentWritingIntent,
  detectNotesIntent,
  hasDetectorEvasionRequest,
  isDocumentRefinementMessage,
  isNotesRefinementMessage,
} from '@/lib/bruno/conversationRouting';
import { extractLastUserMessage } from '@/lib/bruno/runtime';
import { getBrunoReadTools } from '@/lib/bruno/readTools';
import {
  buildCodingBoundaryBlock,
  buildReadToolsBlock,
  buildGeneralSystemPrompt,
  buildWritingQualityBlock,
} from '@/lib/bruno/brunoPrompts';
import {
  parseBrunoAssistantMode,
  resolveEffectiveAssistantMode,
  usesMinimalGeneralPrompt,
} from '@/lib/bruno/assistantMode';
import {
  applyClarificationResponseToMessages,
  brunoClarificationResponseSchema,
  generateBrunoClarificationCard,
  isClarificationSkip,
  shouldRequestClarification,
} from '@/lib/bruno/clarification';
import { routeBrunoMessage } from '@/lib/bruno/routeMessage';
import { extractLastUserMessageText } from '@/lib/bruno/enrichTimeBlockProposal';
import { enrichBrunoProposal } from '@/lib/bruno/enrichProposalColor';
import { getBrunoRoutingFlags } from '@/lib/bruno/runtime';
import { BrunoProgressWriter } from '@/lib/bruno/progressWriter';
import { parseBrunoDataAccess } from '@/lib/bruno/types';
import type { BrunoDataParts } from '@/lib/bruno/types';
import type { UIMessage, UIMessageStreamWriter } from 'ai';

// Secure message schema to prevent role spoofing and excessive payload sizes
const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'tool']),
  content: z.string().max(6000).or(z.array(z.any())).optional().nullable(),
}).passthrough();

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(50),
  conversationId: z.string().uuid().nullish(),
  assignmentId: z.string().optional(),
  diagnostics: z.boolean().optional(),
  isMobile: z.boolean().optional(),
  timeZone: z.string().optional(),
  localTime: z.string().optional(),
  pageContext: pageContextSchema.optional(),
  assistantMode: z.enum(['general', 'planning']).optional().default('general'),
  clarificationResponse: brunoClarificationResponseSchema.optional(),
});

function writeStaticText(
  writer: Pick<
    UIMessageStreamWriter<UIMessage<unknown, BrunoDataParts>>,
    'write'
  >,
  text: string
) {
  const id = crypto.randomUUID();
  writer.write({ type: 'text-start', id });
  writer.write({ type: 'text-delta', id, delta: text });
  writer.write({ type: 'text-end', id });
}

function staticUiResponse(text: string, headers?: HeadersInit) {
  const stream = createUIMessageStream<
    UIMessage<unknown, BrunoDataParts>
  >({
    execute: ({ writer }) => {
      writeStaticText(writer, text);
    },
  });

  return createUIMessageStreamResponse({ stream, headers });
}

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
        startTime: { type: 'string', description: 'ISO 8601 start time for CREATE_TIME_BLOCK' },
        endTime: { type: 'string', description: 'ISO 8601 end time for CREATE_TIME_BLOCK' },
        durationMinutes: { type: 'number', description: 'Duration in minutes when endTime is omitted' },
        location: { type: 'string' },
        color: { type: 'string', description: 'Hex color e.g. #039BE5 for calendar display' },
        colorCategory: {
          type: 'string',
          enum: ['study', 'exercise', 'break', 'admin', 'work', 'creative', 'social', 'health'],
        },
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
      const status =
        rateLimitResult.error === 'Unauthorized' ? 401 : 429;
      return jsonWithDiagnostics(
        {
          error: rateLimitResult.error,
          message:
            rateLimitResult.message ||
            'You have reached your hourly AI limit.',
          ...(rateLimitResult.limitType
            ? {
                limitType: rateLimitResult.limitType,
                used: rateLimitResult.used,
                limit: rateLimitResult.limit,
                plan: rateLimitResult.plan,
                resetAt: rateLimitResult.resetAt,
              }
            : {}),
        },
        { status }
      );
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
      messages: rawMessages,
      conversationId,
      assignmentId,
      isMobile,
      timeZone,
      localTime,
      pageContext,
      assistantMode,
      clarificationResponse,
    } = parsedBody.data;
    const messages = applyClarificationResponseToMessages(
      rawMessages,
      clarificationResponse
    );
    const requestId = crypto.randomUUID();
    const latestUserText = extractLastUserMessage(
      messages as Parameters<typeof extractLastUserMessage>[0]
    );

    if (clarificationResponse) {
      posthogServer.capture({
        distinctId: user.id,
        event: isClarificationSkip(clarificationResponse)
          ? 'bruno_clarification_skipped'
          : 'bruno_clarification_submitted',
        properties: {
          conversation_id: conversationId ?? null,
          question_count: clarificationResponse.answers.length,
          platform: isMobile ? 'mobile' : 'web',
        },
      });
    }

    const notesSignalText = clarificationResponse?.originalPrompt ?? latestUserText;
    if (hasDetectorEvasionRequest(notesSignalText)) {
      if (isMobile) {
        return NextResponse.json({
          text: BRUNO_DETECTOR_EVASION_RESPONSE,
          toolCalls: [],
          metadata: {
            mode: 'document_writing',
            tier: 'none',
            safetyStatus: 'detector_evasion',
          },
        });
      }

      return staticUiResponse(BRUNO_DETECTOR_EVASION_RESPONSE, {
        'Server-Timing': buildServerTimingHeader(
          latencyTimer.complete(performance.now() - startAt)
        ),
        'x-bruno-mode': 'document_writing',
        'x-bruno-tier': 'none',
        'x-bruno-safety': 'detector_evasion',
      });
    }

    const isNotesChat =
      detectNotesIntent(notesSignalText) ||
      (!clarificationResponse && isNotesRefinementMessage(latestUserText));
    const isDocumentChat =
      detectDocumentWritingIntent(notesSignalText) ||
      (!clarificationResponse &&
        isDocumentRefinementMessage(latestUserText));
    const routingFlags = getBrunoRoutingFlags(process.env, user.id);

    // Consume daily quota only after validating the request body.
    // Notes/documents use separate monthly quotas in V2 and skip the daily chat cap.
    let usageLogId: string | undefined;
    if (isNotesChat || (routingFlags.routingV2Enabled && isDocumentChat)) {
      const { data: notesLog, error: notesLogError } = await supabaseAdmin
        .from('ai_usage_logs')
        .insert({
          user_id: authUser.id,
          feature: 'bruno-chat',
          request_id: requestId,
          status: 'reserved',
        })
        .select('id')
        .single();
      if (notesLogError) {
        console.error('[Bruno Chat] Failed to reserve monthly-quota usage log:', notesLogError);
      } else {
        usageLogId = notesLog.id;
      }
    } else {
      const dailyRateLimitResult = await checkRateLimitForUser(
        authUser.id,
        'bruno-chat',
        authUser.email,
        requestId
      );
      if (!dailyRateLimitResult.allowed) {
        return jsonWithDiagnostics(
          {
            error: dailyRateLimitResult.error,
            message:
              dailyRateLimitResult.message ||
              'You have reached your daily AI limit.',
            ...(dailyRateLimitResult.limitType
              ? {
                  limitType: dailyRateLimitResult.limitType,
                  used: dailyRateLimitResult.used,
                  limit: dailyRateLimitResult.limit,
                  plan: dailyRateLimitResult.plan,
                  resetAt: dailyRateLimitResult.resetAt,
                }
              : {}),
          },
          { status: 429 }
        );
      }

      if (!dailyRateLimitResult.usageLogId) {
        return jsonWithDiagnostics(
          {
            error: 'Rate Limit Unavailable',
            message:
              'AI usage checks are temporarily unavailable. Please try again shortly.',
          },
          { status: 503 }
        );
      }
      usageLogId = dailyRateLimitResult.usageLogId;
    }

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
        .select('name, plan_type, energy_preference, scheduling_preferences')
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

    if (routingFlags.routingV2Enabled) {
      if (!usageLogId) {
        return jsonWithDiagnostics(
          {
            error: 'Rate Limit Unavailable',
            message:
              'AI usage checks are temporarily unavailable. Please try again shortly.',
          },
          { status: 503 }
        );
      }

      return handleBrunoChatV2({
        user,
        profile,
        messages,
        usageLogId,
        requestId,
        conversationId: conversationId ?? undefined,
        assignmentId,
        isMobile,
        timeZone,
        localTime,
        pageContext,
        assistantMode: parseBrunoAssistantMode(assistantMode),
        clarificationResponse,
      });
    }

    const prefs = (profile?.scheduling_preferences || {}) as Record<string, unknown>;

    const dataAccess = parseBrunoDataAccess(prefs);
    const requestedAssistantMode = parseBrunoAssistantMode(assistantMode);
    const v1RouteResult = await routeBrunoMessage({ message: latestUserText });
    const effectiveAssistantMode = resolveEffectiveAssistantMode({
      assistantMode: requestedAssistantMode,
      routeMode: v1RouteResult.decision.mode,
    });
    const useMinimalPrompt = usesMinimalGeneralPrompt({
      effectiveAssistantMode,
      routeMode: v1RouteResult.decision.mode,
    });

    if (
      shouldRequestClarification({
        message: latestUserText,
        decision: v1RouteResult.decision,
        clarificationResponse,
      })
    ) {
      try {
        const { card } = await generateBrunoClarificationCard({
          message: latestUserText,
          routeMode: v1RouteResult.decision.mode,
          userName: profile?.name,
          pageLabel: pageContext?.label,
          localTime,
          timeZone,
        }, {
          onGenerationError: (error) => {
            Sentry.captureException(error);
            console.warn(
              '[Bruno Clarification] Using fallback questions after generation failed:',
              error
            );
          },
        });

        posthogServer.capture({
          distinctId: user.id,
          event: 'bruno_clarification_requested',
          properties: {
            conversation_id: conversationId ?? null,
            mode: v1RouteResult.decision.mode,
            question_count: card.questions.length,
            platform: isMobile ? 'mobile' : 'web',
            route_source: v1RouteResult.routeSource,
          },
        });

        const stream = createUIMessageStream<UIMessage<unknown, BrunoDataParts>>({
          execute: ({ writer }) => {
            const progress = new BrunoProgressWriter(writer);
            progress.markReadDone();
            progress.markSafetyDone();
            progress.markRouteDone(
              v1RouteResult.decision.mode,
              'Clarification needed'
            );
            writeStaticText(writer, card.intro);
            writer.write({
              type: 'data-bruno-clarification-card',
              data: card,
            });
            progress.markComplete();
          },
        });

        return createUIMessageStreamResponse({
          stream,
          headers: {
            'Server-Timing': buildServerTimingHeader(
              latencyTimer.complete(performance.now() - startAt)
            ),
            'x-bruno-assistant-mode': effectiveAssistantMode,
            'x-bruno-assistant-requested': requestedAssistantMode,
            'x-bruno-clarification': 'requested',
          },
        });
      } catch (error) {
        Sentry.captureException(error);
        console.warn('[Bruno Clarification] Falling back to normal chat:', error);
      }
    }

    // Fetch active tasks for Bruno to have context of task names and IDs
    let allTasks: { id: string; title: string; status: string; due_date: string | null; priority: string; estimated_minutes: number }[] = [];
    if (!useMinimalPrompt && dataAccess.tasks) {
      const { data: tasks } = await supabaseAdmin
        .from('tasks')
        .select('id, title, status, due_date, priority, estimated_minutes')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(100);

      allTasks = (tasks || []) as typeof allTasks;
    }

    if (!useMinimalPrompt && dataAccess.tasks && dataAccess.integrations) {
      const { data: sourceItems } = await supabaseAdmin
        .from('source_items')
        .select('id, title, provider, due_date, url, imported_task_id')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .is('imported_task_id', null)
        .limit(100);

      const mappedSourceItems = (sourceItems || []).map(item => ({
        id: item.id,
        title: `[${item.provider.charAt(0).toUpperCase() + item.provider.slice(1)}] ${item.title}`,
        status: 'todo',
        due_date: item.due_date,
        priority: 'medium',
        estimated_minutes: 60,
      }));

      allTasks = [...allTasks, ...mappedSourceItems] as typeof allTasks;
    }
    latencyTimer.mark('assignments');

    const taskListContext = useMinimalPrompt
      ? ''
      : !dataAccess.tasks
      ? 'Task access is disabled by the user.'
      : allTasks && allTasks.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (allTasks as any[]).map(t => `- [${t.status}] "${t.title}" (ID: ${t.id}, Due: ${t.due_date || 'No due date'}, Priority: ${t.priority}, Duration: ${t.estimated_minutes}m)`).join('\n')
      : 'No active tasks found.';

    // Fetch calendar events for the next 7 days for context
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    let calendarListContext = '';
    if (!useMinimalPrompt && dataAccess.calendar) {
      const { data: events } = await supabaseAdmin
        .from('calendar_events')
        .select('id, title, start_time, end_time, status')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .gte('start_time', today.toISOString())
        .lt('start_time', nextWeek.toISOString())
        .order('start_time', { ascending: true })
        .limit(100);

      calendarListContext = events && events.length > 0
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (events as any[]).map(e => `- [${e.status}] "${e.title}" (ID: ${e.id}, ${new Date(e.start_time).toLocaleString()} to ${new Date(e.end_time).toLocaleTimeString()})`).join('\n')
        : 'No upcoming calendar events for the next 7 days.';
    } else if (!useMinimalPrompt) {
      calendarListContext = 'Calendar access is disabled by the user.';
    }

    // Get learned memory
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const memory = useMinimalPrompt
      ? null
      : await getUserAIMemory(supabaseAdmin as any, user.id);
    const memoryContext = memory ? buildMemoryContext(memory) : '';
    latencyTimer.mark('memory');

    // Get assignment context if requested
    let assignmentContext = '';
    if (!useMinimalPrompt && assignmentId && dataAccess.canvas) {
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
    } else if (!useMinimalPrompt && assignmentId && !dataAccess.canvas) {
      assignmentContext = 'Canvas access is disabled by the user.';
    }

    // Determine if user is on a premium plan
    const userPlanType = normalizePlanType(profile?.plan_type);

    const userTimeZone = timeZone || 'UTC';
    const userLocalTime = localTime || new Date().toLocaleString();
    const pageContextBlock = buildPageContextBlock(pageContext);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any

    // Build privacy permission block for V1 system prompt
    const permissionLines: string[] = [];
    if (!dataAccess.tasks) permissionLines.push('CRITICAL: Task access is DISABLED. If asked about tasks, tell the user to enable it in Settings > Bruno Preferences.');
    if (!dataAccess.calendar) permissionLines.push('CRITICAL: Calendar access is DISABLED. If asked about schedule, tell the user to enable it in Settings > Bruno Preferences.');
    if (!dataAccess.canvas) permissionLines.push('CRITICAL: Canvas access is DISABLED. If asked about assignments, tell the user to enable it in Settings > Bruno Preferences.');
    if (!dataAccess.integrations) permissionLines.push('CRITICAL: Work Integrations access is DISABLED. If asked about Notion/Slack/Linear, tell the user to enable it in Settings > Bruno Preferences.');
    const v1PermissionBlock = `
DATA ACCESS PERMISSIONS:
- Tasks: ${dataAccess.tasks ? 'ENABLED' : 'DISABLED'}
- Calendar: ${dataAccess.calendar ? 'ENABLED' : 'DISABLED'}
- Canvas: ${dataAccess.canvas ? 'ENABLED' : 'DISABLED'}
- Integrations: ${dataAccess.integrations ? 'ENABLED' : 'DISABLED'}
${permissionLines.length > 0 ? '\n' + permissionLines.join('\n') : ''}`;

    const systemPrompt = useMinimalPrompt
      ? buildGeneralSystemPrompt({ dataAccess })
      : `You are Bruno, a hyper-intelligent AI Scholar, Elite Academic Advisor, and Master Planner.
Your job is to read the user's workload (assignments, events, tasks) and architect the perfect schedule for them.
${v1PermissionBlock}

LOCAL TIME: ${userLocalTime} (Time Zone: ${(prefs.timezone as string) || userTimeZone})

User Name: ${profile?.name || 'User'}
User Plan: ${userPlanType}
Context: ${(prefs.context_type as string) || 'Professional'} (School/Workplace: ${(prefs.organization_name as string) || 'N/A'})
Planning Baseline:
- Workload Style: ${(prefs.workload_style as string) || 'balanced'}
- Default Task Duration: ${(prefs.default_task_duration as number) || 30} mins
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
${buildReadToolsBlock(dataAccess)}

CORE MISSION:
You are as capable as the world's most advanced LLMs. You are an elite strategic planner and academic advisor.

${buildWritingQualityBlock()}

${buildCodingBoundaryBlock()}

BRUNO ACTION SAFETY RULES

1. You cannot directly mutate tasks, calendars, or daily plans.
2. You must propose actions through propose_action.
3. The app will render proposal cards.
4. The user must click Confirm before any mutation happens.
5. Never say "I created", "I moved", "I changed", or "I rescheduled" unless the app reports execution success.
6. Use "I recommend", "I can prepare", "Here is a proposed change", or "Confirm the tasks you want me to add."
7. For assignment/project breakdowns, call propose_action once for each task using type CREATE_TASK. Assign each task a distinct payload.colorCategory (study, exercise, break, admin, work, creative, social, health) so they appear color-coded on the calendar.
8. For calendar event or schedule block requests, call propose_action with type CREATE_TIME_BLOCK and include payload.startTime (ISO 8601) plus payload.endTime or payload.durationMinutes. Use distinct colorCategory values when scheduling multiple blocks.
9. Do not respond with only a long plain-text task list for breakdown requests.
10. If proposal cards exist, keep visible text short.
11. DO NOT use propose_action preemptively when asking the user for their choice or offering options. Wait for their explicit response first.

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

    const readTools = getBrunoReadTools(user.id, dataAccess);
    const resolvedTimeZone =
      timeZone ||
      (typeof prefs.timezone === 'string' ? prefs.timezone : 'UTC');
    const lastUserMessageText = extractLastUserMessageText(
      messages as Parameters<typeof extractLastUserMessageText>[0]
    );

    const tools = {
      propose_action: tool({
        description: `Use this tool whenever Bruno wants to suggest a Planevo app action.
ONLY use this when the user has explicitly requested an action or made a clear choice. DO NOT use this preemptively when you are still asking the user clarifying questions or offering options.
This tool is proposal-only. It does not create, update, delete, move, or reschedule anything.
For assignment/project/task breakdown requests, call this tool once per proposed CREATE_TASK with a distinct payload.colorCategory per task.
For calendar event or schedule block requests, call this tool with type CREATE_TIME_BLOCK and include payload.startTime (ISO 8601 in the user's timezone) plus payload.endTime or payload.durationMinutes. Use distinct colorCategory values when proposing multiple blocks. payload.startTime MUST be a valid ISO 8601 datetime string in the user's timezone (e.g. "2026-07-28T09:00:00"). Never write natural language like "July 28 at 9 AM" in the startTime field.
Do not only write the tasks in text.
If you mention "confirm" or "create these tasks", corresponding CREATE_TASK proposal cards must exist.`,
        inputSchema: proposeActionParams,
        execute: async (validArgs: unknown) => {
          const argsObj =
            typeof validArgs === 'object' && validArgs !== null
              ? (validArgs as Record<string, unknown>)
              : {};
          const enrichedArgs = await enrichBrunoProposal(argsObj, {
            userId: user.id,
            supabase: supabaseAdmin,
            texts: lastUserMessageText ? [lastUserMessageText] : [],
            timeZone: resolvedTimeZone,
          });
          console.log("[API] propose_action tool called with args:", enrichedArgs);
          await logToolExecution('propose_action', enrichedArgs, { success: true });
          return {
            success: true,
            message: "Proposal recorded. Waiting for user confirmation.",
          };
        }
      }),
      ...readTools,
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

    const stream = createUIMessageStream<UIMessage<unknown, BrunoDataParts>>({
      execute: async ({ writer }) => {
        const progress = new BrunoProgressWriter(writer);
        progress.markReadDone();
        progress.markSafetyDone();
        progress.markRouteDone('basic_chat', 'Legacy chat mode');
        progress.markContextLoading('tasks, calendar');
        progress.markContextDone('Loaded tasks, calendar');
        progress.markGenerating();

        const result = streamText({
          model: openai('gpt-4o-mini'),
          system: systemPrompt,
          messages: modelMessages,
          tools,
          stopWhen: stepCountIs(5),
          onFinish: () => {
            progress.markComplete();
          },
          onError: () => {
            progress.markError('generate');
          },
        });

        writer.merge(result.toUIMessageStream());
      },
    });

    return createUIMessageStreamResponse({
      stream,
      headers: {
        'Server-Timing': buildServerTimingHeader(latencyTimer.complete(performance.now() - startAt)),
        'x-bruno-assistant-mode': effectiveAssistantMode,
        'x-bruno-assistant-requested': requestedAssistantMode,
      },
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
