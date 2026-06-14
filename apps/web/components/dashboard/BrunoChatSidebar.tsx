'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PaperPlaneTilt, ArrowsOutSimple, CaretLeft, ClockCounterClockwise, PencilSimple, Stop, Plus, Trash, Warning, X, CaretDown } from '@phosphor-icons/react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import BrunoAvatar from '../bruno/BrunoAvatar';
import PlanDraftCard from '../bruno/PlanDraftCard';
import type { PlanDraftItemData } from '../bruno/PlanDraftCard';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useBruno } from '@/components/bruno/BrunoProvider';
import { BrunoContextBanner } from '@/components/bruno/BrunoContextBanner';
import { BrunoSuggestedActions } from '@/components/bruno/BrunoSuggestedActions';
import { createBrunoChatRequestBody } from '@/lib/bruno/chat-request';

import type { BrunoActionProposal } from '@/lib/bruno/tools/types';
import { BrunoActionProposalCard, type ExecutionStatus } from '../bruno/BrunoActionProposalCard';
import { BrunoProposalGroup } from '../bruno/BrunoProposalGroup';

const LOADING_PHRASES = [
  "Thinking...",
  "Calculating...",
  "Manifesting...",
  "Brewing...",
  "Solving...",
  "Vibing...",
  "Cooking..."
];

interface BrunoChatSidebarProps {
  onFinish?: () => void;
  isProcessing?: boolean;
  initialMessage?: string;
  assignmentId?: string;
}

export default function BrunoChatSidebar({
 
  onFinish, 
  isProcessing: isExternalProcessing = false,
  initialMessage, 
  assignmentId 
}: BrunoChatSidebarProps) {
  const [executingActions, setExecutingActions] = useState<Record<string, boolean>>({});
  const [actionStatuses, setActionStatuses] = useState<Record<string, ExecutionStatus>>({});
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

  function extractProposalsFromMessage(message: any): BrunoActionProposal[] {
    const parts = message.parts || [];
    const tools = parts.filter((p: any) => 
      p.type === 'tool-propose_action' || 
      (p.type === 'tool-invocation' && p.toolInvocation?.toolName === 'propose_action')
    );
    
    return tools.map((part: any) => {
      const args = part.input ?? part.args ?? part.toolInvocation?.args ?? part.toolInvocation?.input ?? {};
      const id = args.id ?? part.toolCallId ?? part.toolInvocation?.toolCallId ?? `proposal-${stableHash(JSON.stringify(args))}`;
      
      return {
        id,
        type: args.type,
        title: args.title,
        description: args.description,
        status: "pending_confirmation",
        riskLevel: args.riskLevel ?? "low",
        requiresConfirmation: args.requiresConfirmation ?? true,
        payload: args.payload ?? {},
        createdAt: args.createdAt ?? new Date().toISOString(),
      };
    });
  }

  function isTaskBreakdownIntent(text: string) {
    return /\b(break down|breakdown|smaller tasks|task list|turn .* into tasks|split .* into tasks|make .* realistic|realistic for tonight)\b/i.test(text);
  }

  const handleConfirmProposal = async (proposal: BrunoActionProposal) => {
    // Need to use functional update to avoid stale state in loop
    let alreadyProcessing = false;
    setExecutingActions(prev => {
      if (prev[proposal.id]) alreadyProcessing = true;
      return { ...prev, [proposal.id]: true };
    });
    
    // We also can't read actionStatuses directly synchronously, but it's okay because we lock executingActions.
    if (alreadyProcessing) return;

    setActionStatuses((prev) => ({ ...prev, [proposal.id]: "executing" }));

    try {
      const response = await fetch("/api/bruno/actions/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: proposal.id,
          type: proposal.type,
          title: proposal.title,
          description: proposal.description,
          payload: proposal.payload,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Could not execute action");
      }

      setActionStatuses((prev) => ({ ...prev, [proposal.id]: "success" }));
      setActionErrors((prev) => ({ ...prev, [proposal.id]: null }));
    } catch (error: any) {
      console.error("[Bruno] Failed to execute proposal", error);
      setActionStatuses((prev) => ({ ...prev, [proposal.id]: "error" }));
      setActionErrors((prev) => ({
        ...prev,
        [proposal.id]: error.message ?? "Couldn't create task. Try again.",
      }));
    } finally {
      setExecutingActions((prev) => ({ ...prev, [proposal.id]: false }));
    }
  };

  const handleCancelProposal = (proposal: BrunoActionProposal) => {
    setActionStatuses((prev) => ({ ...prev, [proposal.id]: "cancelled" }));
  };

  const handleConfirmAll = async (proposals: BrunoActionProposal[]) => {
    for (const proposal of proposals) {
      await handleConfirmProposal(proposal);
    }
  };
  const { currentContext, closeBruno } = useBruno();
  const supabase = createClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [loadingPhrase, setLoadingPhrase] = useState(LOADING_PHRASES[0]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

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
  const [isCommittingPlan, setIsCommittingPlan] = useState(false);

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
        supabase.from('calendar_events').select('id, title, start_time').eq('user_id', user.id).gte('start_time', new Date().toISOString()).is('deleted_at', null).ilike('title', `%${mentionState.text}%`).limit(5)
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

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    await supabase.from('chat_conversations').delete().eq('user_id', user.id).lt('last_active', thirtyDaysAgo.toISOString());

    const { data } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('last_active', { ascending: false });

    if (data) setConversations(data);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConversations();
  }, [fetchConversations]);

  const { messages, setMessages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai/chat',
    }),
    messages: [
      { 
        id: 'init',
        role: 'assistant', 
        parts: [{ type: 'text', text: initialMessage || "Hey! I've drafted your daily plan. Need to change anything? Just say the word." }]
      } as UIMessage
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onFinish: async (event: any) => {
      const message = event.message || event;
      const textPart = message.parts?.find((p: any) => p.type === 'text')?.text;
      
      if (currentConversationId && message.role === 'assistant' && textPart) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('bruno_messages').insert({
            conversation_id: currentConversationId,
            message_type: 'assistant',
            content: textPart,
            user_id: user.id
          });
          await supabase.from('chat_conversations').update({ last_active: new Date().toISOString() }).eq('id', currentConversationId);
        }
      }
      
      if (message.role === 'assistant') {
        const lastUserText = lastUserMessageRef.current;
        if (isTaskBreakdownIntent(lastUserText)) {
          const nativeProposals = extractProposalsFromMessage(message);
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
            const result = await response.json();
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
    }
  });

  const loadConversation = async (id: string) => {
    setCurrentConversationId(id);
    setShowHistory(false);

    const { data } = await supabase
      .from('bruno_messages')
      .select('id, content, message_type, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (data) {
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      setMessages(data.map((m: any) => ({
        id: m.id,
        role: m.message_type === 'user' ? 'user' : 'assistant',
        parts: [{ type: 'text', text: m.content }],
        createdAt: new Date(m.created_at)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)));
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([
      { 
        id: 'init',
        role: 'assistant', 
        parts: [{ type: 'text', text: initialMessage || "Hey! I've drafted your daily plan. Need to change anything? Just say the word." }]
      } as UIMessage
    ]);
    setShowHistory(false);
  };

  const promptDeleteConversation = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    setChatToDelete({ id, title });
  };

  const confirmDeleteConversation = async () => {
    if (!chatToDelete) return;
    const { id } = chatToDelete;
    const { error } = await supabase.from('chat_conversations').delete().eq('id', id);
    if (!error) {
      setConversations(prev => prev.filter(c => c.id !== id));
      if (currentConversationId === id) {
        startNewConversation();
      }
    } else {
      console.error("Failed to delete conversation:", error);
      toast.error('Planevo could not complete that action. Please try again.');
    }
    setChatToDelete(null);
  };

  const isChatGenerating = status === 'streaming' || status === 'submitted';
  const isProcessing = isExternalProcessing || isChatGenerating;

  const isWaitingForFirstToken = isProcessing && (
    messages.length === 0 ||
    messages[messages.length - 1]?.role === 'user' ||
    (messages[messages.length - 1]?.role === 'assistant' && 
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     !(messages[messages.length - 1].parts?.some((p: any) => p.type === 'text' && p.text.length > 0)) &&
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     !(messages[messages.length - 1].parts?.some((p: any) => p.type === 'tool-invocation')))
  );

  useEffect(() => {
    if (!scrollRef.current) return;
    
    const lastMessage = messages[messages.length - 1];
    const isUserMessage = lastMessage?.role === 'user';
    
    if (isAtBottom || isUserMessage || showHistory) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isExpanded, showHistory, isAtBottom]);

  // Update messages when initialMessage changes (context switch)
  useEffect(() => {
    if (initialMessage && !currentConversationId) {
      setMessages([{ 
        id: 'init',
        role: 'assistant', 
        parts: [{ type: 'text', text: initialMessage }] 
      } as UIMessage]);
    }
  }, [initialMessage, assignmentId, setMessages, currentConversationId]);

  const submitPrompt = async (prompt: string, event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt || isProcessing) return;

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
    setLoadingPhrase(LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)]);

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
        const timestamp = editedMsg.createdAt 
           ? (editedMsg.createdAt instanceof Date ? editedMsg.createdAt.toISOString() : new Date(editedMsg.createdAt).toISOString()) 
           : new Date().toISOString();
           
        await supabase.from('bruno_messages').delete()
          .eq('conversation_id', convId)
          .gte('created_at', timestamp);
          
        setMessages(messages.slice(0, editIndex));
      }
      setEditingMessageId(null);
    }

    if (convId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('bruno_messages').insert({
          conversation_id: convId,
          message_type: 'user',
          content: userMessage,
          user_id: user.id
        });
      }
    }

    sendMessage({ text: userMessage }, {
      body: createBrunoChatRequestBody(convId, currentContext)
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    void submitPrompt(input, event);
  };

  return (
    <>
      {/* Placeholder to prevent calendar grid collapse when expanded */}
      {isExpanded && <div className="w-full h-[600px] hidden lg:block" />}
      
      {/* Zen Mode Backdrop */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      <div className={isExpanded ? "fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 pointer-events-none" : "relative w-full h-full"}>
        <div className={`flex flex-col bg-[var(--color-settings-bg)] overflow-hidden pointer-events-auto transition-all duration-300 ease-out origin-center ${
          isExpanded ? "w-full max-w-[95vw] lg:max-w-6xl h-[90vh] rounded-[32px] shadow-2xl border border-[var(--color-settings-border)]" : "w-full h-full rounded-none border-0 bg-transparent"
        }`}>
          
          {/* Header */}
          <div className="bg-[var(--color-settings-card)] flex items-center justify-between border-b border-[var(--color-settings-border)] px-4 py-3 md:px-6">
            <div className="flex items-center gap-3">
              <BrunoAvatar mood={isProcessing ? 'thinking' : 'happy'} size={isExpanded ? "md" : "sm"} />
              <div>
                <h3 className={`font-sans font-bold text-[var(--color-settings-text)] ${isExpanded ? "text-base md:text-lg" : "text-base"}`}>Bruno</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`font-serif italic text-[var(--color-settings-brand)] ${isExpanded ? "text-sm md:text-base" : "text-sm"}`}>
                    {isProcessing ? 'Thinking by the fire...' : 'Your academic guide'}
                  </span>
                </div>
              </div>
            </div>

            {isExpanded ? (
              <div className="flex gap-2 items-center">
                <button 
                  onClick={() => setShowHistory(!showHistory)} 
                  className={`p-2.5 rounded-xl transition-colors ${showHistory ? 'bg-[var(--color-settings-brand)] text-white' : 'text-[var(--color-settings-text-muted)] hover:text-[var(--color-settings-text)] hover:bg-[var(--color-settings-card-hover)]'}`}
                  title="Past Chats"
                >
                  <ClockCounterClockwise weight="bold" className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsExpanded(false)} 
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--color-settings-card-hover)] hover:bg-[var(--color-settings-border)] text-[var(--color-settings-text)] rounded-xl transition-colors font-sans text-sm font-medium"
                >
                  <CaretLeft weight="bold" /> Back to Calendar
                </button>
              </div>
            ) : (
              <div className="flex gap-1 items-center">
                <button 
                  onClick={() => setShowHistory(!showHistory)} 
                  className={`p-2 rounded-lg transition-colors ${showHistory ? 'bg-[var(--color-settings-brand)] text-white' : 'text-[var(--color-settings-text-muted)] hover:text-[var(--color-settings-text)] hover:bg-[var(--color-settings-card-hover)]'}`}
                  title="Past Chats"
                >
                  <ClockCounterClockwise weight="bold" className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsExpanded(true)} 
                  className="p-2 text-[var(--color-settings-text-muted)] hover:text-[var(--color-settings-text)] transition-colors rounded-lg hover:bg-[var(--color-settings-card-hover)]" 
                  title="Enter Zen Mode"
                >
                  <ArrowsOutSimple weight="bold" className="w-5 h-5" />
                </button>
                <button 
                  type="button"
                  onClick={closeBruno} 
                  className="p-2 text-[var(--color-settings-text-muted)] hover:text-[var(--color-settings-text)] transition-colors rounded-lg hover:bg-[var(--color-settings-card-hover)]" 
                  title="Close Bruno"
                >
                  <X weight="bold" className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <BrunoContextBanner />

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
                  <div className={`flex items-center justify-between border-b border-[var(--color-settings-border)] ${isExpanded ? "p-6" : "p-4"}`}>
                    <h3 className={`font-sans font-bold text-[var(--color-settings-text)] ${isExpanded ? "text-lg" : "text-base"}`}>Recent Chats</h3>
                    <button onClick={startNewConversation} className="bg-[var(--color-settings-card-hover)] text-[var(--color-settings-text)] px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-[var(--color-settings-border)]">
                      <Plus weight="bold" /> New Chat
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {conversations.length === 0 ? (
                      <div className="text-center py-10 opacity-50 text-[#fdfbf7]">
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
                  <div className={`p-4 border-t border-[var(--color-settings-border)] ${isExpanded ? "px-6" : "px-4"}`}>
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
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide bg-[var(--color-settings-bg)] relative px-4 py-4 md:px-6 md:py-5"
            >
              {/* Subtle campfire glow at the bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[var(--color-settings-brand)]/5 to-transparent pointer-events-none" />
              
              <div className="mx-auto flex w-full max-w-[44rem] flex-col gap-5 relative z-10">
                <AnimatePresence initial={false}>
                  {messages.map((message, i) => {
                    const textPart = message.parts?.find(p => p.type === 'text')?.text || '';
                    const toolParts = message.parts?.filter(p => p.type === 'tool-invocation') || [];
                    const isEditing = editingMessageId === message.id;

                    // Check if any tool invocation is a propose_plan_draft
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const planDraftInvocation = toolParts.find((t: any) =>
                      t.toolInvocation?.toolName === 'propose_plan_draft'
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ) as any;

                    const planDraftArgs = planDraftInvocation?.toolInvocation?.args;
                    const isPlanDraft = !!planDraftArgs?.plan_title;
                    
                    const nativeProposals = extractProposalsFromMessage(message);
                    const fallbackProposals = fallbackProposalsByMessageId[message.id] ?? [];
                    const proposals = nativeProposals.length > 0 ? nativeProposals : fallbackProposals;
                    const hasProposals = proposals.length > 0;
                    const displayText = hasProposals && textPart.length < 50
                      ? "I've drafted a plan based on your request. Confirm the tasks you want me to add."
                      : textPart;
                    
                    return (
                      <motion.div
                        key={message.id || i}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                        className={`flex relative z-10 gap-2 items-end ${message.role === 'user' ? 'justify-end group' : 'justify-start'}`}
                      >
                        {/* If this is a plan draft, render the interactive card */}
                        {isPlanDraft ? (
                          <div className="w-full max-w-[44rem] flex flex-col gap-3">
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
                                    currentContext
                                  )
                                });
                                setTimeout(() => setIsCommittingPlan(false), 10000);
                              }}
                              onRequestEdit={(feedback) => {
                                setInput(feedback);
                              }}
                            />
                            {(textPart || hasProposals) && (
                              <div className="w-full">
                                {textPart && (
                                  <div className="w-full rounded-2xl border border-[var(--color-settings-border)] bg-[var(--color-settings-card)]/60 px-4 py-3 md:px-5 text-[15px] leading-7 text-[var(--color-settings-text)]">
                                    <div className="bruno-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{textPart}</ReactMarkdown></div>
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
                              <div className={`max-w-[min(80%,36rem)] rounded-2xl bg-[var(--color-settings-brand)]/20 px-4 py-2.5 text-[15px] leading-6 text-[var(--color-settings-text)] ${isEditing ? 'opacity-50' : ''}`}>
                                <p>{textPart}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="mr-auto max-w-[min(90%,44rem)] rounded-2xl border border-[var(--color-settings-border)] bg-[var(--color-settings-card)]/60 px-4 py-3 text-[15px] leading-7 text-[var(--color-settings-text)] md:px-5">
                              <div className="w-full">
                                <div className="bruno-markdown max-w-none text-[15px] text-[var(--color-settings-text)]">
                                  {toolParts.length > 0 && !planDraftInvocation && !hasProposals && (
                                    <div className="text-xs text-amber-500/80 mb-2 font-mono uppercase tracking-wider">
                                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                      {toolParts.map((t: any) => t.toolInvocation?.toolName).join(', ')}...
                                    </div>
                                  )}
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{displayText}</ReactMarkdown>
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
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </motion.div>
                    );
                  })}
                  {isWaitingForFirstToken && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                      className="flex relative z-10 justify-start"
                    >
                      <div className="mr-auto max-w-[min(90%,44rem)] rounded-2xl border border-[var(--color-settings-border)] bg-[var(--color-settings-card)]/60 px-4 py-3 text-[15px] leading-7 text-[var(--color-settings-text)] md:px-5">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-[var(--color-settings-text-muted)] rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-1.5 h-1.5 bg-[var(--color-settings-text-muted)] rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-1.5 h-1.5 bg-[var(--color-settings-text-muted)] rounded-full animate-bounce" />
                          </div>
                          <span className="font-sans font-medium text-[var(--color-settings-text-muted)] ml-1 text-sm">( {loadingPhrase} )</span>
                        </div>
                      </div>
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
            </div>
          </div>

          <form 
            onSubmit={handleSubmit} 
            className="bg-[var(--color-settings-card)]/85 backdrop-blur-xl border-t border-[var(--color-settings-border)] px-4 py-3 md:px-6 md:py-4 relative z-20"
          >
            <div className="mx-auto w-full max-w-[44rem] relative">
              <BrunoSuggestedActions
                onSelectAction={(prompt) => {
                  void submitPrompt(prompt);
                }}
              />
              
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
                  disabled={isExternalProcessing}
                  placeholder={editingMessageId ? "Edit your message..." : (isProcessing ? "Bruno is working..." : "Ask Bruno anything...")}
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
                  className={`w-full bg-[var(--color-settings-bg)] border border-[var(--color-settings-border)] rounded-xl text-[var(--color-settings-text)] placeholder:text-[var(--color-settings-text-muted)] focus:outline-none focus:border-[var(--color-settings-brand)] transition-[border-color,box-shadow] focus:shadow-[0_4px_16px_-8px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.05)] resize-none ${
                    isExpanded ? "py-4 pl-5 pr-14 text-[16px] min-h-[64px]" : "py-3 pl-4 pr-12 text-[14px] min-h-[52px]"
                  } max-h-[250px] leading-relaxed`}
                />
                {isChatGenerating ? (
                  <button
                    type="button"
                    onClick={() => stop()}
                    className={`absolute rounded-lg transition-all cursor-pointer bg-red-500/80 hover:bg-red-500 text-white ${
                      isExpanded ? "right-3 bottom-3 p-2.5" : "right-2 bottom-2 p-2"
                    }`}
                    title="Stop generation"
                  >
                    <Stop weight="fill" className={isExpanded ? "w-5 h-5" : "w-4 h-4"} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim() || isProcessing}
                    className={`absolute bg-[var(--color-settings-brand)] hover:opacity-90 text-white rounded-lg transition-all disabled:opacity-50 disabled:bg-[var(--color-settings-card-hover)] disabled:text-[var(--color-settings-text-muted)] cursor-pointer ${
                      isExpanded ? "right-3 bottom-3 p-2.5" : "right-2 bottom-2 p-2"
                    }`}
                    title="Send message"
                  >
                    <PaperPlaneTilt className={isExpanded ? "w-5 h-5" : "w-4 h-4"} />
                  </button>
                )}
              </div>
              <p className={`mt-2 font-mono tracking-widest uppercase text-[var(--color-settings-text-muted)] text-center ${isExpanded ? "text-xs" : "text-[10px]"}`}>
                Shift + Enter for new line
              </p>
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
                  className="flex-1 py-2.5 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
