'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PaperPlaneTilt, ArrowsInSimple, ArrowsOutSimple, ClockCounterClockwise, PencilSimple, Stop, Plus, Trash, Warning, X, CaretDown, Copy, CalendarBlank } from '@phosphor-icons/react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { brunoMarkdownComponents } from '@/components/bruno/brunoMarkdownComponents';
import PlanDraftCard from '../bruno/PlanDraftCard';
import type { PlanDraftItemData } from '../bruno/PlanDraftCard';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useBruno } from '@/components/bruno/BrunoProvider';
import { BrunoContextBanner } from '@/components/bruno/BrunoContextBanner';
import { BrunoSuggestedActions } from '@/components/bruno/BrunoSuggestedActions';
import { createBrunoChatRequestBody } from '@/lib/bruno/chat-request';
import { shouldShowBrunoStarterActions } from '@/lib/bruno/starter-actions';
import { BrunoFaceMark } from '@/components/bruno/BrunoFaceMark';
import { cn } from '@/lib/utils';

import type { BrunoActionProposal } from '@/lib/bruno/tools/types';
import { enrichTimeBlockProposal } from '@/lib/bruno/enrichTimeBlockProposal';
import { assignColorsToProposalBatch } from '@/lib/bruno/proposalColors';
import { type ExecutionStatus } from '../bruno/BrunoActionProposalCard';
import { BrunoProposalGroup } from '../bruno/BrunoProposalGroup';
import { BrunoEntitlementNotice } from '../bruno/BrunoEntitlementNotice';
import { BrunoIntegrationChips } from '../bruno/BrunoIntegrationChips';
import {
  BrunoIntegrationActionCard,
  type IntegrationActionStatus,
} from '../bruno/BrunoIntegrationActionCard';
import type { BrunoDataParts } from '@/lib/bruno/types';
import { BrunoThinkingIndicator } from '@/components/bruno/BrunoThinkingIndicator';
import { BrunoNoteActions } from '@/components/bruno/BrunoNoteActions';
import { BrunoChatLimitPaywall } from '@/components/bruno/BrunoChatLimitPaywall';
import { BrunoClarificationCard } from '@/components/bruno/BrunoClarificationCard';
import { useBrunoChatProgressState } from '@/hooks/useBrunoChatProgress';
import { useBrunoAssistantMode } from '@/hooks/useBrunoAssistantMode';
import { useBrunoThinkingLabel } from '@/hooks/useBrunoThinkingLabel';
import { useSubscription } from '@/hooks/use-subscription';
import type {
  BrunoClarificationCard as BrunoClarificationCardData,
  BrunoClarificationResponse,
  BrunoRateLimitPayload,
} from '@/lib/bruno/types';
import {
  isRateLimitActive,
  parseBrunoRateLimitError,
} from '@/lib/bruno/rate-limit-client';
import { readBrunoExecuteActionResponse } from '@/lib/bruno/executeResponse';

type BrunoUIMessage = UIMessage<unknown, BrunoDataParts>;

const BRUNO_GREETING = 'How can I help you today?';
const BRUNO_PLANNING_GREETING = 'How can I help you plan today?';

function extractClarificationCardsFromMessage(
  message: BrunoUIMessage
): BrunoClarificationCardData[] {
  const cards: BrunoClarificationCardData[] = [];
  for (const part of message.parts ?? []) {
    if (part.type === 'data-bruno-clarification-card' && 'data' in part) {
      cards.push(part.data as BrunoClarificationCardData);
    }
  }
  return cards;
}

interface BrunoChatSidebarProps {
  onFinish?: () => void;
  isProcessing?: boolean;
  initialMessage?: string;
  assignmentId?: string;
  variant?: 'sidebar' | 'dock';
  onMinimize?: () => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

export default function BrunoChatSidebar({
  onFinish,
  isProcessing: isExternalProcessing = false,
  initialMessage,
  assignmentId,
  variant = 'sidebar',
  onMinimize,
  isFullScreen = false,
  onToggleFullScreen,
}: BrunoChatSidebarProps) {
  const { assistantMode, togglePlanningMode, isPlanningMode } =
    useBrunoAssistantMode();
  const [actionStatuses, setActionStatuses] = useState<Record<string, ExecutionStatus>>({});
  const [_executingActions, setExecutingActions] = useState<Record<string, boolean>>({});
  const [actionErrors, setActionErrors] = useState<Record<string, string | null>>({});
  const [fallbackProposalsByMessageId, setFallbackProposalsByMessageId] = useState<Record<string, BrunoActionProposal[]>>({});
  const lastUserMessageRef = useRef<string>("");

  function stableHash(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(16);
  }

  function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  function normalizeProposal(value: unknown): BrunoActionProposal | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const proposal = value as Record<string, unknown>;
    if (typeof proposal.type !== 'string' || typeof proposal.title !== 'string') {
      return null;
    }

    return {
      id:
        typeof proposal.id === 'string'
          ? proposal.id
          : `proposal-${stableHash(JSON.stringify(proposal))}`,
      type: proposal.type as BrunoActionProposal['type'],
      title: proposal.title,
      description:
        typeof proposal.description === 'string'
          ? proposal.description
          : proposal.title,
      status: 'pending_confirmation',
      riskLevel:
        proposal.riskLevel === 'medium' || proposal.riskLevel === 'high'
          ? proposal.riskLevel
          : 'low',
      requiresConfirmation:
        typeof proposal.requiresConfirmation === 'boolean'
          ? proposal.requiresConfirmation
          : true,
      payload:
        proposal.payload &&
        typeof proposal.payload === 'object' &&
        !Array.isArray(proposal.payload)
          ? (proposal.payload as Record<string, unknown>)
          : {},
      createdAt:
        typeof proposal.createdAt === 'string'
          ? proposal.createdAt
          : new Date().toISOString(),
    };
  }

  function extractProposalsFromMessage(message: { parts?: unknown[] }, lastUserText?: string): BrunoActionProposal[] {
    const parts = Array.isArray(message.parts) ? message.parts : [];
    const nativeProposals = parts.flatMap((part) => {
      if (!isRecord(part) || part.type !== 'data-bruno-action-proposals') {
        return [];
      }
      const data = part.data as { proposals?: unknown[] } | undefined;
      if (!Array.isArray(data?.proposals)) return [];
      return data.proposals
        .map(normalizeProposal)
        .filter((proposal): proposal is BrunoActionProposal => Boolean(proposal));
    });

    const tools = parts.filter((part): part is Record<string, unknown> => {
      if (!isRecord(part)) return false;
      const toolInvocation = isRecord(part.toolInvocation)
        ? part.toolInvocation
        : null;
      return (
        part.type === 'tool-propose_action' ||
        part.type === 'tool-propose_plan' ||
        (part.type === 'tool-invocation' &&
          (toolInvocation?.toolName === 'propose_action' ||
            toolInvocation?.toolName === 'propose_plan'))
      );
    });

    const prepared = tools.map((part: Record<string, unknown>) => {
      const toolInvocation = part.toolInvocation as Record<string, unknown> | undefined;
      const toolOutput =
        part.output ??
        part.result ??
        toolInvocation?.result ??
        toolInvocation?.output;
      const outputRecord =
        toolOutput && typeof toolOutput === 'object' && !Array.isArray(toolOutput)
          ? (toolOutput as Record<string, unknown>)
          : null;
      // Prefer the server-shaped proposal from the tool output when present
      // (propose_plan returns one — its raw args are {summary, steps}, not a
      // proposal). Fall back to the raw tool args for propose_action.
      const serverProposal =
        outputRecord?.proposal &&
        typeof outputRecord.proposal === 'object' &&
        !Array.isArray(outputRecord.proposal)
          ? (outputRecord.proposal as Record<string, unknown>)
          : null;
      const rawArgs =
        serverProposal ??
        ((part.input ?? part.args ?? toolInvocation?.args ?? toolInvocation?.input ?? {}) as Record<string, unknown>);
      const argsWithServerId =
        typeof outputRecord?.proposalId === 'string'
          ? { ...rawArgs, id: outputRecord.proposalId }
          : rawArgs;
      const args =
        argsWithServerId.type === 'CREATE_TIME_BLOCK'
          ? enrichTimeBlockProposal(argsWithServerId, {
              texts: lastUserText ? [lastUserText] : [],
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            })
          : argsWithServerId;
      return { part, args };
    });

    const colorizedArgs = assignColorsToProposalBatch(
      prepared.map(({ args }: { args: Record<string, unknown> }) => ({
        ...args,
        payload:
          typeof args.payload === 'object' && args.payload !== null
            ? args.payload
            : {},
      }))
    ) as Record<string, unknown>[];

    const toolProposals: BrunoActionProposal[] = prepared.map(({ part, args }: { part: Record<string, unknown>; args: Record<string, unknown> }, index: number) => {
      const enriched = colorizedArgs[index] ?? args;
      const toolInvocation = part.toolInvocation as Record<string, unknown> | undefined;
      const toolCallId =
        typeof part.toolCallId === 'string'
          ? part.toolCallId
          : typeof toolInvocation?.toolCallId === 'string'
            ? toolInvocation.toolCallId
            : null;
      const id =
        typeof enriched.id === 'string'
          ? enriched.id
          : toolCallId ?? `proposal-${stableHash(JSON.stringify(enriched))}`;
      
      return {
        id,
        type: enriched.type as BrunoActionProposal['type'],
        title:
          typeof enriched.title === 'string'
            ? enriched.title
            : 'Proposed action',
        description:
          typeof enriched.description === 'string'
            ? enriched.description
            : 'Confirm this proposed change',
        status: "pending_confirmation",
        riskLevel:
          enriched.riskLevel === 'medium' || enriched.riskLevel === 'high'
            ? enriched.riskLevel
            : 'low',
        requiresConfirmation:
          typeof enriched.requiresConfirmation === 'boolean'
            ? enriched.requiresConfirmation
            : true,
        payload: isRecord(enriched.payload) ? enriched.payload : {},
        createdAt:
          typeof enriched.createdAt === 'string'
            ? enriched.createdAt
            : new Date().toISOString(),
      };
    });

    const byId = new Map<string, BrunoActionProposal>();
    for (const proposal of [...nativeProposals, ...toolProposals]) {
      if (!byId.has(proposal.id)) byId.set(proposal.id, proposal);
    }
    return [...byId.values()];
  }

  function isTaskBreakdownIntent(text: string) {
    return /\b(break down|breakdown|smaller tasks|task list|turn .* into tasks|split .* into tasks|make .* realistic|realistic for tonight)\b/i.test(text);
  }

  function formatClarificationResponseForChat(
    response: BrunoClarificationResponse
  ) {
    const isSkip = response.answers.every((answer) => answer.source === 'skip');
    if (isSkip) {
      return `Answer with reasonable assumptions for: "${response.originalPrompt}"`;
    }

    const answerLines = response.answers.map(
      (answer) => `- ${answer.question}: ${answer.answer}`
    );
    return [
      'Here is the context Bruno asked for:',
      '',
      `Original request: ${response.originalPrompt}`,
      '',
      ...answerLines,
    ].join('\n');
  }

  function publishExecutedAction(proposal: BrunoActionProposal, result: unknown) {
    const detail = {
      actionType: proposal.type,
      proposalId: proposal.id,
      result,
    };

    window.dispatchEvent(
      new CustomEvent('planevo:bruno-action-executed', { detail })
    );

    if (
      proposal.type === 'CREATE_TIME_BLOCK' ||
      proposal.type === 'UPDATE_CALENDAR_EVENT' ||
      proposal.type === 'DELETE_CALENDAR_EVENT' ||
      proposal.type === 'UPDATE_DAILY_PLAN'
    ) {
      window.dispatchEvent(
        new CustomEvent('planevo:calendar-events-changed', { detail })
      );
    }

    if (
      proposal.type === 'CREATE_TASK' ||
      proposal.type === 'UPDATE_TASK' ||
      proposal.type === 'RESCHEDULE_TASK' ||
      proposal.type === 'DELETE_TASK'
    ) {
      window.dispatchEvent(
        new CustomEvent('planevo:tasks-changed', { detail })
      );
    }
  }

  // Extracts Composio (Notion/Slack/Linear) tool calls from a message so we can
  // render inline status cards and source attribution, mirroring ChatGPT/Claude.
  function extractIntegrationToolCalls(message: any): Array<{
    key: string;
    toolName: string;
    status: IntegrationActionStatus;
    url: string | null;
    errorText: string | null;
  }> {
    const parts = message.parts || [];
    const isProToolName = (name: string) =>
      /^(NOTION|SLACK|LINEAR)_/i.test(name);

    const calls: Array<{
      key: string;
      toolName: string;
      status: IntegrationActionStatus;
      url: string | null;
      errorText: string | null;
    }> = [];

    parts.forEach((part: any, index: number) => {
      let toolName: string | null = null;
      if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
        const candidate = part.type.slice('tool-'.length);
        if (isProToolName(candidate)) toolName = candidate;
      }
      if (!toolName && part.type === 'tool-invocation') {
        const candidate = part.toolInvocation?.toolName;
        if (candidate && isProToolName(candidate)) toolName = candidate;
      }
      if (!toolName) return;

      const state = part.state ?? part.toolInvocation?.state;
      const output = part.output ?? part.result ?? part.toolInvocation?.result;
      const errorText = part.errorText ?? null;

      let status: IntegrationActionStatus = 'running';
      if (state === 'output-error' || errorText) status = 'error';
      else if (state === 'output-available' || output) {
        status = output && output.successful === false ? 'error' : 'success';
      }

      const url =
        output?.data?.url ??
        output?.url ??
        output?.data?.permalink ??
        null;

      calls.push({
        key: part.toolCallId ?? part.toolInvocation?.toolCallId ?? `${toolName}-${index}`,
        toolName,
        status,
        url: typeof url === 'string' ? url : null,
        errorText: status === 'error' ? output?.error ?? errorText ?? 'Action failed' : null,
      });
    });

    return calls;
  }

  const executeProposal = async (
    proposal: BrunoActionProposal
  ): Promise<{ ok: boolean; error?: string }> => {
    let alreadyProcessing = false;
    setExecutingActions(prev => {
      if (prev[proposal.id]) alreadyProcessing = true;
      return { ...prev, [proposal.id]: true };
    });
    
    if (alreadyProcessing) return { ok: false, error: 'already_processing' };

    setActionStatuses((prev) => ({ ...prev, [proposal.id]: "executing" }));

    try {
      const executeBody = {
        proposalId: proposal.id,
        type: proposal.type,
        title: proposal.title,
        description: proposal.description,
        payload: proposal.payload,
        userPrompt: lastUserMessageRef.current || undefined,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        conversationId: currentConversationId || undefined,
      };
      const response = await fetch("/api/bruno/actions/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(executeBody),
      });

      const result = await readBrunoExecuteActionResponse(response);

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Could not execute action");
      }

      setActionStatuses((prev) => ({ ...prev, [proposal.id]: "success" }));
      setActionErrors((prev) => ({ ...prev, [proposal.id]: null }));
      publishExecutedAction(proposal, result);
      return { ok: true };
    } catch (error: any) {
      const message = error.message ?? "Couldn't create task. Try again.";
      if (!message.includes('Google Calendar write permission')) {
        console.error("[Bruno] Failed to execute proposal", error);
      }
      setActionStatuses((prev) => ({ ...prev, [proposal.id]: "error" }));
      setActionErrors((prev) => ({
        ...prev,
        [proposal.id]: message,
      }));
      return { ok: false, error: message };
    } finally {
      setExecutingActions((prev) => ({ ...prev, [proposal.id]: false }));
    }
  };

  const handleConfirmProposal = async (proposal: BrunoActionProposal) => {
    await executeProposal(proposal);
  };

  const handleCancelProposal = (proposal: BrunoActionProposal) => {
    setActionStatuses((prev) => ({ ...prev, [proposal.id]: "cancelled" }));
  };

  const handleConfirmAll = async (proposals: BrunoActionProposal[]) => {
    if (isConfirmingAll) return;
    setIsConfirmingAll(true);
    try {
      for (const proposal of proposals) {
        const result = await executeProposal(proposal);
        if (
          !result.ok &&
          (result.error?.includes('Google Calendar write permission') ||
            result.error?.includes('Event not found') ||
            result.error?.includes('already executed'))
        ) {
          break;
        }
      }
    } finally {
      setIsConfirmingAll(false);
    }
  };
  const { currentContext, closeBruno } = useBruno();
  const isDock = variant === 'dock';
  const { isFree } = useSubscription();
  const supabase = createClient();
  const [input, setInput] = useState('');
  const [rateLimitInfo, setRateLimitInfo] = useState<BrunoRateLimitPayload | null>(null);
  const [isPaywallDismissed, setIsPaywallDismissed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const lastPrefillRef = useRef<string | null>(null);

  // Allow callers (e.g. Daily Plan "Share to work") to open Bruno with a
  // suggested prompt pre-filled in the composer.
  useEffect(() => {
    const prompt = currentContext?.payload?.prompt;
    if (typeof prompt === 'string' && prompt.length > 0 && lastPrefillRef.current !== prompt) {
      lastPrefillRef.current = prompt;
      setInput(prompt);
      inputRef.current?.focus();
    }
  }, [currentContext]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 20;
    setIsAtBottom(isBottom);
  }, []);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);
  
  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [chatToDelete, setChatToDelete] = useState<{id: string, title: string} | null>(null);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);
  const isDeletingConversationRef = useRef(false);
  const [isCommittingPlan, setIsCommittingPlan] = useState(false);
  const [isConfirmingAll, setIsConfirmingAll] = useState(false);

  const [mentionState, setMentionState] = useState<{ active: boolean, text: string }>({ active: false, text: '' });
  const [suggestions, setSuggestions] = useState<{id: string, title: string, type: 'task'|'event', subtitle?: string}[]>([]);
  const [suggestionSelectedIndex, setSuggestionSelectedIndex] = useState(0);

  useEffect(() => {
    async function fetchMentions() {
      if (!mentionState.active) {
        setSuggestions([]);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: tasks }, { data: events }] = await Promise.all([
        supabase.from('tasks').select('id, title, status').eq('user_id', user.id).neq('status', 'done').is('deleted_at', null).ilike('title', `%${mentionState.text}%`).limit(5),
        supabase.from('calendar_events').select('id, title, start_time').eq('user_id', user.id).gte('start_time', new Date().toISOString()).eq('is_deleted', false).ilike('title', `%${mentionState.text}%`).limit(5)
      ]);

      const formatted = [
        ...(tasks || []).map(t => ({ id: t.id, title: t.title, type: 'task' as const, subtitle: `Task • ${t.status}` })),
        ...(events || []).map(e => ({ id: e.id, title: e.title, type: 'event' as const, subtitle: `Event • ${new Date(e.start_time).toLocaleDateString()}` }))
      ];
      setSuggestions(formatted);
      setSuggestionSelectedIndex(0);
    }
    const timeout = setTimeout(fetchMentions, 300);
    return () => clearTimeout(timeout);
  }, [mentionState, supabase]);

  const fetchConversations = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('last_active', { ascending: false });

    if (data) setConversations(data);
  }, [supabase]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleRateLimitError = useCallback(
    (error: unknown) => {
      if (!isFree) return;
      const parsed = parseBrunoRateLimitError(error);
      if (parsed) {
        setRateLimitInfo(parsed);
        setIsPaywallDismissed(false);
      }
    },
    [isFree, setRateLimitInfo, setIsPaywallDismissed]
  );

  const handleRateLimitExpired = useCallback(() => {
    setRateLimitInfo(null);
    setIsPaywallDismissed(false);
  }, [setRateLimitInfo, setIsPaywallDismissed]);

  const handleChatError = useCallback(
    (chatError: unknown) => {
      handleRateLimitError(chatError);
      const message =
        chatError instanceof Error
          ? chatError.message
          : typeof chatError === 'string'
            ? chatError
            : 'Bruno could not finish that reply. Please try again.';
      if (!parseBrunoRateLimitError(chatError)) {
        toast.error(message);
      }
    },
    [handleRateLimitError]
  );

  const { messages, setMessages, sendMessage, status, stop, error, clearError } =
    useChat<BrunoUIMessage>({
    transport: new DefaultChatTransport({
      api: '/api/ai/chat',
    }),
    messages: initialMessage
      ? [
          {
            id: 'init',
            role: 'assistant',
            parts: [{ type: 'text', text: initialMessage }],
          } as BrunoUIMessage,
        ]
      : [],
    onError: handleChatError,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onFinish: async (event: any) => {
      try {
      const message = event.message || event;
      const textPart = message.parts?.find((p: { type: string; text?: string }) => p.type === 'text')?.text;

      const modeNoticePart = message.parts?.find(
        (p: { type: string }) => p.type === 'data-bruno-assistant-mode-notice'
      );
      if (
        modeNoticePart &&
        'data' in modeNoticePart &&
        modeNoticePart.data?.autoEscalated &&
        modeNoticePart.data?.message
      ) {
        toast.info(modeNoticePart.data.message);
      }
      
      // Assistant-turn persistence (with full parts) is server-side now, in
      // the chat stream's onFinish. Only conversation metadata stays here.
      if (currentConversationId && message.role === 'assistant') {
        await supabase.from('chat_conversations').update({ last_active: new Date().toISOString() }).eq('id', currentConversationId);
      }
      
      if (message.role === 'assistant') {
        const lastUserText = lastUserMessageRef.current;
        if (isTaskBreakdownIntent(lastUserText)) {
          const nativeProposals = extractProposalsFromMessage(message, lastUserMessageRef.current || undefined);
          if (nativeProposals.length === 0) {
            const textContent = textPart || '';
            const response = await fetch("/api/bruno/fallback/breakdown", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userPrompt: lastUserText,
                assistantText: textContent,
                pageContext: currentContext, // Assuming currentContext is accessible here
              }),
            });
            const responseText = await response.text();
            let result: { success?: boolean; proposals?: BrunoActionProposal[] } = {};
            if (responseText) {
              try {
                result = JSON.parse(responseText);
              } catch {
                // Empty or non-JSON body from server error — skip fallback proposals
              }
            }
            if (response.ok && result.success) {
              setFallbackProposalsByMessageId((prev) => ({
                ...prev,
                [message.id]: result.proposals,
              }));
            }
          }
        }
      }
      
      if (onFinish) onFinish();
      setIsCommittingPlan(false);
      } catch (finishError) {
        console.error('[BrunoChatSidebar] onFinish failed:', finishError);
        setIsCommittingPlan(false);
      }
    }
  });

  useEffect(() => {
    if (error) {
      handleChatError(error);
    }
  }, [error, handleChatError]);

  const isRateLimited = isFree && isRateLimitActive(rateLimitInfo);
  // Render-safe last user text (refs must not be read during render).
  const lastUserTextForRender = (() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const candidate = messages[index];
      if (candidate.role !== 'user') continue;
      const text = candidate.parts?.find((part) => part.type === 'text');
      if (text && 'text' in text && typeof text.text === 'string') return text.text;
    }
    return undefined;
  })();
  const loadConversation = async (id: string) => {
    setCurrentConversationId(id);
    setShowHistory(false);

    const { data } = await supabase
      .from('bruno_messages')
      .select('id, content, message_type, parts, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (data) {
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      setMessages(data.map((m: any) => ({
        id: m.id,
        role: m.message_type === 'user' ? 'user' : 'assistant',
        // Rehydrate full parts (tool calls, proposals, data cards) when the
        // server stored them; legacy rows fall back to text-only.
        parts:
          m.message_type !== 'user' && Array.isArray(m.parts) && m.parts.length > 0
            ? m.parts
            : [{ type: 'text', text: m.content }],
        createdAt: new Date(m.created_at)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)));
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages(
      initialMessage
        ? [
            {
              id: 'init',
              role: 'assistant',
              parts: [{ type: 'text', text: initialMessage }],
            } as BrunoUIMessage,
          ]
        : [],
    );
    setShowHistory(false);
  };

  const promptDeleteConversation = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    setChatToDelete({ id, title });
  };

  const confirmDeleteConversation = async () => {
    if (!chatToDelete || isDeletingConversationRef.current) return;
    isDeletingConversationRef.current = true;
    setIsDeletingConversation(true);
    const { id } = chatToDelete;
    try {
      const response = await fetch(`/api/ai/conversations/${id}`, { method: 'DELETE' });
      // 404 means already deleted — treat as success for idempotent UX (e.g. double-click race)
      if (response.ok || response.status === 404) {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (currentConversationId === id) {
          startNewConversation();
        }
      } else {
        console.error('Failed to delete conversation:', await response.text());
        toast.error('Planevo could not complete that action. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      toast.error('Planevo could not complete that action. Please try again.');
    } finally {
      isDeletingConversationRef.current = false;
      setIsDeletingConversation(false);
      setChatToDelete(null);
    }
  };

  const isChatGenerating = status === 'streaming' || status === 'submitted';
  const isProcessing = isExternalProcessing || isChatGenerating;
  const activeClarificationCard = useMemo(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'assistant') return null;
    return extractClarificationCardsFromMessage(lastMessage)[0] ?? null;
  }, [messages]);

  const { isBrunoWorking, isBrunoFinalizing } = useBrunoChatProgressState({
    messages,
    status,
    isExternallyProcessing: isExternalProcessing,
  });

  const { prefix, verbText, verb, headerLabel } = useBrunoThinkingLabel({
    isBrunoWorking,
    isBrunoFinalizing,
  });

  useEffect(() => {
    if (!scrollRef.current) return;
    
    const lastMessage = messages[messages.length - 1];
    const isUserMessage = lastMessage?.role === 'user';
    
    if (isAtBottom || isUserMessage || showHistory) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showHistory, isAtBottom]);

  // Update messages when initialMessage changes (context switch)
  useEffect(() => {
    if (initialMessage && !currentConversationId) {
      setMessages([{ 
        id: 'init',
        role: 'assistant', 
        parts: [{ type: 'text', text: initialMessage }] 
      } as BrunoUIMessage]);
    }
  }, [initialMessage, assignmentId, setMessages, currentConversationId]);

  const submitPrompt = async (
    prompt: string,
    event?: React.FormEvent,
    options: { clarificationResponse?: BrunoClarificationResponse } = {}
  ) => {
    event?.preventDefault();
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt || isProcessing || isRateLimited) return;

    if (
      prompt === input &&
      mentionState.active &&
      suggestions.length > 0
    ) {
      // Don't submit if we're actively picking a mention
      return;
    }

    const userMessage = trimmedPrompt;
    lastUserMessageRef.current = userMessage;
    setInput('');
    setMentionState({ active: false, text: '' });
    let convId = currentConversationId;

    if (!convId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: newConv } = await supabase
          .from('chat_conversations')
          .insert({ user_id: user.id, title: userMessage.slice(0, 30) + '...' })
          .select()
          .single();
        if (newConv) {
          convId = newConv.id;
          setCurrentConversationId(convId);
          fetchConversations();
          
          // Background AI Title Generation
          fetch('/api/ai/generate-title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMessage, conversationId: convId })
          })
          .then(res => res.json())
          .then(data => {
            if (data.title) fetchConversations();
          })
          .catch(err => {
            console.error('Failed to generate title', err);
            toast.error('Planevo could not complete that action. Please try again.');
          });
        }
      }
    }

    if (editingMessageId && convId) {
      const editIndex = messages.findIndex(m => m.id === editingMessageId);
      if (editIndex !== -1) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const editedMsg = messages[editIndex] as any;
        let timestamp = editedMsg.createdAt
           ? (editedMsg.createdAt instanceof Date ? editedMsg.createdAt.toISOString() : new Date(editedMsg.createdAt).toISOString())
           : new Date().toISOString();

        // For messages loaded from the DB, anchor the cutoff to the server
        // row's created_at — the client clock can drift and delete too much
        // or too little.
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(editingMessageId)) {
          const { data: editedRow } = await supabase
            .from('bruno_messages')
            .select('created_at')
            .eq('id', editingMessageId)
            .eq('conversation_id', convId)
            .maybeSingle();
          if (editedRow?.created_at) timestamp = editedRow.created_at;
        }

        await supabase.from('bruno_messages').delete()
          .eq('conversation_id', convId)
          .gte('created_at', timestamp);
          
        setMessages(messages.slice(0, editIndex));
      }
      setEditingMessageId(null);
    }

    // User-turn persistence is server-side now (chat route persists it with
    // dedup); writing it here too would create duplicate rows.

    sendMessage({ text: userMessage }, {
      body: createBrunoChatRequestBody(
        convId,
        currentContext,
        assistantMode,
        options.clarificationResponse
      )
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    void submitPrompt(input, event);
  };

  const showStarterActions =
    isPlanningMode &&
    shouldShowBrunoStarterActions({
      messages,
      currentConversationId,
      input,
      showHistory,
      isProcessing,
      isRateLimited,
    });

  const composerPlaceholder = editingMessageId
    ? 'Edit your message...'
    : isRateLimited
      ? 'Your free Bruno limit is reached for now…'
      : isProcessing
        ? 'Bruno is working...'
        : isPlanningMode
          ? BRUNO_PLANNING_GREETING
          : BRUNO_GREETING;

  const showEmptyGreeting =
    messages.length === 0 && !showHistory && !isBrunoWorking && !isProcessing;

  return (
    <>
      <div className="relative flex h-full min-h-0 w-full flex-col" data-bruno-chat>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--color-settings-bg)]">
          
          {/* Header */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-[var(--color-settings-border)] bg-[var(--color-settings-card)]/92 px-4 py-3 backdrop-blur-xl md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <BrunoFaceMark size={36} />
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2.5">
                  <h3 className="truncate font-sans text-base font-bold text-[var(--color-settings-text)]">
                    Bruno
                  </h3>
                  <BrunoIntegrationChips />
                </div>
                {(isBrunoWorking || isProcessing) && (
                  <p className="mt-0.5 truncate text-xs text-[var(--color-settings-text-muted)]">
                    {isBrunoWorking
                      ? headerLabel
                      : 'Working on your request'}
                  </p>
                )}
              </div>
            </div>

            <div className="hidden min-w-0 items-center justify-center md:flex">
              <BrunoContextBanner />
            </div>

            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className={`rounded-xl p-2.5 transition-colors ${showHistory ? 'bg-[var(--color-settings-brand)] text-white' : 'text-[var(--color-settings-text-muted)] hover:bg-[var(--color-settings-card-hover)] hover:text-[var(--color-settings-text)]'}`}
                title="Past chats"
                aria-label="Past chats"
              >
                <ClockCounterClockwise weight="bold" className="h-5 w-5" />
              </button>
              {onToggleFullScreen && (
                <button
                  type="button"
                  onClick={onToggleFullScreen}
                  className="rounded-xl p-2.5 text-[var(--color-settings-text-muted)] transition-colors hover:bg-[var(--color-settings-card-hover)] hover:text-[var(--color-settings-text)]"
                  title={isFullScreen ? 'Exit full screen' : 'Full screen'}
                  aria-label={isFullScreen ? 'Exit full screen' : 'Full screen'}
                >
                  {isFullScreen ? (
                    <ArrowsInSimple weight="bold" className="h-5 w-5" />
                  ) : (
                    <ArrowsOutSimple weight="bold" className="h-5 w-5" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={isDock ? onMinimize : closeBruno}
                className="rounded-xl p-2.5 text-[var(--color-settings-text-muted)] transition-colors hover:bg-[var(--color-settings-card-hover)] hover:text-[var(--color-settings-text)]"
                title={isDock ? 'Minimize Bruno' : 'Close Bruno'}
                aria-label={isDock ? 'Minimize Bruno' : 'Close Bruno'}
              >
                <X weight="bold" className="h-5 w-5" />
              </button>
            </div>

            <div className="col-span-2 md:hidden">
              <BrunoContextBanner />
            </div>
          </div>

          {/* Context Limit Warning */}
          {messages.length > 20 && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-start sm:items-center justify-center gap-2">
              <Warning weight="fill" className="text-amber-500 w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
              <p className="text-amber-500/90 text-xs sm:text-sm font-medium">
                This conversation is getting long. To prevent Bruno from forgetting details, consider wrapping up or starting a new chat.
              </p>
            </div>
          )}

          {/* Message History */}
          <div className="relative flex-1 flex flex-col overflow-hidden">
            {/* History Modal / Overlay */}
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute inset-0 z-50 bg-[var(--color-settings-bg)] flex flex-col"
                >
                  <div className={`flex items-center justify-between border-b border-[var(--color-settings-border)] ${isFullScreen ? "p-6" : "p-4"}`}>
                    <h3 className={`font-sans font-bold text-[var(--color-settings-text)] ${isFullScreen ? "text-lg" : "text-base"}`}>Recent Chats</h3>
                    <button onClick={startNewConversation} className="bg-[var(--color-settings-card-hover)] text-[var(--color-settings-text)] px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-[var(--color-settings-border)]">
                      <Plus weight="bold" /> New Chat
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {conversations.length === 0 ? (
                      <div className="text-center py-10 opacity-50 text-[var(--color-ink-soft)]">
                        No Recent Chats
                      </div>
                    ) : (
                      conversations.map(c => (
                        <div key={c.id} className="flex items-stretch gap-2">
                          <button 
                            onClick={() => loadConversation(c.id)}
                            className="flex-1 p-4 text-left bg-[var(--color-settings-card)] hover:bg-[var(--color-settings-card-hover)] border border-[var(--color-settings-border)] rounded-xl transition-colors min-w-0"
                          >
                            <p className="text-sm font-bold text-[var(--color-settings-text)] truncate">{c.title}</p>
                            <p className="text-xs font-serif italic text-[var(--color-settings-text-muted)] mt-1">
                              {new Date(c.last_active).toLocaleDateString()}
                            </p>
                          </button>
                          <button
                            onClick={(e) => promptDeleteConversation(e, c.id, c.title)}
                            className="p-4 flex items-center justify-center text-[var(--color-settings-text-muted)] hover:text-red-500 bg-[var(--color-settings-card)] hover:bg-red-500/10 border border-[var(--color-settings-border)] hover:border-red-500/30 rounded-xl transition-all"
                            title="Delete Chat"
                          >
                            <Trash weight="bold" className="w-5 h-5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className={`p-4 border-t border-[var(--color-settings-border)] ${isFullScreen ? "px-6" : "px-4"}`}>
                    <button 
                      onClick={() => setShowHistory(false)}
                      className="w-full py-2.5 text-center text-sm font-medium text-[var(--color-settings-text-muted)] hover:text-[var(--color-settings-text)] transition-colors"
                    >
                    Close
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              onScroll={handleScroll}
              className="scrollbar-hide relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[var(--color-settings-bg)] px-4 py-6 md:px-8 md:py-8"
            >
              {showEmptyGreeting && (
                <div className="flex min-h-[min(40vh,320px)] flex-col items-center justify-center gap-4 text-center">
                  <BrunoFaceMark size={48} />
                  <p className="font-serif text-xl text-[var(--color-settings-text)] md:text-2xl">
                    {isPlanningMode ? BRUNO_PLANNING_GREETING : BRUNO_GREETING}
                  </p>
                </div>
              )}

              <div className={cn(
                'relative z-10 mx-auto flex w-full flex-col gap-6',
                isFullScreen ? 'max-w-[52rem]' : 'max-w-[48rem]',
                showEmptyGreeting && 'hidden',
              )}>
                <AnimatePresence initial={false}>
                  {messages.map((message, i) => {
                    const textPart = message.parts?.find(p => p.type === 'text')?.text || '';
                    const toolParts = message.parts?.filter(p => p.type === 'tool-invocation') || [];
                    const entitlementParts = message.parts?.filter(
                      (part) =>
                        part.type === 'data-bruno-upgrade-card' ||
                        part.type === 'data-bruno-pro-warning' ||
                        part.type === 'data-bruno-pro-cap'
                    ) || [];
                    const clarificationCards = extractClarificationCardsFromMessage(message);
                    const truncatedPart = message.parts?.find(
                      (part) => part.type === 'data-bruno-truncated'
                    );
                    const truncatedNotice =
                      truncatedPart?.type === 'data-bruno-truncated'
                        ? truncatedPart.data
                        : null;
                    const streamErrorPart = message.parts?.find(
                      (part) => part.type === 'data-bruno-stream-error'
                    );
                    const streamErrorNotice =
                      streamErrorPart?.type === 'data-bruno-stream-error'
                        ? streamErrorPart.data
                        : null;
                    const isEditing = editingMessageId === message.id;

                    // Check if any tool invocation is a propose_plan_draft
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const planDraftInvocation = toolParts.find((t: any) =>
                      t.toolInvocation?.toolName === 'propose_plan_draft'
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ) as any;

                    const planDraftArgs = planDraftInvocation?.toolInvocation?.args;
                    const isPlanDraft = !!planDraftArgs?.plan_title;
                    
                    const nativeProposals = extractProposalsFromMessage(message, lastUserTextForRender);
                    const fallbackProposals = fallbackProposalsByMessageId[message.id] ?? [];
                    const proposals = nativeProposals.length > 0 ? nativeProposals : fallbackProposals;
                    const hasProposals = proposals.length > 0;
                    const integrationCalls = extractIntegrationToolCalls(message);
                    const displayText =
                      hasProposals &&
                      textPart.length < 50 &&
                      !/\bprepared\b/i.test(textPart) &&
                      !/\bdidn't find\b/i.test(textPart)
                        ? "I've drafted a plan based on your request. Confirm the tasks you want me to add."
                        : textPart;

                    const hasVisibleAssistantContent =
                      Boolean(displayText) ||
                      hasProposals ||
                      integrationCalls.length > 0 ||
                      isPlanDraft ||
                      entitlementParts.length > 0 ||
                      clarificationCards.length > 0 ||
                      Boolean(truncatedNotice) ||
                      Boolean(streamErrorNotice);

                    const isLastMessage = i === messages.length - 1;
                    const showEmptyReplyFallback =
                      message.role === 'assistant' &&
                      !hasVisibleAssistantContent &&
                      isLastMessage &&
                      !isBrunoWorking;

                    if (message.role === 'assistant' && !hasVisibleAssistantContent && !showEmptyReplyFallback) {
                      return null;
                    }
                    
                    return (
                      <motion.div
                        key={message.id || i}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                        className={`relative z-10 flex gap-2 ${
                          message.role === 'user'
                            ? 'items-end justify-end group'
                            : 'flex-col items-start justify-start'
                        }`}
                      >
                        {message.role === 'assistant' &&
                          entitlementParts.map((part, partIndex) => (
                            <BrunoEntitlementNotice
                              key={`${part.type}-${partIndex}`}
                              notice={part.data}
                            />
                          ))}
                        {/* If this is a plan draft, render the interactive card */}
                        {isPlanDraft ? (
                          <div className="flex w-full max-w-[52rem] flex-col gap-3">
                            <PlanDraftCard
                              planTitle={planDraftArgs.plan_title}
                              planObjective={planDraftArgs.plan_objective}
                              items={planDraftArgs.items as PlanDraftItemData[] || []}
                              isCommitting={isCommittingPlan}
                              hasGoogleCalendar={false}
                              onApprove={(options) => {
                                setIsCommittingPlan(true);
                                const commitType = (options.createTasks && options.blockCalendar) ? 'both' 
                                  : options.createTasks ? 'tasks_only' 
                                  : 'calendar_only';
                                
                                const approvalMessage = `Looks good! Approve the plan and execute as: ${commitType}${options.syncToGoogle ? ' (sync to Google)' : ''}.`;
                                
                                sendMessage({ text: approvalMessage }, {
                                  body: createBrunoChatRequestBody(
                                    currentConversationId,
                                    currentContext,
                                    assistantMode
                                  )
                                });
                              }}
                              onRequestEdit={(feedback) => {
                                setInput(feedback);
                              }}
                            />
                            {(textPart || hasProposals) && (
                              <div className="w-full">
                                {textPart && (
                                  <div className="w-full rounded-2xl border border-[var(--color-settings-border)] bg-[var(--color-settings-card)]/50 px-4 py-3 text-[15px] leading-7 text-[var(--color-settings-text)] md:px-5">
                                    <div className="bruno-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={brunoMarkdownComponents}>{textPart}</ReactMarkdown></div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          message.role === 'user' ? (
                            <div className="relative ml-auto">
                              {!isProcessing && !isEditing && (
                                <button 
                                   onClick={() => {
                                       setInput(textPart);
                                       setEditingMessageId(message.id);
                                   }}
                                   className="absolute top-1/2 -translate-y-1/2 right-[100%] mr-2 p-1.5 rounded-full text-[var(--color-settings-text-muted)] hover:text-[var(--color-settings-text)] hover:bg-[var(--color-settings-card-hover)] transition-all opacity-0 group-hover:opacity-100"
                                   title="Edit message"
                                >
                                   <PencilSimple size={14} />
                                </button>
                              )}
                              <div className={`max-w-[min(82vw,34rem)] rounded-2xl border border-[var(--color-settings-brand)]/20 bg-[var(--color-settings-brand)]/18 px-4 py-2.5 text-[15px] leading-6 text-[var(--color-settings-text)] ${isEditing ? 'opacity-50' : ''}`}>
                                <p>{textPart}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="group relative mr-auto max-w-[min(92%,48rem)]">
                              <div className="rounded-2xl border border-[var(--color-settings-border)]/60 bg-[var(--color-settings-card)]/30 px-4 py-3 text-[15px] leading-7 text-[var(--color-settings-text)] md:px-5">
                                <div className="w-full">
                                <div className="bruno-markdown max-w-none text-[15px] text-[var(--color-settings-text)]">
                                  {integrationCalls.map((call) => (
                                    <BrunoIntegrationActionCard
                                      key={call.key}
                                      toolName={call.toolName}
                                      status={call.status}
                                      url={call.url}
                                      errorText={call.errorText}
                                    />
                                  ))}
                                  {displayText ? (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={brunoMarkdownComponents}>{displayText}</ReactMarkdown>
                                  ) : showEmptyReplyFallback ? (
                                    <p className="text-[var(--color-settings-text-muted)]">
                                      Bruno finished but didn&apos;t return a visible reply. Try sending your request again or be more specific.
                                    </p>
                                  ) : null}
                                  {streamErrorNotice ? (
                                    <div className="mt-3 rounded-lg border border-[var(--color-rose)]/25 bg-[var(--color-rose)]/10 px-3 py-2 text-sm text-[var(--color-rose)]">
                                      {streamErrorNotice.message}
                                    </div>
                                  ) : null}
                                </div>
                                {hasProposals && (
                                  <div className="mt-3">
                                    <BrunoProposalGroup
                                      proposals={proposals}
                                      actionStatuses={actionStatuses}
                                      actionErrors={actionErrors}
                                      onConfirm={handleConfirmProposal}
                                      onCancel={handleCancelProposal}
                                      onConfirmAll={handleConfirmAll}
                                      isConfirmingAll={isConfirmingAll}
                                    />
                                  </div>
                                )}
                                {clarificationCards.length === 0 && (
                                  <BrunoNoteActions
                                    content={truncatedNotice?.assistantText || displayText}
                                    conversationId={currentConversationId}
                                    truncated={truncatedNotice}
                                    onContinue={() => {
                                      sendMessage(
                                        { text: 'continue' },
                                        {
                                          body: createBrunoChatRequestBody(
                                            currentConversationId,
                                            currentContext,
                                            assistantMode
                                          ),
                                        }
                                      );
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                            {!isProcessing && displayText && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(displayText);
                                  toast.success('Copied to clipboard');
                                }}
                                className="absolute top-2 left-[100%] ml-2 p-1.5 rounded-full text-[var(--color-settings-text-muted)] hover:text-[var(--color-settings-text)] hover:bg-[var(--color-settings-card-hover)] transition-all opacity-0 group-hover:opacity-100"
                                title="Copy message"
                              >
                                <Copy size={16} />
                              </button>
                            )}
                          </div>
                        )
                      )}
                      </motion.div>
                    );
                  })}
                  {isBrunoWorking && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                      className="relative z-10"
                    >
                      <BrunoThinkingIndicator
                        prefix={prefix}
                        verbText={verbText}
                        verb={verb}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Floating Scroll to Bottom Button */}
              <button
                aria-label="Scroll to bottom"
                className={`absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center justify-center rounded-full border border-[var(--color-settings-border)] bg-[var(--color-settings-card)]/90 w-8 h-8 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-lg transition-all duration-300 ${
                  isAtBottom
                    ? "pointer-events-none scale-90 opacity-0 translate-y-2"
                    : "pointer-events-auto scale-100 opacity-100 translate-y-0"
                }`}
                onClick={() => {
                  if (scrollRef.current) {
                    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
                  }
                }}
              >
                <CaretDown weight="bold" className="w-4 h-4 text-[var(--color-settings-text-muted)]" />
              </button>

              {rateLimitInfo && isRateLimited ? (
                <BrunoChatLimitPaywall
                  rateLimit={rateLimitInfo}
                  isDismissed={isPaywallDismissed}
                  onDismiss={() => {
                    setIsPaywallDismissed(true);
                    clearError();
                  }}
                  onExpired={handleRateLimitExpired}
                />
              ) : null}
            </div>
          </div>

          <form 
            onSubmit={handleSubmit} 
            className="relative z-20 bg-[var(--color-settings-bg)] px-4 py-4 md:px-8 md:py-5"
          >
            <div className={cn(
              'relative mx-auto w-full',
              isFullScreen ? 'max-w-[52rem]' : 'max-w-[48rem]',
            )}>
              {/* Mentions Dropdown */}
              <AnimatePresence>
                {mentionState.active && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full left-0 right-0 mb-2 bg-[var(--color-settings-card)] border border-[var(--color-settings-border)] rounded-xl shadow-2xl overflow-hidden z-[110]"
                  >
                    {suggestions.map((s, idx) => (
                      <button
                        type="button"
                        key={`${s.type}-${s.id}`}
                        onMouseEnter={() => setSuggestionSelectedIndex(idx)}
                        onClick={() => {
                          const words = input.split(' ');
                          words.pop();
                          const mentionLabel = `"${s.title}"`;
                          setInput(words.length > 0 ? `${words.join(' ')} ${mentionLabel} ` : `${mentionLabel} `);
                          setMentionState({ active: false, text: '' });
                          setSuggestions([]);
                        }}
                        className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors ${idx === suggestionSelectedIndex ? 'bg-[var(--color-settings-card-hover)]' : 'hover:bg-[var(--color-settings-card-hover)]'}`}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-[13px] font-bold text-[var(--color-settings-text)] truncate">{s.title}</span>
                          <span className="text-[11px] text-[var(--color-settings-text-muted)]">{s.subtitle}</span>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative">
                <div className="mb-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePlanningMode}
                    title={
                      isPlanningMode
                        ? 'Planning mode on — click for general chat'
                        : 'Switch to planning mode'
                    }
                    aria-pressed={isPlanningMode}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                      isPlanningMode
                        ? 'border-[var(--color-settings-brand)] bg-[var(--color-settings-brand)]/15 text-[var(--color-settings-text)]'
                        : 'border-[var(--color-settings-border)] bg-[var(--color-settings-card)]/50 text-[var(--color-settings-text-muted)] hover:text-[var(--color-settings-text)]'
                    )}
                  >
                    <CalendarBlank
                      className={isFullScreen ? 'h-4 w-4' : 'h-3.5 w-3.5'}
                      weight={isPlanningMode ? 'fill' : 'regular'}
                    />
                    Planning
                  </button>
                </div>
                <AnimatePresence>
                  {activeClarificationCard && !showHistory && (
                    <motion.div
                      key={activeClarificationCard.id}
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                      className="mb-0"
                    >
                      <BrunoClarificationCard
                        card={activeClarificationCard}
                        variant="composer"
                        disabled={isProcessing}
                        onSubmit={(response) => {
                          void submitPrompt(
                            formatClarificationResponseForChat(response),
                            undefined,
                            { clarificationResponse: response }
                          );
                        }}
                      />
                      <div className="pointer-events-none mx-auto -mt-px h-3 w-9 rounded-b-2xl border-x border-b border-[var(--color-settings-border)] bg-[var(--color-settings-card)]/92 shadow-[0_10px_18px_-18px_rgba(0,0,0,0.45)]" />
                    </motion.div>
                  )}
                </AnimatePresence>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInput(val);
                    const lastWord = val.split(' ').pop();
                    if (lastWord?.startsWith('@') || lastWord?.startsWith('/')) {
                      setMentionState({ active: true, text: lastWord.slice(1).toLowerCase() });
                    } else {
                      setMentionState({ active: false, text: '' });
                    }
                  }}
                  disabled={isExternalProcessing || isRateLimited}
                  placeholder={composerPlaceholder}
                  onKeyDown={(e) => {
                    if (mentionState.active && suggestions.length > 0) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setSuggestionSelectedIndex((prev) => (prev + 1) % suggestions.length);
                        return;
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setSuggestionSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
                        return;
                      }
                      if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();
                        const s = suggestions[suggestionSelectedIndex];
                        if (s) {
                          const words = input.split(' ');
                          words.pop();
                          const mentionLabel = `"${s.title}"`;
                          setInput(words.length > 0 ? `${words.join(' ')} ${mentionLabel} ` : `${mentionLabel} `);
                          setMentionState({ active: false, text: '' });
                          setSuggestions([]);
                        }
                        return;
                      }
                      if (e.key === 'Escape') {
                        setMentionState({ active: false, text: '' });
                        return;
                      }
                    }

                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void submitPrompt(input);
                    }
                  }}
                  rows={Math.min(5, input.split('\n').length || 1)}
                  className={`w-full resize-none rounded-3xl border border-[var(--color-settings-border)] bg-[var(--color-settings-card)]/50 text-[var(--color-settings-text)] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] placeholder:text-[var(--color-settings-text-muted)] transition-[border-color,box-shadow] focus:border-[var(--color-settings-border)] focus:outline-none focus:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.1)] ${
                    isFullScreen ? "min-h-[72px] py-4 pl-5 pr-14 text-[16px]" : "min-h-[64px] py-4 pl-5 pr-14 text-[15px]"
                  } max-h-[250px] leading-relaxed`}
                />
                {isChatGenerating ? (
                  <button
                    type="button"
                    onClick={() => stop()}
                    className="absolute right-3 bottom-3 rounded-lg bg-red-500/80 p-2.5 text-white transition-all hover:bg-red-500"
                    title="Stop generation"
                  >
                    <Stop weight="fill" className={isFullScreen ? "w-5 h-5" : "w-4 h-4"} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim() || isProcessing || isRateLimited}
                    className="absolute right-3 bottom-3 rounded-lg bg-[var(--color-settings-brand)] p-2.5 text-white transition-all hover:opacity-90 disabled:bg-[var(--color-settings-card-hover)] disabled:text-[var(--color-settings-text-muted)] disabled:opacity-50"
                    title="Send message"
                  >
                    <PaperPlaneTilt className={isFullScreen ? "w-5 h-5" : "w-4 h-4"} />
                  </button>
                )}
              </div>

              {showStarterActions && (
                <BrunoSuggestedActions
                  onSelectAction={(prompt) => {
                    void submitPrompt(prompt);
                  }}
                />
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {chatToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--color-settings-card)] border border-[var(--color-settings-border)] rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h4 className="text-lg font-bold text-[var(--color-settings-text)] mb-2">Delete Chat?</h4>
              <p className="text-sm text-[var(--color-settings-text-muted)] mb-6 leading-relaxed">
                Are you sure you want to delete the chat <span className="font-bold text-[var(--color-settings-text)]">&quot;{chatToDelete.title}&quot;</span>? This will be gone forever and recovery is NOT an option.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setChatToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl font-medium text-[var(--color-settings-text-muted)] hover:text-[var(--color-settings-text)] hover:bg-[var(--color-settings-card-hover)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteConversation}
                  disabled={isDeletingConversation}
                  className="flex-1 py-2.5 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50"
                >
                  {isDeletingConversation ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
