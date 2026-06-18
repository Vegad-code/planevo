import * as Sentry from '@sentry/nextjs';
import { openai } from '@ai-sdk/openai';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  jsonSchema,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from 'ai';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { buildMemoryContext, getUserAIMemory } from '@/lib/ai/memory';
import { buildPageContextBlock } from '@/lib/bruno/page-context';
import type { BrunoPageContext } from '@/lib/bruno/types';
import { posthogServer } from '@/lib/posthog-server';
import { normalizePlanType, isPaidPlan } from '@/lib/auth/plan-types';
import type { Json } from '@/types/database';
import { buildBrunoSystemPrompt } from './brunoPrompts';
import {
  buildBrunoContext,
  type BrunoContextLoaders,
} from './contextBuilder';
import { estimateModelCostCents } from './costEstimator';
import { moderateBrunoMessage } from './moderation';
import {
  BRUNO_MODELS,
  resolveBrunoGenerationPlan,
  BRUNO_PRO_MONTHLY_DEEP_LIMIT,
} from './modelPolicy';
import { routeBrunoMessage } from './routeMessage';
import {
  extractLastUserMessage,
  getBrunoRoutingFlags,
  getModelCallSettings,
} from './runtime';
import {
  BRUNO_CRISIS_RESPONSE,
  checkDeterministicBrunoSafety,
} from './safety';
import type {
  BrunoDataParts,
  BrunoGenerationPlan,
  BrunoMode,
  BrunoRouteDecision,
  BrunoRouteSource,
} from './types';
import {
  completeBrunoUsage,
  createBrunoUsageRepository,
  getBrunoEntitlement,
  logBrunoRouteEvent,
  refundBrunoDeepAccess,
  reserveBrunoDeepAccess,
  type BrunoRpcClient,
} from './usageService';
import {
  getBrunoProCapNotice,
  getBrunoProWarning,
  getBrunoUpgradeCard,
} from './upgradeCards';
import { getComposioClientOptions } from '@/lib/integrations/composio/config';
import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
type ChatMessage = {
  id?: string;
  role: 'user' | 'assistant' | 'tool';
  content?: string | unknown[] | null;
  parts?: unknown[];
};

type BrunoProfile = {
  name: string | null;
  plan_type: string | null;
  scheduling_preferences: unknown;
};

type HandleBrunoV2Input = {
  user: { id: string; email?: string | null };
  profile: BrunoProfile | null;
  messages: ChatMessage[];
  usageLogId: string;
  requestId: string;
  conversationId?: string;
  assignmentId?: string;
  isMobile?: boolean;
  timeZone?: string;
  localTime?: string;
  pageContext?: BrunoPageContext;
};

const proposeActionParams = jsonSchema({
  type: 'object' as const,
  properties: {
    type: {
      type: 'string',
      enum: [
        'CREATE_TASK',
        'UPDATE_TASK',
        'RESCHEDULE_TASK',
        'CREATE_TIME_BLOCK',
        'UPDATE_DAILY_PLAN',
        'EXPLAIN_PLAN',
        'NO_ACTION',
      ],
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
        source: { type: 'string', enum: ['bruno'] },
      },
      additionalProperties: true,
    },
  },
  required: ['type', 'title', 'description'],
});

function normalizeMessages(messages: ChatMessage[]): UIMessage[] {
  return messages
    .filter(
      (message): message is ChatMessage & {
        role: 'user' | 'assistant';
      } => message.role === 'user' || message.role === 'assistant'
    )
    .map((message, index) => ({
      id: message.id ?? `message-${index}`,
      role: message.role,
      parts: Array.isArray(message.parts)
        ? (message.parts as UIMessage['parts'])
        : [
            {
              type: 'text' as const,
              text: typeof message.content === 'string' ? message.content : '',
            },
          ],
    }));
}

function staticUiResponse(text: string, headers?: HeadersInit) {
  const stream = createUIMessageStream<
    UIMessage<unknown, BrunoDataParts>
  >({
    execute: ({ writer }) => {
      const id = crypto.randomUUID();
      writer.write({ type: 'text-start', id });
      writer.write({ type: 'text-delta', id, delta: text });
      writer.write({ type: 'text-end', id });
    },
  });

  return createUIMessageStreamResponse({ stream, headers });
}

function createContextLoaders(
  assignmentId?: string
): BrunoContextLoaders {
  return {
    async loadTasks(userId) {
      const { data: tasks, error: tasksError } = await supabaseAdmin
        .from('tasks')
        .select('id, title, status, due_date, priority, estimated_minutes')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(100);

      if (tasksError) throw tasksError;

      const { data: sourceItems, error: sourceItemsError } = await supabaseAdmin
        .from('source_items')
        .select('id, title, provider, due_date')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .is('imported_task_id', null)
        .limit(100);

      if (sourceItemsError) throw sourceItemsError;

      const mappedTasks = (tasks ?? []).map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        dueDate: task.due_date,
        priority: task.priority,
        estimatedMinutes: task.estimated_minutes,
      }));

      const mappedSourceItems = (sourceItems ?? []).map((item) => ({
        id: item.id,
        title: `[${item.provider.charAt(0).toUpperCase() + item.provider.slice(1)}] ${item.title}`,
        status: 'todo',
        dueDate: item.due_date,
        priority: 'medium',
        estimatedMinutes: 60,
      }));

      return [...mappedTasks, ...mappedSourceItems];
    },

    async loadCalendar(userId) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);

      const { data, error } = await supabaseAdmin
        .from('calendar_events')
        .select('id, title, start_time, end_time, status')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .gte('start_time', start.toISOString())
        .lt('start_time', end.toISOString())
        .order('start_time', { ascending: true })
        .limit(100);

      if (error) throw error;
      return (data ?? [])
        .filter(
          (event): event is typeof event & { end_time: string } =>
            typeof event.end_time === 'string'
        )
        .map((event) => ({
          id: event.id,
          title: event.title,
          startTime: event.start_time,
          endTime: event.end_time,
          status: event.status,
        }));
    },

    async loadCanvas(userId) {
      if (assignmentId) {
        const { data, error } = await supabaseAdmin
          .from('canvas_assignments')
          .select('id, name, course_name, due_at, description, html_url')
          .eq('id', assignmentId)
          .eq('user_id', userId)
          .limit(1);

        if (error) throw error;
        return (data ?? []).map((assignment) => ({
          id: assignment.id,
          name: assignment.name,
          courseName: assignment.course_name,
          dueAt: assignment.due_at,
          description: assignment.description,
          htmlUrl: assignment.html_url,
        }));
      }

      const { data, error } = await supabaseAdmin
        .from('canvas_assignments')
        .select('id, name, course_name, due_at, description, html_url')
        .eq('user_id', userId)
        .order('due_at', { ascending: true, nullsFirst: false })
        .limit(20);

      if (error) throw error;
      return (data ?? []).map((assignment) => ({
        id: assignment.id,
        name: assignment.name,
        courseName: assignment.course_name,
        dueAt: assignment.due_at,
        description: assignment.description,
        htmlUrl: assignment.html_url,
      }));
    },

    async loadIntegrations(userId) {
      const providers = ['notion', 'slack', 'linear'] as const;

      const { data: accounts } = await supabaseAdmin
        .from('integration_accounts')
        .select('provider, status')
        .eq('user_id', userId)
        .in('provider', providers as unknown as string[]);

      const connectedSet = new Set(
        (accounts ?? [])
          .filter((a) => a.status === 'connected')
          .map((a) => a.provider)
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: items } = await (supabaseAdmin as any)
        .from('source_items')
        .select('provider, title, status, due_date, url, completed')
        .eq('user_id', userId)
        .in('provider', providers as unknown as string[])
        .is('deleted_at', null)
        .is('imported_task_id', null)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(60);

      const weekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const openItems = ((items ?? []) as any[]).filter((i) => !i.completed);

      const pulses = providers.map((provider) => {
        const providerItems = openItems.filter((i) => i.provider === provider);
        const dueThisWeek = providerItems.filter((i) => {
          if (!i.due_date) return false;
          const due = new Date(i.due_date).getTime();
          return due >= Date.now() && due <= weekFromNow;
        }).length;
        return {
          provider,
          connected: connectedSet.has(provider),
          openCount: providerItems.length,
          dueThisWeek,
          label: `${providerItems.length} open`,
        };
      });

      const contextItems = openItems
        .filter((i) => connectedSet.has(i.provider))
        .slice(0, 30)
        .map((i) => ({
          provider: i.provider,
          title: i.title,
          status: i.status ?? null,
          dueDate: i.due_date ?? null,
          url: i.url ?? null,
        }));

      return { pulses, items: contextItems };
    },
  };
}

const UNSAFE_RESPONSE =
  'I cannot help with that request. I can help with a safe alternative, planning support, or getting you to appropriate help.';

export async function handleBrunoChatV2(input: HandleBrunoV2Input) {
  const startedAt = performance.now();
  const flags = getBrunoRoutingFlags(process.env, input.user.id);
  const usageRepository = createBrunoUsageRepository(supabaseAdmin);
  const latestMessage = extractLastUserMessage(input.messages);
  const userPlan = normalizePlanType(input.profile?.plan_type);
  const adminEmails = new Set(
    (process.env.BRUNO_ADMIN_EMAILS ?? '')
      .toLowerCase()
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)
  );
  const isPro = isPaidPlan(
    userPlan,
    input.user.email
      ? adminEmails.has(input.user.email.toLowerCase())
      : false
  );

  if (!latestMessage) {
    return NextResponse.json(
      { error: 'A user message is required.' },
      { status: 400 }
    );
  }

  const logSafetyResponse = async (
    status: 'crisis' | 'unsafe',
    response: string
  ) => {
    const latencyMs = Math.round(performance.now() - startedAt);
    await Promise.allSettled([
      completeBrunoUsage(usageRepository, {
        usageLogId: input.usageLogId,
        model: null,
        mode: 'unsafe',
        tier: 'none',
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostCents: 0,
        latencyMs,
        status: 'completed',
      }),
      logBrunoRouteEvent(usageRepository, {
        userId: input.user.id,
        requestId: input.requestId,
        conversationId: input.conversationId,
        mode: 'unsafe',
        confidence: 1,
        routeSource: 'deterministic',
        selectedTier: 'none',
        selectedModel: null,
        isPro,
        usedDeepCredit: false,
        upgradeCardShown: false,
        safetyStatus: status,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostCents: 0,
        latencyMs,
        rationale: `${status} safety response`,
      }),
    ]);

    if (input.isMobile) {
      return NextResponse.json({
        text: response,
        toolCalls: [],
        metadata: { mode: 'unsafe', tier: 'none', safetyStatus: status },
      });
    }

    return staticUiResponse(response, {
      'x-bruno-mode': 'unsafe',
      'x-bruno-tier': 'none',
    });
  };

  const deterministicSafety = checkDeterministicBrunoSafety(latestMessage);
  if (deterministicSafety.status === 'crisis') {
    return logSafetyResponse('crisis', BRUNO_CRISIS_RESPONSE);
  }

  let moderation;
  try {
    moderation = await moderateBrunoMessage(latestMessage);
  } catch (error) {
    Sentry.captureException(error);
    await completeBrunoUsage(usageRepository, {
      usageLogId: input.usageLogId,
      model: null,
      mode: 'unsafe',
      tier: 'none',
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostCents: 0,
      latencyMs: Math.round(performance.now() - startedAt),
      status: 'failed',
    }).catch(Sentry.captureException);
    return NextResponse.json(
      {
        error: 'Safety check unavailable',
        message: 'Bruno is temporarily unavailable. Please try again shortly.',
      },
      { status: 503 }
    );
  }

  if (moderation.status === 'unsafe') {
    return logSafetyResponse('unsafe', UNSAFE_RESPONSE);
  }

  const routeResult = await routeBrunoMessage(
    { message: latestMessage },
    flags.llmRouterEnabled
      ? {}
      : {
          classify: async () => {
            throw new Error('LLM router disabled');
          },
        }
  );

  let entitlement = await getBrunoEntitlement(usageRepository, {
    userId: input.user.id,
    isPro,
  });

  if (!isPro && !flags.deepCreditsEnabled) {
    entitlement = {
      ...entitlement,
      onboardingDeepCreditsRemaining: 0,
      earnedDeepCreditsRemaining: 0,
    };
  }

  let generationPlan = resolveBrunoGenerationPlan({
    decision: routeResult.decision,
    entitlement,
  });
  let usedDeepCredit = false;
  let deepAccessReserved = false;

  if (
    generationPlan.shouldReserveDeepAccess &&
    generationPlan.deepAccessSource
  ) {
    let reservationSucceeded = false;
    try {
      const reservation = await reserveBrunoDeepAccess(
        supabaseAdmin as unknown as BrunoRpcClient,
        {
          userId: input.user.id,
          requestId: input.requestId,
          source: generationPlan.deepAccessSource,
        }
      );
      reservationSucceeded = reservation.reserved;
    } catch (error) {
      Sentry.captureException(error);
    }

    if (reservationSucceeded) {
      deepAccessReserved = true;
      usedDeepCredit =
        generationPlan.deepAccessSource !== 'pro_monthly';
    } else {
      entitlement = {
        ...entitlement,
        onboardingDeepCreditsRemaining: 0,
        earnedDeepCreditsRemaining: 0,
        monthlyDeepRequestsRemaining: 0,
      };
      generationPlan = resolveBrunoGenerationPlan({
        decision: routeResult.decision,
        entitlement,
      });
    }
  }

  const context = await buildBrunoContext(
    {
      userId: input.user.id,
      policy: generationPlan.policy,
      assignmentId: input.assignmentId,
    },
    createContextLoaders(input.assignmentId)
  );
  const memory = await getUserAIMemory(supabaseAdmin, input.user.id);
  const memoryContext = buildMemoryContext(memory);
  const preferences =
    typeof input.profile?.scheduling_preferences === 'object' &&
    input.profile.scheduling_preferences !== null
      ? input.profile.scheduling_preferences
      : {};
  const preferredTimeZone =
    'timezone' in preferences &&
    typeof preferences.timezone === 'string'
      ? preferences.timezone
      : input.timeZone ?? 'UTC';

  // Determine which Pro work integrations are connected for this user.
  const proProviders = ['notion', 'slack', 'linear'];
  let connectedProviders: string[] = [];
  if (isPro) {
    const { data: accts } = await supabaseAdmin
      .from('integration_accounts')
      .select('provider, status')
      .eq('user_id', input.user.id)
      .in('provider', proProviders);
    connectedProviders = (accts ?? [])
      .filter((a) => a.status === 'connected')
      .map((a) => a.provider);
  }

  // Load Composio Tools — only for Pro users with at least one connected app.
  let dynamicMcpTools: Record<string, any> = {};
  let mcpContext = '';
  if (!isPro) {
    mcpContext +=
      'Work integrations (Notion, Slack, Linear) are a Planevo Pro feature. If the user asks to use them, let them know these connect under Settings > Integrations on the Pro plan. Do not claim to perform external actions.\n';
  } else if (connectedProviders.length === 0) {
    mcpContext +=
      'The user is on Pro but has not connected any work tools yet. If they ask about Notion, Slack, or Linear, point them to Settings > Integrations to connect. Do not claim to perform external actions.\n';
  } else {
    try {
      if (process.env.COMPOSIO_API_KEY) {
        const composio = new Composio({
          ...getComposioClientOptions(process.env.COMPOSIO_API_KEY),
          provider: new VercelProvider(),
        });
        // Create a tool router session for the specific user
        const composioSession = await composio.create(input.user.id);
        dynamicMcpTools = await composioSession.tools();
        mcpContext += `Connected work tools: ${connectedProviders.join(', ')}. You have access to tools via Composio for these apps. IMPORTANT: When a user asks you to perform an action on an external app (like creating a Notion page or sending a Slack message), you MUST use the Composio tools. DO NOT use the propose_action tool to create a local Planevo task for external app requests. Confirm with the user before sending messages or making destructive external changes.\n`;
      }
    } catch (err) {
      console.warn('Failed to load Composio tools:', err);
    }
  }

  const systemPrompt = buildBrunoSystemPrompt({
    mode: routeResult.decision.mode,
    userName: input.profile?.name ?? 'User',
    userPlan,
    localTime: input.localTime ?? new Date().toLocaleString(),
    timeZone: preferredTimeZone,
    pageContext: buildPageContextBlock(input.pageContext),
    memoryContext,
    taskContext: context.taskContext,
    calendarContext: context.calendarContext,
    canvasContext: context.canvasContext,
    integrationContext: context.integrationContext,
    connectedProviders,
    mcpContext: mcpContext.trim(),
  });

  const tools = {
    propose_action: tool({
      description:
        'Create a proposal card for a Planevo action. ONLY use this when the user has explicitly requested an action inside Planevo (like creating a local task, updating schedule, etc). DO NOT use this for external tools or integrations (Notion, Slack, Linear, etc) - use their respective Composio tools directly instead. This never mutates data directly and must wait for user confirmation.',
      inputSchema: proposeActionParams,
      execute: async (proposal: unknown) => {
        const { error } = await supabaseAdmin.from('bruno_tool_logs').insert({
          user_id: input.user.id,
          tool_name: 'propose_action',
          arguments:
            typeof proposal === 'object' && proposal !== null
              ? (proposal as Json)
              : { value: String(proposal) },
          result: { success: true },
        });
        if (error) Sentry.captureException(error);
        return {
          success: true,
          message: 'Proposal recorded. Waiting for user confirmation.',
        };
      },
    }),
    ...dynamicMcpTools,
  };

  const normalizedMessages = normalizeMessages(input.messages);
  const modelMessages = await convertToModelMessages(normalizedMessages);
  const upgradeCard =
    flags.upgradeCardsEnabled && generationPlan.shouldShowUpgradeCard
      ? getBrunoUpgradeCard(routeResult.decision.mode)
      : null;
  const proWarning = generationPlan.shouldShowProWarning
    ? getBrunoProWarning(
        Math.max(0, entitlement.monthlyDeepRequestsRemaining - 1)
      )
    : null;
  const proCap = generationPlan.shouldShowProCap
    ? getBrunoProCapNotice()
    : null;
  if (!generationPlan.model) {
    if (routeResult.decision.mode === 'unsafe') {
      return logSafetyResponse('unsafe', UNSAFE_RESPONSE);
    }
    // Fallback: if model is null for a non-unsafe mode, use standard.
    generationPlan = {
      ...generationPlan,
      tier: 'standard',
      model: BRUNO_MODELS.STANDARD,
    };
  }

  const model: string = generationPlan.model!;

  let finalized = false;
  const finalize = async (
    status: 'completed' | 'failed',
    usage: { inputTokens?: number; outputTokens?: number }
  ) => {
    if (finalized) return;
    finalized = true;

    const inputTokens = usage.inputTokens ?? 0;
    const outputTokens = usage.outputTokens ?? 0;
    const estimatedCostCents = estimateModelCostCents(model, {
      inputTokens,
      outputTokens,
    });
    const latencyMs = Math.round(performance.now() - startedAt);

    const completionTasks: Promise<unknown>[] = [
      completeBrunoUsage(usageRepository, {
        usageLogId: input.usageLogId,
        model,
        mode: routeResult.decision.mode,
        tier: generationPlan.tier,
        inputTokens,
        outputTokens,
        estimatedCostCents,
        latencyMs,
        status,
      }),
      logBrunoRouteEvent(usageRepository, {
        userId: input.user.id,
        requestId: input.requestId,
        conversationId: input.conversationId,
        mode: routeResult.decision.mode,
        confidence: routeResult.decision.confidence,
        routeSource: routeResult.routeSource,
        selectedTier: generationPlan.tier,
        selectedModel: model,
        isPro,
        usedDeepCredit,
        upgradeCardShown: Boolean(upgradeCard),
        safetyStatus: 'clear',
        inputTokens,
        outputTokens,
        estimatedCostCents,
        latencyMs,
        rationale: routeResult.decision.rationale,
      }),
    ];

    if (status === 'failed' && deepAccessReserved) {
      completionTasks.push(
        refundBrunoDeepAccess(
          supabaseAdmin as unknown as BrunoRpcClient,
          {
            userId: input.user.id,
            requestId: input.requestId,
          }
        )
      );
    }

    await Promise.allSettled(completionTasks);

    posthogServer.capture({
      distinctId: input.user.id,
      event: 'bruno_route_completed',
      properties: {
        mode: routeResult.decision.mode,
        route_source: routeResult.routeSource,
        selected_tier: generationPlan.tier,
        selected_model: model,
        is_pro: isPro,
        used_deep_credit: usedDeepCredit,
        upgrade_card_shown: Boolean(upgradeCard),
        estimated_cost_cents: estimatedCostCents,
        latency_ms: latencyMs,
        status,
      },
    });
  };

  const generationOptions = {
    model: openai(model),
    system: systemPrompt,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(5),
    maxOutputTokens: generationPlan.policy.maxOutputTokens,
    ...getModelCallSettings(model, generationPlan.policy.temperature),
  };


  if (input.isMobile) {
    try {
      const result = await generateText(generationOptions);
      await finalize('completed', result.totalUsage);

      return NextResponse.json({
        text: result.text,
        toolCalls: result.steps.flatMap((step) => step.toolCalls),
        metadata: {
          mode: routeResult.decision.mode,
          tier: generationPlan.tier,
          upgradeCard,
          proWarning,
          proCap,
        },
      });
    } catch (error) {
      Sentry.captureException(error);
      await finalize('failed', {});
      throw error;
    }
  }

  const result = streamText({
    ...generationOptions,
    onFinish: async ({ totalUsage, finishReason }) => {
      await finalize(
        finishReason === 'error' ? 'failed' : 'completed',
        totalUsage
      );
    },
    onError: async ({ error }) => {
      Sentry.captureException(error);
      await finalize('failed', {});
    },
    onAbort: async () => {
      await finalize('failed', {});
    },
  });

  const stream = createUIMessageStream<
    UIMessage<unknown, BrunoDataParts>
  >({
    execute: ({ writer }) => {
      if (upgradeCard) {
        writer.write({
          type: 'data-bruno-upgrade-card',
          data: upgradeCard,
        });
      }
      if (proWarning) {
        writer.write({
          type: 'data-bruno-pro-warning',
          data: proWarning,
        });
      }
      if (proCap) {
        writer.write({
          type: 'data-bruno-pro-cap',
          data: proCap,
        });
      }
      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: {
      'x-bruno-mode': routeResult.decision.mode,
      'x-bruno-tier': generationPlan.tier,
      'x-bruno-pro-limit': String(BRUNO_PRO_MONTHLY_DEEP_LIMIT),
    },
  });
}

export type BrunoV2RouteResult = {
  decision: BrunoRouteDecision;
  routeSource: BrunoRouteSource;
  generationPlan: BrunoGenerationPlan;
  mode: BrunoMode;
};
