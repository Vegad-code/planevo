import * as Sentry from '@sentry/nextjs';
import { openai } from '@ai-sdk/openai';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  jsonSchema,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
  type UIMessageStreamWriter,
} from 'ai';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { buildMemoryContext, getUserAIMemory } from '@/lib/ai/memory';
import { buildPageContextBlock } from '@/lib/bruno/page-context';
import type { BrunoPageContext } from '@/lib/bruno/types';
import { posthogServer } from '@/lib/posthog-server';
import { normalizePlanType, isPaidPlan } from '@/lib/auth/plan-types';
import type { Json } from '@/types/database';
import { buildBrunoSystemPrompt, buildGeneralSystemPrompt } from './brunoPrompts';
import { extractLastUserMessageText } from '@/lib/bruno/enrichTimeBlockProposal';
import { enrichBrunoProposal } from '@/lib/bruno/enrichProposalColor';
import {
  buildBrunoContext,
  type BrunoContextLoaders,
} from './contextBuilder';
import { estimateModelCostCents } from './costEstimator';
import { moderateBrunoMessage } from './moderation';
import {
  applyRouteContextSignalsToPolicy,
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
  BrunoAssistantMode,
  BrunoClarificationResponse,
  BrunoDataParts,
  BrunoDataAccess,
  BrunoGenerationPlan,
  BrunoMode,
  BrunoRouteDecision,
  BrunoRouteSource,
} from './types';
import { parseBrunoDataAccess } from './types';
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
import {
  buildStickyDocumentDecision,
  buildStickyNotesDecision,
  shouldStickToDocumentMode,
  shouldStickToNotesMode,
} from './conversationRouting';
import {
  checkBrunoDocumentsMonthlyQuota,
  checkBrunoNotesMonthlyQuota,
  consumeBrunoDocumentsQuota,
  consumeBrunoNotesQuota,
} from '@/lib/auth/rateLimit';
import { getBrunoComposioTools } from '@/lib/integrations/composio/bruno-tools';
import { buildNotionToolHint } from '@/lib/integrations/composio/providerTools';
import { BrunoProgressWriter } from './progressWriter';
import { getBrunoReadTools } from './readTools';
import { getBrunoV3ReadTools } from './tools/readTools';
import {
  didAutoEscalateToPlanning,
  parseBrunoAssistantMode,
  resolveEffectiveAssistantMode,
  usesMinimalGeneralPrompt,
} from './assistantMode';
import { getBrunoNoteTools } from './noteTools';
import {
  generateBrunoClarificationCard,
  shouldRequestClarification,
} from './clarification';
import { runBrunoAppActionWorkflow } from './appActionWorkflow';
import { persistBrunoProposalArgs } from './proposalPersistence';
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
  assistantMode?: BrunoAssistantMode;
  clarificationResponse?: BrunoClarificationResponse;
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
        'UPDATE_CALENDAR_EVENT',
        'UPDATE_DAILY_PLAN',
        'EXPLAIN_PLAN',
        'NO_ACTION',
        'CREATE_NOTE',
        'UPDATE_NOTE',
        'APPEND_TO_NOTE',
        'ARCHIVE_NOTE',
        'DELETE_CALENDAR_EVENT',
        'DELETE_TASK',
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
        status: { type: 'string', enum: ['todo', 'in_progress', 'done', 'missed'] },
        completed: { type: 'boolean', description: 'Set true to mark a task done, false to reopen it' },
        completedAt: { type: 'string', description: 'ISO 8601 completion timestamp when marking a task done' },
        dueDate: { type: 'string' },
        startTime: { type: 'string', description: 'ISO 8601 start time for CREATE_TIME_BLOCK' },
        endTime: { type: 'string', description: 'ISO 8601 end time for CREATE_TIME_BLOCK' },
        durationMinutes: { type: 'number', description: 'Duration in minutes when endTime is omitted' },
        location: { type: 'string' },
        eventId: { type: 'string', description: 'UUID of an existing calendar event for UPDATE_CALENDAR_EVENT or DELETE_CALENDAR_EVENT' },
        taskId: { type: 'string', description: 'UUID of an existing task for UPDATE_TASK, RESCHEDULE_TASK, or DELETE_TASK' },
        noteId: { type: 'string' },
        noteTitle: { type: 'string' },
        contentMarkdown: { type: 'string' },
        appendMarkdown: { type: 'string' },
        color: { type: 'string', description: 'Hex color e.g. #039BE5 for calendar display' },
        colorCategory: {
          type: 'string',
          enum: ['study', 'exercise', 'break', 'admin', 'work', 'creative', 'social', 'health'],
          description: 'Semantic color category when proposing multiple tasks',
        },
        source: { type: 'string', enum: ['bruno'] },
      },
      additionalProperties: true,
    },
  },
  required: ['type', 'title', 'description'],
});

import {
  resolveBrunoReferenceDate,
  resolveBrunoTimeZone,
} from '@/lib/bruno/schedulingContext';
import {
  persistBrunoAssistantTurn,
  persistBrunoUserTurn,
  resolveAuthoritativeChatMessages,
} from '@/lib/bruno/serverChatHistory';
import {
  applyPlanStepSchema,
  coerceProposedActionInput,
  DESTRUCTIVE_ACTION_TYPES,
  proposedActionSchema,
  type BrunoActionTypeV3,
} from '@/lib/bruno/tools/schemas';

const proposePlanParams = jsonSchema({
  type: 'object' as const,
  properties: {
    summary: {
      type: 'string',
      minLength: 1,
      maxLength: 2000,
      description: 'One or two sentences describing the whole plan for the user.',
    },
    steps: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [
              'CREATE_TASK',
              'UPDATE_TASK',
              'RESCHEDULE_TASK',
              'CREATE_TIME_BLOCK',
              'UPDATE_CALENDAR_EVENT',
              'UPDATE_DAILY_PLAN',
              'CREATE_NOTE',
              'UPDATE_NOTE',
              'APPEND_TO_NOTE',
              'ARCHIVE_NOTE',
              'DELETE_CALENDAR_EVENT',
              'DELETE_TASK',
            ],
          },
          title: { type: 'string', minLength: 1, maxLength: 120 },
          description: { type: 'string', maxLength: 500 },
          ref: {
            type: 'string',
            maxLength: 60,
            description:
              'Optional name for this step so later steps can reference the created entity via taskIdRef/eventIdRef/noteIdRef/linkedTaskIdRef in their payload.',
          },
          payload: { type: 'object', additionalProperties: true },
        },
        required: ['type', 'title'],
      },
    },
  },
  required: ['summary', 'steps'],
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

async function loadLastConversationMode(
  conversationId?: string
): Promise<BrunoMode | null> {
  if (!conversationId) return null;

  const { data, error } = await supabaseAdmin
    .from('bruno_route_events')
    .select('mode')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.mode) return null;
  return data.mode as BrunoMode;
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
  assignmentId?: string,
  dataAccess?: BrunoDataAccess
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

      const mappedTasks = (tasks ?? []).map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        dueDate: task.due_date,
        priority: task.priority,
        estimatedMinutes: task.estimated_minutes,
      }));

      let mappedSourceItems: typeof mappedTasks = [];
      if (dataAccess?.integrations !== false) {
        const { data: sourceItems, error: sourceItemsError } = await supabaseAdmin
          .from('source_items')
          .select('id, title, provider, due_date')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .is('imported_task_id', null)
          .limit(100);

        if (sourceItemsError) throw sourceItemsError;

        mappedSourceItems = (sourceItems ?? []).map((item) => ({
          id: item.id,
          title: `[${item.provider.charAt(0).toUpperCase() + item.provider.slice(1)}] ${item.title}`,
          status: 'todo',
          dueDate: item.due_date,
          priority: 'medium',
          estimatedMinutes: 60,
        }));
      }

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
        .eq('is_deleted', false)
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

  const preferences =
    typeof input.profile?.scheduling_preferences === 'object' &&
    input.profile.scheduling_preferences !== null
      ? (input.profile.scheduling_preferences as Record<string, unknown>)
      : {};
  const preferredTimeZone = resolveBrunoTimeZone({
    clientTimeZone: input.timeZone,
    profilePreferences: preferences,
  });
  const referenceDate = resolveBrunoReferenceDate({
    localTime: input.localTime,
    pageContext: input.pageContext,
  });
  const dataAccess = parseBrunoDataAccess(preferences);

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

  let finalized = false;
  let routeMode: BrunoMode = 'basic_chat';
  let routeTier: string = 'standard';
  let effectiveAssistantMode: BrunoAssistantMode = 'general';
  const requestedAssistantMode = parseBrunoAssistantMode(input.assistantMode);

  const stream = createUIMessageStream<
    UIMessage<unknown, BrunoDataParts>
  >({
    execute: async ({ writer }) => {
      const progress = new BrunoProgressWriter(writer);
      progress.markReadDone();

      let moderation;
      try {
        moderation = await moderateBrunoMessage(latestMessage);
      } catch (error) {
        Sentry.captureException(error);
        progress.markError('safety', 'Safety check unavailable');
        writeStaticText(
          writer,
          'Bruno is temporarily unavailable. Please try again shortly.'
        );
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
        return;
      }

      if (moderation.status === 'unsafe') {
        progress.markError('safety');
        writeStaticText(writer, UNSAFE_RESPONSE);
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
            safetyStatus: 'unsafe',
            inputTokens: 0,
            outputTokens: 0,
            estimatedCostCents: 0,
            latencyMs,
            rationale: 'unsafe safety response',
          }),
        ]);
        progress.markComplete();
        return;
      }

      progress.markSafetyDone();

      // Server-authoritative persistence of the user turn (Phase A): the
      // server owns both sides of the transcript so history survives client
      // races, reloads, and future approval-resume flows.
      if (input.conversationId) {
        try {
          await persistBrunoUserTurn(supabaseAdmin, {
            userId: input.user.id,
            conversationId: input.conversationId,
            text: latestMessage,
          });
        } catch (persistError) {
          Sentry.captureException(persistError);
        }
      }

      const lastMode = await loadLastConversationMode(input.conversationId);
      const stickyNotes = shouldStickToNotesMode({
        message: latestMessage,
        lastMode,
      });
      const stickyDocument = shouldStickToDocumentMode({
        message: latestMessage,
        lastMode,
      });

      let routeResult: Awaited<ReturnType<typeof routeBrunoMessage>>;
      if (stickyNotes) {
        routeResult = {
          decision: buildStickyNotesDecision('notes refinement follow-up'),
          routeSource: 'deterministic',
          latencyMs: 0,
        };
      } else if (stickyDocument) {
        routeResult = {
          decision: buildStickyDocumentDecision(
            'document writing refinement follow-up'
          ),
          routeSource: 'deterministic',
          latencyMs: 0,
        };
      } else {
        routeResult = await routeBrunoMessage(
          { message: latestMessage },
          flags.llmRouterEnabled
            ? {}
            : {
                classify: async () => {
                  throw new Error('LLM router disabled');
                },
              }
        );
      }

      if (routeResult.decision.mode === 'notes' && !isPro) {
        const notesQuota = await checkBrunoNotesMonthlyQuota(
          input.user.id,
          input.user.email
        );
        if (!notesQuota.allowed) {
          progress.markError('route', 'Notes limit reached');
          writeStaticText(
            writer,
            notesQuota.message ??
              "You've reached your free notes limit for this month."
          );
          await completeBrunoUsage(usageRepository, {
            usageLogId: input.usageLogId,
            model: null,
            mode: 'notes',
            tier: 'none',
            inputTokens: 0,
            outputTokens: 0,
            estimatedCostCents: 0,
            latencyMs: Math.round(performance.now() - startedAt),
            status: 'completed',
          }).catch(Sentry.captureException);
          progress.markComplete();
          return;
        }
      }

      if (routeResult.decision.mode === 'document_writing' && !isPro) {
        const documentsQuota = await checkBrunoDocumentsMonthlyQuota(
          input.user.id,
          input.user.email
        );
        if (!documentsQuota.allowed) {
          progress.markError('route', 'Document limit reached');
          writeStaticText(
            writer,
            documentsQuota.message ??
              "You've reached your free document-writing limit for this month."
          );
          await completeBrunoUsage(usageRepository, {
            usageLogId: input.usageLogId,
            model: null,
            mode: 'document_writing',
            tier: 'none',
            inputTokens: 0,
            outputTokens: 0,
            estimatedCostCents: 0,
            latencyMs: Math.round(performance.now() - startedAt),
            status: 'completed',
          }).catch(Sentry.captureException);
          progress.markComplete();
          return;
        }
      }

      routeMode = routeResult.decision.mode;
      effectiveAssistantMode = resolveEffectiveAssistantMode({
        assistantMode: requestedAssistantMode,
        routeMode: routeResult.decision.mode,
      });
      const autoEscalated = didAutoEscalateToPlanning({
        assistantMode: requestedAssistantMode,
        effectiveAssistantMode,
      });
      const routeHasContextSignal =
        routeResult.decision.needsTaskContext ||
        routeResult.decision.needsCalendarContext ||
        routeResult.decision.needsCanvasContext;
      const useMinimalPrompt = usesMinimalGeneralPrompt({
        effectiveAssistantMode,
        routeMode: routeResult.decision.mode,
        routeHasContextSignal,
      });

      if (autoEscalated) {
        writer.write({
          type: 'data-bruno-assistant-mode-notice',
          data: {
            type: 'bruno_assistant_mode_notice',
            requestedMode: requestedAssistantMode,
            effectiveMode: effectiveAssistantMode,
            autoEscalated: true,
            message: 'Switched to planning for this reply',
          },
        });
      }

      progress.markRouteDone(
        routeResult.decision.mode,
        routeResult.decision.rationale
      );

      if (
        routeResult.decision.mode === 'app_action' &&
        (dataAccess.calendar || dataAccess.tasks)
      ) {
        try {
          const workflowResult = await runBrunoAppActionWorkflow({
            userId: input.user.id,
            message: latestMessage,
            timeZone: preferredTimeZone,
            supabase: supabaseAdmin,
            dataAccess,
            referenceDate: resolveBrunoReferenceDate({
              localTime: input.localTime,
              pageContext: input.pageContext,
            }),
          });

          // Only short-circuit the model when the deterministic workflow
          // produced concrete proposals. Ambiguity text ("which event did you
          // mean?") must fall through to the agent loop — the regex parser
          // cannot understand the user's clarifying reply, so treating it as
          // handled dead-ends the conversation.
          if (workflowResult.handled && workflowResult.proposals.length > 0) {
            routeTier = 'standard';
            const assistantText =
              workflowResult.text ||
              'I prepared the calendar changes for confirmation.';
            writeStaticText(writer, assistantText);

            if (workflowResult.proposals.length > 0) {
              writer.write({
                type: 'data-bruno-action-proposals',
                data: {
                  type: 'bruno_action_proposals',
                  source: 'deterministic_app_action_workflow',
                  proposals: workflowResult.proposals,
                },
              });
            }

            progress.markComplete();
            const latencyMs = Math.round(performance.now() - startedAt);
            await Promise.allSettled([
              completeBrunoUsage(usageRepository, {
                usageLogId: input.usageLogId,
                model: null,
                mode: routeResult.decision.mode,
                tier: 'standard',
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
                mode: routeResult.decision.mode,
                confidence: routeResult.decision.confidence,
                routeSource: routeResult.routeSource,
                selectedTier: 'standard',
                selectedModel: null,
                isPro,
                usedDeepCredit: false,
                upgradeCardShown: false,
                safetyStatus: 'clear',
                inputTokens: 0,
                outputTokens: 0,
                estimatedCostCents: 0,
                latencyMs,
                rationale: `[deterministic_app_action_workflow;assistant=${requestedAssistantMode};effective=${effectiveAssistantMode};autoEscalated=${autoEscalated}] ${routeResult.decision.rationale}`,
              }),
            ]);

            posthogServer.capture({
              distinctId: input.user.id,
              event: 'bruno_app_action_workflow_completed',
              properties: {
                mode: routeResult.decision.mode,
                route_source: routeResult.routeSource,
                proposal_count: workflowResult.proposals.length,
                conversation_id: input.conversationId ?? null,
                platform: input.isMobile ? 'mobile' : 'web',
              },
            });
            return;
          }
        } catch (error) {
          Sentry.captureException(error);
          console.warn(
            '[Bruno App Action Workflow] Falling back to model generation:',
            error
          );
        }
      }

      if (
        shouldRequestClarification({
          message: latestMessage,
          decision: routeResult.decision,
          clarificationResponse: input.clarificationResponse,
          env: process.env,
        })
      ) {
        try {
          const {
            card,
            usage,
            model: clarificationModel,
          } = await generateBrunoClarificationCard({
            message: latestMessage,
            routeMode: routeResult.decision.mode,
            userName: input.profile?.name,
            pageLabel: input.pageContext?.label,
            localTime: input.localTime,
            timeZone: input.timeZone,
          }, {
            onGenerationError: (error) => {
              Sentry.captureException(error);
              console.warn(
                '[Bruno Clarification] Using fallback V2 questions after generation failed:',
                error
              );
            },
          });
          const inputTokens = usage.inputTokens ?? 0;
          const outputTokens = usage.outputTokens ?? 0;
          const estimatedCostCents = estimateModelCostCents(
            clarificationModel,
            { inputTokens, outputTokens }
          );
          const latencyMs = Math.round(performance.now() - startedAt);

          routeTier = 'standard';
          writeStaticText(writer, card.intro);
          writer.write({
            type: 'data-bruno-clarification-card',
            data: card,
          });
          progress.markComplete();

          await Promise.allSettled([
            completeBrunoUsage(usageRepository, {
              usageLogId: input.usageLogId,
              model: clarificationModel,
              mode: routeResult.decision.mode,
              tier: 'standard',
              inputTokens,
              outputTokens,
              estimatedCostCents,
              latencyMs,
              status: 'completed',
            }),
            logBrunoRouteEvent(usageRepository, {
              userId: input.user.id,
              requestId: input.requestId,
              conversationId: input.conversationId,
              mode: routeResult.decision.mode,
              confidence: routeResult.decision.confidence,
              routeSource: routeResult.routeSource,
              selectedTier: 'standard',
              selectedModel: clarificationModel,
              isPro,
              usedDeepCredit: false,
              upgradeCardShown: false,
              safetyStatus: 'clear',
              inputTokens,
              outputTokens,
              estimatedCostCents,
              latencyMs,
              rationale: `[clarification_requested;assistant=${requestedAssistantMode};effective=${effectiveAssistantMode};autoEscalated=${autoEscalated}] ${routeResult.decision.rationale}`,
            }),
          ]);

          posthogServer.capture({
            distinctId: input.user.id,
            event: 'bruno_clarification_requested',
            properties: {
              mode: routeResult.decision.mode,
              route_source: routeResult.routeSource,
              selected_model: clarificationModel,
              question_count: card.questions.length,
              conversation_id: input.conversationId ?? null,
              platform: input.isMobile ? 'mobile' : 'web',
              assistant_mode: requestedAssistantMode,
              effective_assistant_mode: effectiveAssistantMode,
            },
          });
          return;
        } catch (error) {
          Sentry.captureException(error);
          console.warn(
            '[Bruno Clarification] Falling back to normal V2 generation:',
            error
          );
        }
      }

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

      routeTier = generationPlan.tier;

      const contextPolicy = useMinimalPrompt
        ? {
            ...generationPlan.policy,
            includeTasks: false,
            includeCalendar: false,
            includeCanvas: false,
          }
        : applyRouteContextSignalsToPolicy(
            generationPlan.policy,
            routeResult.decision
          );
      const contextParts: string[] = [];
      if (contextPolicy.includeTasks) contextParts.push('tasks');
      if (contextPolicy.includeCalendar) contextParts.push('calendar');
      if (contextPolicy.includeCanvas) contextParts.push('Canvas');
      progress.markContextLoading(
        contextParts.length > 0
          ? `Loading ${contextParts.join(', ')}`
          : undefined
      );

      const context = useMinimalPrompt
        ? {
            taskContext: '',
            calendarContext: '',
            canvasContext: '',
            integrationContext: '',
          }
        : await buildBrunoContext(
            {
              userId: input.user.id,
              policy: contextPolicy,
              assignmentId: input.assignmentId,
              dataAccess,
            },
            createContextLoaders(input.assignmentId, dataAccess)
          );
      progress.markContextDone(
        contextParts.length > 0
          ? `Loaded ${contextParts.join(', ')}`
          : undefined
      );

      const memoryContext = useMinimalPrompt
        ? ''
        : buildMemoryContext(
            await getUserAIMemory(supabaseAdmin, input.user.id)
          );

      const proProviders = ['notion', 'slack', 'linear'];
      let connectedProviders: string[] = [];
      if (isPro && dataAccess.integrations) {
        const { data: accts } = await supabaseAdmin
          .from('integration_accounts')
          .select('provider, status')
          .eq('user_id', input.user.id)
          .in('provider', proProviders);
        connectedProviders = (accts ?? [])
          .filter((a) => a.status === 'connected')
          .map((a) => a.provider);
      }

      let dynamicMcpTools: Record<string, unknown> = {};
      let mcpContext = '';
      if (!dataAccess.integrations) {
        if (!useMinimalPrompt) {
          mcpContext +=
            'Access to Slack, Notion, and Linear is disabled in the user\'s privacy settings. You cannot view or write to them. If the user asks about integrations, tell them to enable access in Settings > Bruno Preferences.\n';
        }
      } else if (!isPro) {
        if (!useMinimalPrompt) {
          mcpContext +=
            'Work integrations (Notion, Slack, Linear) are a Planevo Pro feature. If the user asks to use them, let them know these connect under Settings > Integrations on the Pro plan. Do not claim to perform external actions.\n';
        }
      } else if (connectedProviders.length === 0) {
        if (!useMinimalPrompt) {
          mcpContext +=
            'The user is on Pro but has not connected any work tools yet. If they ask about Notion, Slack, or Linear, point them to Settings > Integrations to connect. Do not claim to perform external actions.\n';
        }
      } else {
        progress.markIntegrationsActive(
          connectedProviders.join(', ')
        );
        try {
          if (process.env.COMPOSIO_API_KEY) {
            dynamicMcpTools = await getBrunoComposioTools(
              input.user.id,
              connectedProviders as Array<'notion' | 'slack' | 'linear'>
            );

            if (!useMinimalPrompt) {
              if (connectedProviders.includes('notion')) {
                const { data: notionAccount } = await supabaseAdmin
                  .from('integration_accounts')
                  .select('metadata')
                  .eq('user_id', input.user.id)
                  .eq('provider', 'notion')
                  .maybeSingle();
                const notionDbIds = Array.isArray(
                  (notionAccount?.metadata as Record<string, unknown> | null)
                    ?.notion_database_ids
                )
                  ? (
                      (notionAccount?.metadata as Record<string, unknown>)
                        .notion_database_ids as string[]
                    ).map(String)
                  : [];
                mcpContext += `${buildNotionToolHint(notionDbIds)}\n`;
              }

              mcpContext += `Connected work tools: ${connectedProviders.join(', ')}. You have access to tools via Composio for these apps. IMPORTANT: When a user asks you to perform an action on an external app (like creating a Notion page or sending a Slack message), you MUST use the Composio tools. DO NOT use the propose_action tool to create a local Planevo task for external app requests. Confirm with the user before sending messages or making destructive external changes.\n`;
            }
          }
          progress.markIntegrationsDone(
            connectedProviders.join(', ')
          );
        } catch (err) {
          console.warn('Failed to load Composio tools:', err);
          progress.markIntegrationsDone('Unavailable');
        }
      }

      const systemPrompt = useMinimalPrompt
        ? buildGeneralSystemPrompt({ dataAccess })
        : buildBrunoSystemPrompt({
            mode: routeResult.decision.mode,
            userName: input.profile?.name ?? 'User',
            userPlan,
            localTime: input.localTime ?? new Date().toLocaleString(),
            timeZone: preferredTimeZone,
            referenceDateIso: referenceDate.toISOString(),
            pageContext: buildPageContextBlock(input.pageContext),
            memoryContext,
            taskContext: context.taskContext,
            calendarContext: context.calendarContext,
            canvasContext: context.canvasContext,
            integrationContext: context.integrationContext,
            connectedProviders,
            mcpContext: mcpContext.trim(),
            dataAccess,
          });

      const v1ReadTools = getBrunoReadTools(input.user.id, dataAccess);
      const {
        search_tasks: _searchTasks,
        search_calendar_events: _searchCalendar,
        ...v1ReadToolsWithoutDuplicates
      } = v1ReadTools;
      const readTools = {
        ...getBrunoV3ReadTools(input.user.id, dataAccess, preferredTimeZone),
        ...v1ReadToolsWithoutDuplicates,
      };
      const noteTools = getBrunoNoteTools(input.user.id);
      const lastUserMessageText = extractLastUserMessageText(
        input.messages as Parameters<typeof extractLastUserMessageText>[0]
      );
      const proposeReferenceDate = referenceDate;

      const tools = {
        propose_action: tool({
          description:
            'Create a proposal card for a Planevo action (task, calendar, plan, or note change). Use it whenever the user asks for any in-app change, however they phrase it — the user confirms the card before anything mutates, so prefer proposing a reasonable interpretation over holding back. DO NOT use for external integrations (Notion, Slack, Linear) — use Composio tools instead. This never mutates data directly. For existing calendar moves/edits/deletes, call get_calendar_events or search_calendar_events first and include payload.eventId. For task updates/reschedules/completion, include payload.taskId from get_tasks or search_tasks. To mark a task done, use UPDATE_TASK with payload.status="done" and payload.completed=true. For bulk moves ("move everything on Thursday"), call read tools for the source day, then call this tool once per event or task — never combine multiple items into one proposal. When proposing multiple CREATE_TASK or CREATE_TIME_BLOCK actions, assign each a distinct payload.colorCategory.',
          inputSchema: proposeActionParams,
          execute: async (proposal: unknown) => {
            const enrichedArgs = await enrichBrunoProposal(
              coerceProposedActionInput(proposal),
              {
                userId: input.user.id,
                supabase: supabaseAdmin,
                texts: lastUserMessageText ? [lastUserMessageText] : [],
                timeZone: preferredTimeZone,
                referenceDate: proposeReferenceDate,
              }
            );
            const parsed = proposedActionSchema.safeParse(enrichedArgs);
            if (!parsed.success) {
              return {
                success: false,
                error: `Invalid proposal: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
              };
            }
            const { proposalId } = await persistBrunoProposalArgs(
              supabaseAdmin,
              input.user.id,
              parsed.data,
              'llm_propose_action'
            );
            return {
              success: true,
              proposalId,
              message: 'Proposal recorded. Waiting for user confirmation.',
            };
          },
        }),
        propose_plan: tool({
          description:
            'Create ONE plan card covering an ordered multi-step change (3+ related actions), confirmed by the user in a single tap — e.g. "plan my week", "clear my afternoon and move everything to tomorrow", a project breakdown with scheduled blocks. Read current state with read tools first, then list every step with real IDs. Steps run in order; give a step a "ref" name and reference the entity it creates in a later step via payload.taskIdRef / eventIdRef / noteIdRef / linkedTaskIdRef. For a single change, use propose_action instead. This never mutates data directly.',
          inputSchema: proposePlanParams,
          execute: async (planInput: unknown) => {
            const planRecord =
              typeof planInput === 'object' && planInput !== null
                ? (planInput as Record<string, unknown>)
                : {};
            const summary =
              typeof planRecord.summary === 'string' && planRecord.summary.trim()
                ? planRecord.summary.trim()
                : 'Apply this plan';
            const rawSteps = Array.isArray(planRecord.steps)
              ? planRecord.steps
              : [];

            const enrichedSteps: Array<Record<string, unknown>> = [];
            const stepErrors: string[] = [];
            for (const [index, rawStep] of rawSteps.entries()) {
              const enriched = await enrichBrunoProposal(
                coerceProposedActionInput(rawStep),
                {
                  userId: input.user.id,
                  supabase: supabaseAdmin,
                  texts: lastUserMessageText ? [lastUserMessageText] : [],
                  timeZone: preferredTimeZone,
                  referenceDate: proposeReferenceDate,
                }
              );
              const ref =
                typeof (rawStep as Record<string, unknown>)?.ref === 'string'
                  ? (rawStep as Record<string, unknown>).ref
                  : undefined;
              const parsedStep = applyPlanStepSchema.safeParse({
                ...enriched,
                ref,
              });
              if (!parsedStep.success) {
                stepErrors.push(
                  `Step ${index + 1} (${String((rawStep as Record<string, unknown>)?.title ?? 'untitled')}): ${parsedStep.error.issues.map((issue) => issue.message).slice(0, 2).join('; ')}`
                );
                continue;
              }
              enrichedSteps.push(parsedStep.data);
            }

            if (stepErrors.length > 0) {
              return {
                success: false,
                error: `Invalid plan steps — fix and retry: ${stepErrors.join(' | ')}`,
              };
            }
            if (enrichedSteps.length === 0) {
              return { success: false, error: 'The plan has no valid steps.' };
            }

            const hasDestructiveStep = enrichedSteps.some((step) =>
              DESTRUCTIVE_ACTION_TYPES.has(step.type as BrunoActionTypeV3)
            );
            const planArgs = {
              type: 'APPLY_PLAN',
              title: summary.length > 120 ? `${summary.slice(0, 117)}...` : summary,
              description: summary,
              riskLevel: hasDestructiveStep ? 'high' : 'medium',
              requiresConfirmation: true,
              payload: {
                planSummary: summary,
                steps: enrichedSteps,
              },
            };
            const { proposalId } = await persistBrunoProposalArgs(
              supabaseAdmin,
              input.user.id,
              planArgs,
              'llm_propose_plan'
            );
            return {
              success: true,
              proposalId,
              proposal: { ...planArgs, id: proposalId },
              message: `Plan with ${enrichedSteps.length} steps recorded. Waiting for user confirmation.`,
            };
          },
        }),
        ...readTools,
        ...dynamicMcpTools,
      };

      let normalizedMessages: Awaited<
        ReturnType<typeof resolveAuthoritativeChatMessages>
      >;
      try {
        normalizedMessages = await resolveAuthoritativeChatMessages(
          supabaseAdmin,
          input.user.id,
          input.conversationId,
          input.messages
        );
      } catch (historyError) {
        console.warn(
          '[Bruno] Server chat history unavailable, using client user turns:',
          historyError
        );
        normalizedMessages = await resolveAuthoritativeChatMessages(
          supabaseAdmin,
          input.user.id,
          undefined,
          input.messages
        );
      }
      const modelMessages = await convertToModelMessages(normalizedMessages, {
        // Rehydrated history may contain tool parts; never let an incomplete
        // historical tool call break the conversion.
        ignoreIncompleteToolCalls: true,
      });
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
          progress.markError('route');
          writeStaticText(writer, UNSAFE_RESPONSE);
          progress.markComplete();
          return;
        }
        generationPlan = {
          ...generationPlan,
          tier: 'standard',
          model: BRUNO_MODELS.STANDARD,
        };
      }

      const model: string = generationPlan.model!;
      routeTier = generationPlan.tier;

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
            rationale: `[assistant=${requestedAssistantMode};effective=${effectiveAssistantMode};autoEscalated=${autoEscalated}] ${routeResult.decision.rationale}`,
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
            assistant_mode: requestedAssistantMode,
            effective_assistant_mode: effectiveAssistantMode,
            auto_escalated: autoEscalated,
          },
        });
      };

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

      progress.markGenerating();

      const isNotesMode = routeResult.decision.mode === 'notes';
      const isDocumentMode = routeResult.decision.mode === 'document_writing';
      // A flat, generous step budget: multi-item requests (read + N proposals)
      // must never silently truncate because the router picked the wrong mode.
      const toolStepLimit = 25;
      // Reasoning effort is the quality knob for gpt-5.x models: 'medium' for
      // planning-heavy work, 'low' for everything else (latency-sensitive).
      const reasoningEffort =
        generationPlan.tier === 'deep' ||
        routeResult.decision.mode === 'daily_planning' ||
        routeResult.decision.mode === 'schedule_repair'
          ? ('medium' as const)
          : ('low' as const);

      const generationOptions = {
        // Responses API so reasoning items persist across tool-call steps —
        // required for gpt-5.x models to keep plan state through the loop.
        model: model.startsWith('gpt-5')
          ? openai.responses(model)
          : openai(model),
        providerOptions: model.startsWith('gpt-5')
          ? { openai: { reasoningEffort } }
          : undefined,
        system: systemPrompt,
        messages: modelMessages,
        // Notes mode keeps propose_action so mixed requests ("save this note
        // and add a review task") can act on both halves.
        tools: isNotesMode
          ? { ...tools, ...noteTools }
          : tools,
        stopWhen: stepCountIs(toolStepLimit),
        maxOutputTokens: generationPlan.policy.maxOutputTokens,
        ...getModelCallSettings(model, generationPlan.policy.temperature),
      };

      const result = streamText({
        ...generationOptions,
        onFinish: async ({ totalUsage, finishReason, text, steps }) => {
          if (!text?.trim()) {
            const hasToolSteps = (steps?.length ?? 0) > 0;
            writeStaticText(
              writer,
              hasToolSteps
                ? "I connected to your tools but couldn't finish a summary in time. Try a narrower ask—for example, \"List my urgent Notion tasks only\"—and I'll pick up from there."
                : "I couldn't produce a reply for that request. Please try rephrasing or ask for one specific change at a time."
            );
            progress.markError('generate', 'No text response');
            progress.markComplete();
          } else if (finishReason === 'length' && text?.trim()) {
            writer.write({
              type: 'data-bruno-truncated',
              data: {
                type: 'bruno_truncated',
                message:
                  'I hit the length limit. Say **continue** for the rest, or tap **Save to Notes**.',
                assistantText: text,
                canContinue: true,
              },
            });
            writeStaticText(
              writer,
              '\n\n---\n\nI hit the length limit. Say **continue** for the rest, or tap **Save to Notes**.'
            );
            progress.markComplete();
          } else {
            progress.markComplete();
          }

          if (isNotesMode && finishReason !== 'error') {
            await consumeBrunoNotesQuota(input.user.id, input.requestId);
          }
          if (isDocumentMode && finishReason !== 'error') {
            await consumeBrunoDocumentsQuota(input.user.id, input.requestId);
          }

          await finalize(
            finishReason === 'error' ? 'failed' : 'completed',
            totalUsage
          );
        },
        onError: async ({ error }) => {
          Sentry.captureException(error);
          progress.markError('generate');
          const message =
            error instanceof Error
              ? error.message
              : 'Bruno hit an error. Please try again.';
          writeStaticText(writer, message);
          writer.write({
            type: 'data-bruno-stream-error',
            data: {
              type: 'bruno_stream_error',
              message,
            },
          });
          await finalize('failed', {});
        },
        onAbort: async () => {
          progress.markError('generate', 'Stopped');
          writer.write({
            type: 'data-bruno-stream-error',
            data: {
              type: 'bruno_stream_error',
              message: 'Bruno stopped before finishing this reply.',
            },
          });
          await finalize('failed', {});
        },
      });

      writer.merge(result.toUIMessageStream());
    },
    onFinish: async ({ responseMessage, isAborted }) => {
      // Persist the assistant turn with full parts (tool calls, proposals,
      // data cards) so conversations rehydrate faithfully after reload.
      if (!input.conversationId || isAborted) return;
      try {
        await persistBrunoAssistantTurn(supabaseAdmin, {
          userId: input.user.id,
          conversationId: input.conversationId,
          message: responseMessage,
        });
      } catch (persistError) {
        Sentry.captureException(persistError);
      }
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: {
      'x-bruno-mode': routeMode,
      'x-bruno-tier': routeTier,
      'x-bruno-pro-limit': String(BRUNO_PRO_MONTHLY_DEEP_LIMIT),
      'x-bruno-assistant-mode': effectiveAssistantMode,
      'x-bruno-assistant-requested': requestedAssistantMode,
    },
  });
}

export type BrunoV2RouteResult = {
  decision: BrunoRouteDecision;
  routeSource: BrunoRouteSource;
  generationPlan: BrunoGenerationPlan;
  mode: BrunoMode;
};
