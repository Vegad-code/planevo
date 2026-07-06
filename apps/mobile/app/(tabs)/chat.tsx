import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '@/lib/streaming-polyfills';
import { useChat } from '@ai-sdk/react';
import {
  createBrunoChatRequestBody,
  createBrunoChatTransport,
  getBrunoApiUrl,
} from '@/lib/bruno/chat-transport';
import {
  branchRowsToChatState,
  type BranchMessageRow,
  type BrunoVariantInfo,
} from '@/lib/bruno/messageBranches';
import {
  extractProposalsFromMessage,
  type ExtractedProposal,
} from '@/lib/bruno/extractProposals';
import { executeBrunoActionProposal } from '@/lib/bruno/executeActionProposal';
import { deriveBrunoProgressState } from '@/lib/bruno/brunoProgressState';
import { useBrunoThinkingLabel } from '@/hooks/useBrunoThinkingLabel';
import type {
  BrunoClarificationCard as BrunoClarificationCardData,
  BrunoClarificationResponse,
  BrunoRateLimitPayload,
  BrunoUIMessage,
} from '@/lib/bruno/types';
import { BrunoThinkingIndicator } from '@/components/bruno/BrunoThinkingIndicator';
import { BrunoClarificationCard } from '@/components/bruno/BrunoClarificationCard';
import {
  BrunoActionProposalCard,
  type MobileActionProposal,
  type MobileExecutionStatus,
} from '@/components/bruno/BrunoActionProposalCard';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useNetworkState } from '@/hooks/useNetworkState';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Send, Bot, UserIcon, History, Plus, Square, Edit2, X, Trash, CalendarDays } from 'lucide-react-native';
import PlanDraftCard, { type PlanDraftItemData } from '../../components/bruno/PlanDraftCard';
import PlanPreviewModal from '../../components/bruno/PlanPreviewModal';
import BrunoEntitlementNotice, {
  type MobileBrunoMetadata,
} from '../../components/bruno/BrunoEntitlementNotice';
import { BrunoChatLimitModal } from '@/components/bruno/BrunoChatLimitModal';
import { presentPlanevoProPaywall } from '@/lib/revenuecat';
import {
  isRateLimitActive,
  parseBrunoRateLimitError,
} from '@/lib/bruno/rate-limit-client';
import { useBrunoAssistantMode } from '@/hooks/useBrunoAssistantMode';
import { useRouter, useLocalSearchParams } from 'expo-router';

const BRUNO_BRANCH_MESSAGE_SELECT =
  'id, content, message_type, parts, created_at, turn_key, variant_index, is_active_variant, parent_user_message_id, superseded_at';

interface ChatMessage {
  id: string;
  role: 'user' | 'bruno';
  content: string;
  timestamp: Date;
  toolCalls?: { toolName: string; args?: Record<string, unknown> }[];
  metadata?: MobileBrunoMetadata;
  clarificationCards?: BrunoClarificationCardData[];
  actionProposals?: ExtractedProposal[];
}

const WELCOME_TEXT =
  "Hey! Ask me anything — or turn on Planning mode when you want help with tasks, schedules, and your week.";

const WELCOME_UI_MESSAGE: BrunoUIMessage = {
  id: 'welcome',
  role: 'assistant',
  parts: [{ type: 'text', text: WELCOME_TEXT }],
};

function messageText(message: BrunoUIMessage): string {
  return (
    message.parts
      ?.filter((part) => part.type === 'text')
      .map((part) => ('text' in part ? part.text : ''))
      .join('') ?? ''
  );
}

function extractToolCallsFromMessage(message: BrunoUIMessage) {
  const parts = message.parts ?? [];
  return parts
    .filter((part) => part.type.startsWith('tool-') || part.type === 'tool-invocation')
    .map((part) => {
      if (part.type === 'tool-invocation' && 'toolInvocation' in part) {
        const invocation = part.toolInvocation as {
          toolName?: string;
          args?: Record<string, unknown>;
        };
        return {
          toolName: invocation.toolName ?? 'tool',
          args: invocation.args ?? {},
        };
      }
      if (part.type.startsWith('tool-')) {
        const toolName = part.type.slice('tool-'.length);
        const input =
          'input' in part && part.input && typeof part.input === 'object'
            ? (part.input as Record<string, unknown>)
            : {};
        return { toolName, args: input };
      }
      return { toolName: 'tool', args: {} as Record<string, unknown> };
    });
}

function extractClarificationCardsFromMessage(
  message: BrunoUIMessage
): BrunoClarificationCardData[] {
  const parts = message.parts ?? [];
  return parts
    .filter((part) => part.type === 'data-bruno-clarification-card')
    .map((part) =>
      part.type === 'data-bruno-clarification-card' ? part.data : null
    )
    .filter((card): card is BrunoClarificationCardData => Boolean(card));
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

function findUserPromptBeforeMessage(
  messages: BrunoUIMessage[],
  assistantMessageId: string
): string | undefined {
  const messageIndex = messages.findIndex((message) => message.id === assistantMessageId);
  const searchMessages = messageIndex === -1 ? messages : messages.slice(0, messageIndex);

  for (let index = searchMessages.length - 1; index >= 0; index -= 1) {
    const message = searchMessages[index];
    if (message.role === 'user') {
      return messageText(message) || undefined;
    }
  }

  return undefined;
}

export default function BrunoChatScreen() {
  const { assistantMode, togglePlanningMode, isPlanningMode } =
    useBrunoAssistantMode();
  const router = useRouter();
  const { prompt: promptParam } = useLocalSearchParams<{ prompt?: string }>();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { isOffline } = useNetworkState();
  const [inputText, setInputText] = useState('');
  const [rateLimitInfo, setRateLimitInfo] = useState<BrunoRateLimitPayload | null>(null);
  const [isPaywallDismissed, setIsPaywallDismissed] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const currentConversationIdRef = useRef<string | null>(null);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const {
    messages: uiMessages,
    setMessages: setUiMessages,
    sendMessage: sendChatMessage,
    status,
    stop,
    error: chatError,
    clearError,
  } = useChat<BrunoUIMessage>({
    transport: createBrunoChatTransport(),
    messages: [WELCOME_UI_MESSAGE],
    generateId: () => crypto.randomUUID(),
    onError: (error) => {
      const parsed = parseBrunoRateLimitError(error);
      if (parsed) {
        setRateLimitInfo(parsed);
        setIsPaywallDismissed(false);
      }
    },
    onFinish: async ({ message }) => {
      // Assistant-turn persistence is server-side now (the chat route stores
      // the full message with parts); inserting here would duplicate rows.
      const activeUser = userRef.current;
      if (
        currentConversationIdRef.current &&
        message.role === 'assistant' &&
        activeUser
      ) {
        await supabase
          .from('chat_conversations')
          .update({ last_active: new Date().toISOString() })
          .eq('id', currentConversationIdRef.current);

        await new Promise((resolve) => setTimeout(resolve, 400));

        const { data: branchRows } = await supabase
          .from('bruno_messages')
          .select(BRUNO_BRANCH_MESSAGE_SELECT)
          .eq('conversation_id', currentConversationIdRef.current)
          .order('created_at', { ascending: true });
        if (branchRows) {
          const { messages: transcript, variantInfoByMessageId: variantInfo } =
            branchRowsToChatState(branchRows as BranchMessageRow[]);
          setVariantInfoByMessageId(variantInfo);
          setUiMessages(
            transcript.map((message) => ({
              id: message.id,
              role: message.role,
              parts: message.parts,
            }))
          );
        }
      }
    },
  });

  useEffect(() => {
    if (chatError) {
      const parsed = parseBrunoRateLimitError(chatError);
      if (parsed) {
        setRateLimitInfo(parsed);
        setIsPaywallDismissed(false);
      }
    }
  }, [chatError]);

  const isRateLimited = isRateLimitActive(rateLimitInfo);

  const sending = status === 'streaming' || status === 'submitted';

  const displayMessages: ChatMessage[] = useMemo(
    () =>
      uiMessages
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .map((message) => ({
          id: message.id,
          role: message.role === 'user' ? 'user' : 'bruno',
          content: messageText(message),
          timestamp: new Date(),
          toolCalls: extractToolCallsFromMessage(message),
          clarificationCards: extractClarificationCardsFromMessage(message),
          actionProposals: extractProposalsFromMessage(message),
        })),
    [uiMessages]
  );

  const progressState = useMemo(
    () => deriveBrunoProgressState({ messages: uiMessages, chatStatus: status }),
    [uiMessages, status]
  );

  const { prefix, verbText, verb, headerLabel } = useBrunoThinkingLabel({
    isBrunoWorking: progressState.isBrunoWorking,
    isBrunoFinalizing: progressState.isBrunoFinalizing,
  });

  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [variantInfoByMessageId, setVariantInfoByMessageId] = useState<
    Record<string, BrunoVariantInfo>
  >({});
  const [chatToDelete, setChatToDelete] = useState<{id: string, title: string} | null>(null);
  const [initialMessagesLoaded, setInitialMessagesLoaded] = useState(false);

  const [mentionState, setMentionState] = useState<{ active: boolean, text: string }>({ active: false, text: '' });
  const [suggestions, setSuggestions] = useState<{id: string, title: string, type: 'task'|'event', subtitle?: string}[]>([]);

  const [previewPlanData, setPreviewPlanData] = useState<any>(null);
  const [isCommittingPlan, setIsCommittingPlan] = useState(false);
  const [actionStatuses, setActionStatuses] = useState<Record<string, MobileExecutionStatus>>({});
  const [actionErrors, setActionErrors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (typeof promptParam === 'string' && promptParam.trim()) {
      setInputText(promptParam);
    }
  }, [promptParam]);

  useEffect(() => {
    async function fetchMentions() {
      if (!mentionState.active || !user) {
        setSuggestions([]);
        return;
      }
      const [{ data: tasks }, { data: events }] = await Promise.all([
        supabase.from('tasks').select('id, title, status').eq('user_id', user.id).neq('status', 'done').is('deleted_at', null).ilike('title', `%${mentionState.text}%`).limit(5),
        supabase.from('calendar_events').select('id, title, start_time').eq('user_id', user.id).gte('start_time', new Date().toISOString()).eq('is_deleted', false).ilike('title', `%${mentionState.text}%`).limit(5)
      ]);

      const formatted = [
        ...(tasks || []).map(t => ({ id: t.id, title: t.title, type: 'task' as const, subtitle: `Task • ${t.status}` })),
        ...(events || []).map(e => ({ id: e.id, title: e.title, type: 'event' as const, subtitle: `Event • ${new Date(e.start_time).toLocaleDateString()}` }))
      ];
      setSuggestions(formatted);
    }
    const timeout = setTimeout(fetchMentions, 300);
    return () => clearTimeout(timeout);
  }, [mentionState, user]);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    await supabase.from('chat_conversations').delete().eq('user_id', user.id).lt('last_active', thirtyDaysAgo.toISOString());

    const { data } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('last_active', { ascending: false });

    if (data) setConversations(data);
  }, [user, setConversations]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    currentConversationIdRef.current = currentConversationId;
  }, [currentConversationId]);

  useEffect(() => {
    if (!user || initialMessagesLoaded) return;
    
    if (currentConversationId) {
      supabase
        .from('bruno_messages')
        .select(BRUNO_BRANCH_MESSAGE_SELECT)
        .eq('conversation_id', currentConversationId)
        .order('created_at', { ascending: true })
        .limit(100)
        .then(({ data }) => {
          if (data && data.length > 0) {
            const { messages: transcript, variantInfoByMessageId: variantInfo } =
              branchRowsToChatState(data as BranchMessageRow[]);
            setVariantInfoByMessageId(variantInfo);
            setUiMessages(
              transcript.map((message) => ({
                id: message.id,
                role: message.role,
                parts: message.parts,
              }))
            );
          } else {
            setUiMessages([WELCOME_UI_MESSAGE]);
            setVariantInfoByMessageId({});
          }
          setInitialMessagesLoaded(true);
        });
    } else {
      supabase.from('chat_conversations')
        .select('id')
        .eq('user_id', user.id)
        .order('last_active', { ascending: false })
        .limit(1)
        .then(({ data }) => {
           if (data && data.length > 0) {
             setCurrentConversationId(data[0].id);
           } else {
             setUiMessages([WELCOME_UI_MESSAGE]);
             setInitialMessagesLoaded(true);
           }
        });
    }
  }, [user, initialMessagesLoaded, currentConversationId, setUiMessages]);

  const startNewConversation = () => {
    setCurrentConversationId(null);
    currentConversationIdRef.current = null;
    setUiMessages([WELCOME_UI_MESSAGE]);
    setVariantInfoByMessageId({});
    setShowHistory(false);
    setInitialMessagesLoaded(true);
  };

  const loadConversation = async (id: string) => {
    setCurrentConversationId(id);
    setShowHistory(false);
    setInitialMessagesLoaded(false);
  };

  const promptDeleteConversation = (id: string, title: string) => {
    setChatToDelete({ id, title });
  };

  const confirmDeleteConversation = async () => {
    if (!chatToDelete) return;
    const { id } = chatToDelete;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        Alert.alert('Error', 'Failed to delete conversation.');
        setChatToDelete(null);
        return;
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/ai/conversations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (currentConversationId === id) {
          startNewConversation();
        }
      } else {
        Alert.alert('Error', 'Failed to delete conversation.');
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      Alert.alert('Error', 'Failed to delete conversation.');
    }
    setChatToDelete(null);
  };

  const stopGeneration = () => {
    stop();
  };

  const submitUserMessage = useCallback(async (
    messageContent: string,
    options: {
      clarificationResponse?: BrunoClarificationResponse;
      bypassMentionGuard?: boolean;
    } = {}
  ) => {
    if (isOffline) {
      Alert.alert('Offline', 'Cannot send messages while offline.');
      return;
    }
    if (!messageContent.trim() || sending || isRateLimited) return;

    if (!options.bypassMentionGuard && mentionState.active && suggestions.length > 0) {
      // User is actively picking a mention, so don't submit chat
      return;
    }

    const userMessageContent = messageContent.trim();
    setInputText('');
    setMentionState({ active: false, text: '' });

    let convId = currentConversationId;
    if (!convId && user) {
      const { data: newConv } = await supabase
        .from('chat_conversations')
        .insert({ user_id: user.id, title: userMessageContent.slice(0, 30) + '...' })
        .select()
        .single();
      if (newConv) {
        convId = newConv.id;
        setCurrentConversationId(convId);
        currentConversationIdRef.current = convId;
        fetchConversations();

        supabase.auth.getSession().then(({ data: { session } }) => {
          const token = session?.access_token;
          if (token) {
            fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/ai/generate-title`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ message: userMessageContent, conversationId: convId }),
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.title) fetchConversations();
              })
              .catch((err) => console.log('Failed to generate title', err));
          }
        });
      }
    }

    const editingId = editingMessageId;
    if (editingId) {
      setEditingMessageId(null);
    }

    try {
      if (user && convId) {
        await supabase
          .from('chat_conversations')
          .update({ last_active: new Date().toISOString() })
          .eq('id', convId);
      }

      sendChatMessage(
        editingId
          ? { text: userMessageContent, messageId: editingId }
          : { text: userMessageContent },
        {
          body: createBrunoChatRequestBody({
            conversationId: convId,
            assistantMode,
            clarificationResponse: options.clarificationResponse,
            editMessageId: editingId ?? undefined,
          }),
        }
      );
    } catch (err: unknown) {
      console.error('Chat error:', err);
      const message = err instanceof Error ? err.message : 'Failed to connect to Bruno.';
      Alert.alert('Bruno Error', message);
    }
  }, [
    sending,
    user,
    currentConversationId,
    editingMessageId,
    fetchConversations,
    setCurrentConversationId,
    setEditingMessageId,
    isOffline,
    mentionState,
    suggestions,
    sendChatMessage,
    assistantMode,
    isRateLimited,
  ]);

  const sendMessage = useCallback(async () => {
    await submitUserMessage(inputText);
  }, [inputText, submitUserMessage]);

  const handleConfirmProposal = useCallback(
    async (proposal: MobileActionProposal, assistantMessageId: string) => {
      setActionStatuses((prev) => ({ ...prev, [proposal.id]: 'executing' }));
      setActionErrors((prev) => ({ ...prev, [proposal.id]: null }));

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          throw new Error('Sign in again to confirm this action.');
        }

        const result = await executeBrunoActionProposal({
          proposal,
          accessToken: token,
          userPrompt: findUserPromptBeforeMessage(uiMessages, assistantMessageId),
        });

        if (!result.success) {
          throw new Error(result.error ?? 'Could not execute action');
        }

        setActionStatuses((prev) => ({ ...prev, [proposal.id]: 'success' }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Could not execute action';
        console.error('[Bruno] Failed to execute proposal', error);
        setActionStatuses((prev) => ({ ...prev, [proposal.id]: 'error' }));
        setActionErrors((prev) => ({ ...prev, [proposal.id]: message }));
      }
    },
    [uiMessages]
  );

  const handleCancelProposal = useCallback((proposal: MobileActionProposal) => {
    setActionStatuses((prev) => ({ ...prev, [proposal.id]: 'cancelled' }));
    setActionErrors((prev) => ({ ...prev, [proposal.id]: null }));
  }, []);

  const handleSelectVariant = useCallback(
    async (turnKey: string, variantIndex: number) => {
      if (!currentConversationId || sending) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        const response = await fetch(`${getBrunoApiUrl()}/api/ai/chat/select-variant`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            conversationId: currentConversationId,
            turnKey,
            variantIndex,
          }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const payload = (await response.json()) as {
          messages: {
            id: string;
            role: 'user' | 'assistant';
            parts: BrunoUIMessage['parts'];
          }[];
          variantInfoByMessageId: Record<string, BrunoVariantInfo>;
        };

        setUiMessages(
          payload.messages.map((message) => ({
            id: message.id,
            role: message.role,
            parts: message.parts,
          }))
        );
        setVariantInfoByMessageId(payload.variantInfoByMessageId);
        setEditingMessageId(null);
      } catch (error) {
        console.error('[Bruno mobile] select variant failed:', error);
        Alert.alert('Bruno', 'Could not switch edit version. Please try again.');
      }
    },
    [currentConversationId, sending, setUiMessages]
  );

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const isEditing = editingMessageId === item.id;
    return (
      <View style={[styles.messageWrapper, isUser ? styles.userWrapper : styles.brunoWrapper]}>
        <View style={{ flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: 6 }}>
          <View
            style={[
              styles.messageBubble,
              isUser ? styles.userBubble : styles.brunoBubble,
              {
                backgroundColor: isUser ? Colors.brand[600] : isDark ? Colors.surface[700] : Colors.surface[100],
                opacity: isEditing ? 0.5 : 1,
              },
            ]}
            testID={`chat-message-${item.id}`}
          >
            {!isUser && (
              <BrunoEntitlementNotice
                metadata={item.metadata}
                onUpgrade={() => router.push('/settings')}
              />
            )}
            <View style={styles.messageHeader}>
              {isUser ? (
                <UserIcon size={12} color={isUser ? '#fff' : colors.textMuted} strokeWidth={2.5} />
              ) : (
                <Bot size={12} color={Colors.brand[500]} strokeWidth={2.5} />
              )}
              <Text style={[styles.messageRole, { color: isUser ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
                {isUser ? 'YOU' : 'BRUNO'}
              </Text>
            </View>
            <Text style={[styles.messageText, { color: isUser ? '#fff' : colors.text }]}>
              {item.content}
            </Text>

            {isUser && variantInfoByMessageId[item.id] ? (
              <View style={styles.versionNavRow}>
                <TouchableOpacity
                  disabled={sending || variantInfoByMessageId[item.id].activeIndex <= 0}
                  onPress={() => {
                    void handleSelectVariant(
                      variantInfoByMessageId[item.id].turnKey,
                      variantInfoByMessageId[item.id].activeIndex - 1
                    );
                  }}
                  style={styles.versionNavButton}
                >
                  <Text style={styles.versionNavButtonText}>{'‹'}</Text>
                </TouchableOpacity>
                <Text style={styles.versionNavLabel}>
                  {variantInfoByMessageId[item.id].activeIndex + 1} /{' '}
                  {variantInfoByMessageId[item.id].totalVariants}
                </Text>
                <TouchableOpacity
                  disabled={
                    sending ||
                    variantInfoByMessageId[item.id].activeIndex >=
                      variantInfoByMessageId[item.id].totalVariants - 1
                  }
                  onPress={() => {
                    void handleSelectVariant(
                      variantInfoByMessageId[item.id].turnKey,
                      variantInfoByMessageId[item.id].activeIndex + 1
                    );
                  }}
                  style={styles.versionNavButton}
                >
                  <Text style={styles.versionNavButtonText}>{'›'}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {!isUser && item.clarificationCards && item.clarificationCards.length > 0 && (
              <View style={styles.clarificationStack}>
                {item.clarificationCards.map((card) => (
                  <BrunoClarificationCard
                    key={card.id}
                    card={card}
                    disabled={sending}
                    isDark={isDark}
                    textColor={colors.text}
                    mutedColor={colors.textMuted}
                    onSubmit={(response) => {
                      void submitUserMessage(
                        formatClarificationResponseForChat(response),
                        {
                          clarificationResponse: response,
                          bypassMentionGuard: true,
                        }
                      );
                    }}
                  />
                ))}
              </View>
            )}

            {!isUser && item.actionProposals && item.actionProposals.length > 0 && (
              <View style={styles.actionProposalStack}>
                {item.actionProposals.map((proposal) => {
                  const executionStatus = actionStatuses[proposal.id] ?? 'idle';
                  if (executionStatus === 'cancelled') {
                    return null;
                  }

                  return (
                    <BrunoActionProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      executionStatus={executionStatus}
                      executionError={actionErrors[proposal.id]}
                      onConfirm={(selectedProposal) =>
                        handleConfirmProposal(selectedProposal, item.id)
                      }
                      onCancel={handleCancelProposal}
                      isDark={isDark}
                    />
                  );
                })}
              </View>
            )}
            
            {/* Render Tool Calls */}
            {!isUser && item.toolCalls && item.toolCalls.length > 0 && (
              <View style={{ marginTop: 12, gap: 8 }}>
                {item.toolCalls.map((tc, idx) => {
                  if (tc.toolName === 'propose_action') {
                    return null;
                  }
                  if (tc.toolName === 'propose_plan_draft' && tc.args) {
                    const planTitle =
                      typeof tc.args.plan_title === 'string' ? tc.args.plan_title : 'Plan draft';
                    const planObjective =
                      typeof tc.args.plan_objective === 'string'
                        ? tc.args.plan_objective
                        : '';
                    const items = Array.isArray(tc.args.items)
                      ? (tc.args.items as PlanDraftItemData[])
                      : [];
                     return (
                       <PlanDraftCard 
                         key={idx}
                         planTitle={planTitle}
                         planObjective={planObjective}
                         items={items}
                         isCommitting={isCommittingPlan}
                         onReviewPress={() => {
                           setPreviewPlanData(tc.args);
                         }}
                       />
                     );
                  }
                  const args = tc.args ?? {};
                  const taskTitle = typeof args.title === 'string' ? args.title : '';
                  const subtasks = Array.isArray(args.subtasks) ? args.subtasks : [];
                  // Render generic tool call chip
                  return (
                    <View key={idx} style={[styles.toolCallChip, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)' }]}>
                      <Bot size={12} color={colors.textMuted} />
                      <Text style={[styles.toolCallText, { color: colors.textMuted }]}>
                        {tc.toolName === 'create_task' ? `Created Task: ${taskTitle}` :
                         tc.toolName === 'reschedule_task' ? `Rescheduled Task` :
                         tc.toolName === 'break_down_task' ? `Broken down into ${subtasks.length} subtasks` :
                         tc.toolName === 'create_calendar_block' ? `Created Calendar Block: ${taskTitle}` :
                         `Ran ${tc.toolName}`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {isUser && !sending && !isEditing && (
            <TouchableOpacity 
              onPress={() => {
                setInputText(item.content);
                setEditingMessageId(item.id);
              }}
              style={{ padding: 6, alignSelf: 'center' }}
            >
              <Edit2 size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top']}
      accessibilityRole="none"
      accessibilityLabel="Bruno chat"
    >
      <View style={styles.headerBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.brunoBadge, { backgroundColor: Colors.brand[500] }]}>
            <Bot size={18} color="#fff" strokeWidth={2.5} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Bruno</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              {progressState.isBrunoWorking
                ? headerLabel.toUpperCase()
                : 'YOUR PLANNING CO-PILOT'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setShowHistory(true)} style={{ marginLeft: 'auto', padding: 8 }}>
          <History size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <Modal visible={showHistory} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowHistory(false)}>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <View style={[styles.headerBar, { justifyContent: 'space-between' }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Past Chats</Text>
            <TouchableOpacity onPress={() => setShowHistory(false)} style={{ padding: 8 }}>
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={startNewConversation} style={[styles.newChatBtn, { backgroundColor: Colors.brand[500] }]}>
            <Plus size={16} color="#fff" />
            <Text style={styles.newChatText}>New Chat</Text>
          </TouchableOpacity>
                  {displayMessages.length === 1 && (
          <View style={styles.quickActionsContainer}>
            {['Plan my day', 'Break down my project', 'Reschedule my week'].map((action, idx) => (
              <TouchableOpacity key={idx} style={[styles.quickActionBtn, { borderColor: colors.separator }]} onPress={() => setInputText(action)}>
                <Text style={[styles.quickActionText, { color: colors.text }]}>{action}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={[styles.convItemWrapper, { borderBottomColor: colors.separator }]}>
                <TouchableOpacity onPress={() => loadConversation(item.id)} style={styles.convItem}>
                  <Text style={[styles.convTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={[styles.convDate, { color: colors.textMuted }]}>{new Date(item.last_active).toLocaleDateString()}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.historyDeleteButton}
                    onPress={() => promptDeleteConversation(item.id, item.title)}
                  >
                  <Trash size={20} color={Colors.error} />
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={{ padding: 20 }}
          />
        </SafeAreaView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={!!chatToDelete}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Delete Chat?</Text>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete the chat <Text style={{fontWeight: 'bold', color: colors.text}}>"{chatToDelete?.title}"</Text>? This will be gone forever and recovery is NOT an option.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancel}
                onPress={() => setChatToDelete(null)}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalConfirm}
                onPress={confirmDeleteConversation}
              >
                <Text style={styles.deleteModalConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {isOffline && (
        <View style={[styles.offlineBanner, { backgroundColor: Colors.error }]}>
          <Text style={styles.offlineText}>You're offline. Chat is unavailable.</Text>
        </View>
      )}

      {/* Plan Preview Modal */}
      {previewPlanData && (
        <PlanPreviewModal
          isOpen={!!previewPlanData}
          onClose={() => setPreviewPlanData(null)}
          planTitle={previewPlanData.plan_title}
          planObjective={previewPlanData.plan_objective}
          items={previewPlanData.items}
          isCommitting={isCommittingPlan}
          hasGoogleCalendar={false}
          onApprove={(options) => {
            setIsCommittingPlan(true);
            const commitType = (options.createTasks && options.blockCalendar) ? 'both' 
              : options.createTasks ? 'tasks_only' 
              : 'calendar_only';
            
            // We inject the approved items JSON into the message so the backend AI knows exactly what to commit
            // without needing the full tool-call history from previous messages.
            const approvalMessage = `Looks good! Approve the plan and execute as: ${commitType}${options.syncToGoogle ? ' (sync to Google)' : ''}.\n\nApproved items to commit:\n${JSON.stringify(previewPlanData.items, null, 2)}`;
            
            setInputText(approvalMessage);
            setPreviewPlanData(null);
            setTimeout(() => {
              setIsCommittingPlan(false);
              sendMessage(); // automatically send the message
            }, 500);
          }}
          onRequestEdit={(feedback) => {
            setInputText(feedback);
          }}
        />
      )}

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {displayMessages.length > 20 && (
          <View style={[styles.warningBanner, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
            <Text style={{ color: '#f59e0b', fontSize: 12, textAlign: 'center', fontWeight: '500' }}>
              This conversation is getting long. Start a new chat for better memory.
            </Text>
          </View>
        )}
                {displayMessages.length === 1 && (
          <View style={styles.quickActionsContainer}>
            {['Plan my day', 'Break down my project', 'Reschedule my week'].map((action, idx) => (
              <TouchableOpacity key={idx} style={[styles.quickActionBtn, { borderColor: colors.separator }]} onPress={() => setInputText(action)}>
                <Text style={[styles.quickActionText, { color: colors.text }]}>{action}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            progressState.isBrunoWorking ? (
              <BrunoThinkingIndicator
                prefix={prefix}
                verbText={verbText}
                verb={verb}
                color={colors.textMuted}
                brandColor={Colors.brand[500]}
              />
            ) : null
          }
        />

        {mentionState.active && suggestions.length > 0 && (
          <View style={[styles.mentionsContainer, { backgroundColor: isDark ? Colors.surface[800] : '#fff', borderColor: colors.separator }]}>
            {suggestions.map((s) => (
              <TouchableOpacity
                key={`${s.type}-${s.id}`}
                style={[styles.mentionItem, { borderBottomColor: colors.separator }]}
                onPress={() => {
                  const words = inputText.split(' ');
                  words.pop();
                  const mentionLabel = `"${s.title}"`;
                  setInputText(words.length > 0 ? `${words.join(' ')} ${mentionLabel} ` : `${mentionLabel} `);
                  setMentionState({ active: false, text: '' });
                  setSuggestions([]);
                }}
              >
                <Text style={[styles.mentionTitle, { color: colors.text }]} numberOfLines={1}>{s.title}</Text>
                <Text style={[styles.mentionSubtitle, { color: colors.textMuted }]}>{s.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.separator }]}>
          <TouchableOpacity
            style={[
              styles.planningToggle,
              {
                borderColor: isPlanningMode ? Colors.brand[500] : colors.separator,
                backgroundColor: isPlanningMode
                  ? `${Colors.brand[500]}22`
                  : isDark
                    ? Colors.surface[700]
                    : Colors.surface[100],
              },
            ]}
            onPress={togglePlanningMode}
            accessibilityRole="button"
            accessibilityState={{ selected: isPlanningMode }}
            accessibilityLabel={
              isPlanningMode ? 'Planning mode on' : 'Switch to planning mode'
            }
          >
            <CalendarDays
              size={16}
              color={isPlanningMode ? Colors.brand[500] : colors.textMuted}
            />
          </TouchableOpacity>
          <TextInput
            style={[styles.textInput, { color: colors.text, backgroundColor: isDark ? Colors.surface[700] : Colors.surface[100] }]}
            placeholder={
              editingMessageId
                ? 'Edit your message...'
                : isRateLimited
                  ? 'Your free Bruno limit is reached for now…'
                  : isPlanningMode
                    ? 'How can I help you plan today?'
                    : 'Ask anything...'
            }
            placeholderTextColor={colors.textMuted}
            value={inputText}
            editable={!isRateLimited}
            onChangeText={(val) => {
              setInputText(val);
              const lastWord = val.split(' ').pop();
              if (lastWord?.startsWith('@') || lastWord?.startsWith('/')) {
                setMentionState({ active: true, text: lastWord.slice(1).toLowerCase() });
              } else {
                setMentionState({ active: false, text: '' });
              }
            }}
            multiline
            maxLength={500}
            testID="chat-input"
          />
          {sending ? (
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: Colors.error }]}
              onPress={stopGeneration}
              testID="chat-stop-button"
            >
              <Square size={16} color="#fff" fill="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: inputText.trim() && !isRateLimited ? Colors.brand[600] : colors.separator }]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isRateLimited}
              testID="chat-send-button"
            >
              <Send size={18} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {rateLimitInfo && isRateLimited ? (
        <BrunoChatLimitModal
          visible={!isPaywallDismissed}
          rateLimit={rateLimitInfo}
          isDark={isDark}
          onDismiss={() => {
            setIsPaywallDismissed(true);
            clearError();
          }}
          onExpired={() => {
            setRateLimitInfo(null);
            setIsPaywallDismissed(false);
          }}
          onUpgrade={async () => {
            await presentPlanevoProPaywall();
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  warningBanner: {
    padding: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  brunoBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBanner: { padding: 8, marginHorizontal: 20, borderRadius: 8, marginBottom: 12, alignItems: 'center' },
  offlineText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  chatArea: { flex: 1 },
  messageList: { paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
  messageWrapper: { maxWidth: '85%', gap: 4 },
  userWrapper: { alignSelf: 'flex-end' },
  brunoWrapper: { alignSelf: 'flex-start' },
  messageBubble: {
    borderRadius: 16,
    padding: 14,
  },
  userBubble: { borderBottomRightRadius: 4 },
  brunoBubble: { borderBottomLeftRadius: 4 },
  messageHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  messageRole: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  messageText: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  versionNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 6,
  },
  versionNavButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  versionNavButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  versionNavLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '600',
    minWidth: 36,
    textAlign: 'center',
  },
  clarificationStack: {
    marginTop: 12,
    gap: 10,
  },
  actionProposalStack: {
    marginTop: 12,
    gap: 10,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  planningToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  textInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  newChatText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  convItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 4,
  },
  convItem: {
    flex: 1,
    paddingVertical: 12,
  },
  historyDeleteButton: {
    padding: 8,
  },
  deleteBtn: {
    padding: 12,
  },
  convTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  convDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteModalContent: {
    backgroundColor: '#2c221a',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#3e3227',
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fdfbf7',
    marginBottom: 8,
  },
  deleteModalText: {
    fontSize: 14,
    color: 'rgba(253, 251, 247, 0.7)',
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    color: 'rgba(253, 251, 247, 0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteModalConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  deleteModalConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  toolCallChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toolCallText: {
    fontSize: 11,
    fontWeight: '600',
  },
  mentionsContainer: {
    position: 'absolute',
    bottom: '100%',
    left: 16,
    right: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  mentionItem: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mentionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  mentionSubtitle: {
    fontSize: 12,
  },
  contextWarning: {
    padding: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  }
});
