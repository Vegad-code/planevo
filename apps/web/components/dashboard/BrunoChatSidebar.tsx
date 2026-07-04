'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PaperPlaneTilt, ArrowsInSimple, ArrowsOutSimple, ClockCounterClockwise, Stop, Plus, Trash, Warning, X, CaretDown, CalendarBlank } from '@phosphor-icons/react';
import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from 'ai';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useBruno } from '@/components/bruno/BrunoProvider';
import { BrunoContextBanner } from '@/components/bruno/BrunoContextBanner';
import { BrunoSuggestedActions } from '@/components/bruno/BrunoSuggestedActions';
import { createBrunoChatRequestBody } from '@/lib/bruno/chat-request';
import { shouldShowBrunoStarterActions } from '@/lib/bruno/starter-actions';
import { BrunoFaceMark } from '@/components/bruno/BrunoFaceMark';
import { cn } from '@/lib/utils';

import { BrunoIntegrationChips } from '../bruno/BrunoIntegrationChips';
import type { BrunoDataParts } from '@/lib/bruno/types';
import { BrunoMessageList } from '@/components/bruno/BrunoMessageList';
import type { BrunoMessageRating } from '@/components/bruno/BrunoMessageFooter';
import { extractExecutedActionsFromMessage } from '@/lib/bruno/proposalExtraction';
import {
  dispatchBrunoActionRefreshEvents,
  useBrunoProposalActions,
} from '@/hooks/useBrunoProposalActions';
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
import {
  branchRowsToChatState,
  branchRowsToChatStateForVariant,
  type BranchMessageRow,
  type BrunoVariantInfo,
  type HydratedBrunoMessage,
} from '@/lib/bruno/messageBranches';
import {
  persistVariantSelection,
  scheduleVariantSkeleton,
} from '@/lib/bruno/persistVariantSelection';

const BRUNO_BRANCH_MESSAGE_SELECT =
  'id, content, message_type, parts, created_at, turn_key, variant_index, is_active_variant, parent_user_message_id, superseded_at';

function hydratedToUiMessage(
  message: HydratedBrunoMessage & { createdAt?: Date | string }
): BrunoUIMessage {
  return {
    id: message.id,
    role: message.role,
    parts: message.parts,
    createdAt:
      message.createdAt instanceof Date
        ? message.createdAt
        : new Date(message.createdAt ?? Date.now()),
  } as BrunoUIMessage;
}

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
  const lastUserMessageRef = useRef<string>("");

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
  const currentConversationIdRef = useRef<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [feedbackByMessageId, setFeedbackByMessageId] = useState<
    Record<string, BrunoMessageRating>
  >({});
  const [variantInfoByMessageId, setVariantInfoByMessageId] = useState<
    Record<string, BrunoVariantInfo>
  >({});
  const [pendingVariantTurnKey, setPendingVariantTurnKey] = useState<
    string | null
  >(null);
  const branchRowsRef = useRef<BranchMessageRow[]>([]);
  const [chatToDelete, setChatToDelete] = useState<{id: string, title: string} | null>(null);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);
  const isDeletingConversationRef = useRef(false);

  const [mentionState, setMentionState] = useState<{ active: boolean, text: string }>({ active: false, text: '' });
  const [suggestions, setSuggestions] = useState<{id: string, title: string, type: 'task'|'event', subtitle?: string}[]>([]);
  const [suggestionSelectedIndex, setSuggestionSelectedIndex] = useState(0);

  const messagesRef = useRef<BrunoUIMessage[]>([]);

  useEffect(() => {
    currentConversationIdRef.current = currentConversationId;
  }, [currentConversationId]);

  const syncMessagesFromConversationRef = useRef<
    ((conversationId: string) => Promise<void>) | null
  >(null);

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

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    error,
    clearError,
    addToolApprovalResponse,
  } = useChat<BrunoUIMessage>({
    transport: new DefaultChatTransport({
      api: '/api/ai/chat',
    }),
    generateId: () => crypto.randomUUID(),
    messages: initialMessage
      ? [
          {
            id: 'init',
            role: 'assistant',
            parts: [{ type: 'text', text: initialMessage }],
          } as BrunoUIMessage,
        ]
      : [],
    // Resubmit automatically once every pending approval card has an answer —
    // the server validates the {approvalId, approved} pairs and resumes the
    // agent loop.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onError: handleChatError,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onFinish: async (event: any) => {
      try {
      const message = event.message || event;

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

      // Actions executed inside the agent loop → same refresh events the
      // legacy execute path dispatches.
      if (message.role === 'assistant') {
        for (const action of extractExecutedActionsFromMessage(message)) {
          dispatchBrunoActionRefreshEvents(
            action.actionType,
            action.proposalId,
            action.data
          );
        }
      }

      if (onFinish) onFinish();

      const convId = currentConversationIdRef.current;
      if (convId && message.role === 'assistant') {
        // Allow server-side assistant persistence to finish before resyncing.
        await new Promise((resolve) => setTimeout(resolve, 400));
        await syncMessagesFromConversationRef.current?.(convId);
      }
      } catch (finishError) {
        console.error('[BrunoChatSidebar] onFinish failed:', finishError);
      }
    }
  });

  const syncMessagesFromConversation = useCallback(
    async (conversationId: string) => {
      const { data: branchRows } = await supabase
        .from('bruno_messages')
        .select(BRUNO_BRANCH_MESSAGE_SELECT)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (!branchRows) return;

      branchRowsRef.current = branchRows as BranchMessageRow[];
      const { messages: transcript, variantInfoByMessageId: variantInfo } =
        branchRowsToChatState(branchRowsRef.current);
      setMessages(transcript.map(hydratedToUiMessage));
      setVariantInfoByMessageId(variantInfo);
    },
    [setMessages, supabase]
  );

  useEffect(() => {
    syncMessagesFromConversationRef.current = syncMessagesFromConversation;
  }, [syncMessagesFromConversation]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const sendUserTurn = useCallback(
    (
      text: string,
      options: {
        messageId?: string;
        body: ReturnType<typeof createBrunoChatRequestBody>;
      }
    ) => {
      const { messageId, body } = options;
      if (
        messageId &&
        !messagesRef.current.some((message) => message.id === messageId)
      ) {
        toast.error(
          'That message version changed. Pick the version you want, then try again.'
        );
        return;
      }

      try {
        sendMessage(
          messageId ? { text, messageId } : { text },
          { body }
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('not found')
        ) {
          toast.error(
            'That message version changed. Pick the version you want, then try again.'
          );
          return;
        }
        throw error;
      }
    },
    [sendMessage]
  );

  const {
    actionStatuses,
    actionErrors,
    isConfirmingAll,
    handleConfirmProposal,
    handleCancelProposal,
    handleConfirmAll,
  } = useBrunoProposalActions({
    addToolApprovalResponse,
    getRequestBody: () =>
      createBrunoChatRequestBody(
        currentConversationId,
        currentContext,
        assistantMode
      ),
    getConversationId: () => currentConversationId,
    getUserPrompt: () => lastUserMessageRef.current || undefined,
  });

  useEffect(() => {
    if (error) {
      handleChatError(error);
    }
  }, [error, handleChatError]);

  const isRateLimited = isFree && isRateLimitActive(rateLimitInfo);
  const loadConversation = async (id: string) => {
    setCurrentConversationId(id);
    setShowHistory(false);
    setFeedbackByMessageId({});
    setVariantInfoByMessageId({});

    const [{ data }, { data: feedbackRows }] = await Promise.all([
      supabase
        .from('bruno_messages')
        .select(BRUNO_BRANCH_MESSAGE_SELECT)
        .eq('conversation_id', id)
        .order('created_at', { ascending: true }),
      supabase
        .from('bruno_message_feedback')
        .select('message_id, rating')
        .eq('conversation_id', id),
    ]);

    if (feedbackRows) {
      const feedbackMap: Record<string, BrunoMessageRating> = {};
      for (const row of feedbackRows) {
        if (row.rating === 1 || row.rating === -1) {
          feedbackMap[row.message_id] = row.rating;
        }
      }
      setFeedbackByMessageId(feedbackMap);
    }

    if (data) {
      branchRowsRef.current = data as BranchMessageRow[];
      const { messages: transcript, variantInfoByMessageId: variantInfo } =
        branchRowsToChatState(branchRowsRef.current);
      setVariantInfoByMessageId(variantInfo);
      setMessages(transcript.map(hydratedToUiMessage));
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setFeedbackByMessageId({});
    setVariantInfoByMessageId({});
    branchRowsRef.current = [];
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

    const editingId = editingMessageId;
    if (editingId) {
      setEditingMessageId(null);
    }

    sendUserTurn(userMessage, {
      messageId: editingId ?? undefined,
      body: createBrunoChatRequestBody(
        convId,
        currentContext,
        assistantMode,
        options.clarificationResponse,
        undefined,
        editingId ? { editMessageId: editingId } : undefined
      ),
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    void submitPrompt(input, event);
  };

  const findUserTurnBeforeAssistant = useCallback(
    (assistantMessageId: string) => {
      const assistantIndex = messages.findIndex((m) => m.id === assistantMessageId);
      if (assistantIndex === -1) return null;

      for (let i = assistantIndex - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          const text =
            messages[i].parts?.find((p) => p.type === 'text')?.text?.trim() ?? '';
          return { userIndex: i, userText: text, userMessageId: messages[i].id };
        }
      }
      return null;
    },
    [messages]
  );

  const handleRegenerate = useCallback(
    async (assistantMessageId: string) => {
      if (isProcessing || !currentConversationId) return;

      const turn = findUserTurnBeforeAssistant(assistantMessageId);
      if (!turn || !turn.userText) return;

      setFeedbackByMessageId((prev) => {
        const next = { ...prev };
        delete next[assistantMessageId];
        return next;
      });

      sendUserTurn(turn.userText, {
        messageId: turn.userMessageId,
        body: createBrunoChatRequestBody(
          currentConversationId,
          currentContext,
          assistantMode,
          undefined,
          undefined,
          { editMessageId: turn.userMessageId }
        ),
      });
    },
    [
      assistantMode,
      currentContext,
      currentConversationId,
      findUserTurnBeforeAssistant,
      isProcessing,
      sendUserTurn,
    ]
  );

  const handleSelectVariant = useCallback(
    (turnKey: string, variantIndex: number) => {
      if (!currentConversationId || isProcessing) return;

      const cachedRows = branchRowsRef.current;
      let cancelSkeleton: (() => void) | null = null;

      if (cachedRows.length > 0) {
        const { rows, messages, variantInfoByMessageId: variantInfo } =
          branchRowsToChatStateForVariant(cachedRows, turnKey, variantIndex);
        branchRowsRef.current = rows;
        setMessages(messages.map(hydratedToUiMessage));
        setVariantInfoByMessageId(variantInfo);
        setEditingMessageId(null);
        setInput('');
      } else {
        cancelSkeleton = scheduleVariantSkeleton(turnKey, setPendingVariantTurnKey);
      }

      void (async () => {
        const hadLocalCache = cachedRows.length > 0;

        try {
          await persistVariantSelection({
            conversationId: currentConversationId,
            turnKey,
            variantIndex,
          });

          const { data: branchRows } = await supabase
            .from('bruno_messages')
            .select(BRUNO_BRANCH_MESSAGE_SELECT)
            .eq('conversation_id', currentConversationId)
            .order('created_at', { ascending: true });

          if (branchRows?.length) {
            branchRowsRef.current = branchRows as BranchMessageRow[];
          }

          if (!hadLocalCache && branchRowsRef.current.length > 0) {
            const { messages, variantInfoByMessageId: variantInfo } =
              branchRowsToChatState(branchRowsRef.current);
            setMessages(messages.map(hydratedToUiMessage));
            setVariantInfoByMessageId(variantInfo);
            setEditingMessageId(null);
            setInput('');
          }
        } catch (variantError) {
          console.error('[BrunoChatSidebar] select variant failed:', variantError);
          toast.error('Could not switch edit version. Please try again.');
          await syncMessagesFromConversation(currentConversationId);
        } finally {
          cancelSkeleton?.();
          setPendingVariantTurnKey(null);
        }
      })();
    },
    [
      currentConversationId,
      isProcessing,
      setMessages,
      supabase,
      syncMessagesFromConversation,
    ]
  );

  const handleFeedback = useCallback(
    async (messageId: string, rating: BrunoMessageRating) => {
      if (!currentConversationId) {
        toast.error('Start a conversation before rating replies.');
        return;
      }

      const assistantMessage = messages.find((m) => m.id === messageId);
      const assistantText =
        assistantMessage?.parts?.find((p) => p.type === 'text')?.text ?? '';
      const turn = findUserTurnBeforeAssistant(messageId);

      const previousRating = feedbackByMessageId[messageId];
      setFeedbackByMessageId((prev) => {
        const next = { ...prev };
        if (previousRating === rating) {
          delete next[messageId];
        } else {
          next[messageId] = rating;
        }
        return next;
      });

      try {
        const response = await fetch('/api/ai/chat/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId,
            conversationId: currentConversationId,
            rating,
            messageSnapshot: assistantText,
            userTurnSnapshot: turn?.userText,
          }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const payload = (await response.json()) as {
          rating: BrunoMessageRating | null;
          cleared?: boolean;
        };

        setFeedbackByMessageId((prev) => {
          const next = { ...prev };
          if (payload.cleared || payload.rating === null) {
            delete next[messageId];
          } else {
            next[messageId] = payload.rating;
          }
          return next;
        });

        if (!payload.cleared && payload.rating !== null) {
          toast.success('Thanks for your feedback — it helps us improve Bruno.', {
            duration: 3500,
          });
        }
      } catch (feedbackError) {
        console.error('[BrunoChatSidebar] feedback failed:', feedbackError);
        setFeedbackByMessageId((prev) => {
          const next = { ...prev };
          if (previousRating) {
            next[messageId] = previousRating;
          } else {
            delete next[messageId];
          }
          return next;
        });
        toast.error('Could not save feedback. Try again.');
      }
    },
    [
      currentConversationId,
      feedbackByMessageId,
      findUserTurnBeforeAssistant,
      messages,
    ]
  );

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
                <BrunoMessageList
                  messages={messages}
                  isProcessing={isProcessing}
                  isBrunoWorking={isBrunoWorking}
                  thinkingLabel={{ prefix, verbText, verb }}
                  editingMessageId={editingMessageId}
                  onStartEditMessage={(messageId, text) => {
                    setInput(text);
                    setEditingMessageId(messageId);
                  }}
                  conversationId={currentConversationId}
                  actionStatuses={actionStatuses}
                  actionErrors={actionErrors}
                  isConfirmingAll={isConfirmingAll}
                  onConfirmProposal={handleConfirmProposal}
                  onCancelProposal={handleCancelProposal}
                  onConfirmAll={handleConfirmAll}
                  onContinueTruncated={() => {
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
                  feedbackByMessageId={feedbackByMessageId}
                  onFeedback={(messageId, rating) => {
                    void handleFeedback(messageId, rating);
                  }}
                  onRegenerate={(messageId) => {
                    void handleRegenerate(messageId);
                  }}
                  variantInfoByMessageId={variantInfoByMessageId}
                  pendingVariantTurnKey={pendingVariantTurnKey}
                  onSelectVariant={(turnKey, variantIndex) => {
                    handleSelectVariant(turnKey, variantIndex);
                  }}
                />
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
