/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import BrunoAvatar from './BrunoAvatar';
import { createClient } from '@/lib/supabase/client';
import { PaperPlaneTilt, Minus, ArrowsOut, ArrowsIn, ClockCounterClockwise, Plus } from '@phosphor-icons/react';
import ReactMarkdown from 'react-markdown';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';

interface Conversation {
  id: string;
  title: string;
  last_active: string;
}

const LOADING_PHRASES = [
  "Thinking...",
  "Calculating...",
  "Manifesting...",
  "Brewing...",
  "Solving...",
  "Vibing...",
  "Cooking..."
];

export default function BrunoChat() {
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSuppressed, setIsSuppressed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState(LOADING_PHRASES[0]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState('');
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value);

  // useChat replaces manual message state and manual fetching
  const { messages, setMessages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai/chat',
    }),
    messages: [
      { id: 'init', role: 'assistant', parts: [{ type: 'text', text: "Hello! I'm ready to help you clear your schedule. What should we focus on today?" }] } as UIMessage
    ],
    onFinish: async (event) => {
      const message = (event as any).message || event;
      const textPart = message.parts?.find((p: any) => p.type === 'text')?.text;
      
      // Persist Bruno's final response to Supabase when the stream completes
      if (currentConversationId && message.role === 'assistant' && textPart) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await (supabase as any).from('bruno_messages').insert({
            conversation_id: currentConversationId,
            message_type: 'assistant',
            content: textPart,
            user_id: user.id
          });
          await (supabase as any).from('chat_conversations').update({ last_active: new Date().toISOString() }).eq('id', currentConversationId);
        }
      }
    }
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  const isWaitingForFirstToken = isLoading && (
    messages.length === 0 ||
    messages[messages.length - 1]?.role === 'user' ||
    (messages[messages.length - 1]?.role === 'assistant' && 
     !(messages[messages.length - 1].parts?.some((p: any) => p.type === 'text' && p.text.length > 0)) &&
     !(messages[messages.length - 1].parts?.some((p: any) => p.type.startsWith('tool-'))))
  );

  useEffect(() => {
    if (error?.message?.includes('403') || error?.message?.includes('429')) {
      setShowPaywall(true);
    }
  }, [error]);

  useEffect(() => {
    requestAnimationFrame(() => {
      setMounted(true);
    });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Auto-cleanup: Delete conversations older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    await supabase
      .from('chat_conversations')
      .delete()
      .eq('user_id', user.id)
      .lt('last_active', thirtyDaysAgo.toISOString());

    const { data } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('last_active', { ascending: false });

    if (data) setConversations(data as Conversation[]);
  }, [supabase]);

  useEffect(() => {
    const handleDeconstruct = (e: Event) => {
      const customEvent = e as CustomEvent<{ name: string }>;
      const { name } = customEvent.detail;
      setIsOpen(true);
      setInput(`Deconstruct assignment: "${name}". Break it into manageable steps.`);
    };

    const handleOpen = () => setIsOpen(true);
    const handleSuppress = (e: Event) => {
      const customEvent = e as CustomEvent<{ suppressed: boolean }>;
      setIsSuppressed(customEvent.detail.suppressed);
    };

    window.addEventListener('bruno-deconstruct', handleDeconstruct);
    window.addEventListener('open-bruno-chat', handleOpen);
    window.addEventListener('bruno-suppress', handleSuppress);
    
    requestAnimationFrame(() => {
      void fetchConversations();
    });
    return () => {
      window.removeEventListener('bruno-deconstruct', handleDeconstruct);
      window.removeEventListener('open-bruno-chat', handleOpen);
      window.removeEventListener('bruno-suppress', handleSuppress);
    };
  }, [fetchConversations, setInput]);

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([{ id: 'init', role: 'assistant', parts: [{ type: 'text', text: "Hello! I'm ready to help you clear your schedule. What should we focus on today?" }] } as UIMessage]);
    setShowHistory(false);
  };

  const loadConversation = async (id: string) => {
    setCurrentConversationId(id);
    setShowHistory(false);

    const { data } = await supabase
      .from('bruno_messages')
      .select('content, message_type')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data.map((m, i) => ({
        id: `msg-${id}-${i}`,
        role: m.message_type === 'user' ? 'user' : 'assistant',
        parts: [{ type: 'text', text: m.content }]
      } as UIMessage)));
    }
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setLoadingPhrase(LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)]);

    try {
      let convId = currentConversationId;

      // Create conversation if it doesn't exist
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
          }
        }
      }

      // Save user message to Supabase
      if (convId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await (supabase as any).from('bruno_messages').insert({
            conversation_id: convId,
            message_type: 'user',
            content: userMessage,
            user_id: user.id
          });
        }
      }

      // Trigger the stream
      sendMessage({ text: userMessage }, {
        body: { diagnostics: true, conversationId: convId }
      });
      
    } catch (err) {
      console.error("Failed to start chat stream:", err);
      setMessages(prev => [...prev, { id: 'err', role: 'assistant', parts: [{ type: 'text', text: "Sorry, I hit a slight connection issue. Could you repeat that?" }] } as UIMessage]);
    }
  };

  if (!mounted || isSuppressed) return null;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-surface-900 text-surface-100 rounded-full flex items-center justify-center border-4 border-surface-900 shadow-[6px_6px_0px_0px_var(--accent-500)] hover:scale-105 active:scale-95 transition-all z-50 group"
      >
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent-500 rounded-full border-2 border-surface-900 animate-bounce" />
        <BrunoAvatar mood="happy" size="md" />
        <div className="absolute right-20 bg-surface-900 text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border-2 border-surface-900">
          Bruno Assistant
        </div>
      </button>
    );
  }

  return (
    <div className={`
      fixed bottom-6 right-6 bg-white border-4 border-surface-900 shadow-[12px_12px_0px_0px_var(--accent-500)] flex flex-col z-50 animate-in slide-in-from-bottom-4 duration-300
      ${isExpanded ? 'w-[90vw] h-[80vh] sm:w-[800px] left-[5vw] sm:left-auto' : 'w-[350px] sm:w-[400px] h-[500px]'}
    `}>
      {/* Header */}
      <div className="bg-[#121212] p-4 flex items-center justify-between border-b-4 border-[#121212]">
        <div className="flex items-center gap-3">
          <BrunoAvatar mood={isLoading ? "thinking" : "happy"} size="sm" />
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Bruno Assistant</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[8px] font-black text-[#888] uppercase tracking-widest">
                {currentConversationId ? 'ACTIVE' : 'READY'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowHistory(!showHistory)} 
            className={`p-1.5 rounded transition-colors ${showHistory ? 'bg-accent-500 text-surface-900' : 'text-[#888] hover:text-white'}`}
            title="Chat History"
          >
            <ClockCounterClockwise weight="bold" size={20} />
          </button>
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            className="text-[#888] hover:text-white p-1.5"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ArrowsIn weight="bold" size={20} /> : <ArrowsOut weight="bold" size={20} />}
          </button>
          <button onClick={() => setIsOpen(false)} className="text-[#888] hover:text-white p-1.5">
            <Minus weight="bold" size={20} />
          </button>
        </div>
      </div>

      {/* History View Overlay */}
      {showHistory && (
        <div className="absolute inset-0 z-30 bg-surface-900 flex flex-col animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="p-4 border-b border-surface-700 flex items-center justify-between">
            <h4 className="text-xs font-black text-white uppercase tracking-widest">Recent Chats</h4>
            <button onClick={startNewConversation} className="bg-accent-500 text-surface-900 p-1.5 rounded flex items-center gap-2 text-[10px] font-black uppercase">
              <Plus weight="bold" /> New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {conversations.length === 0 ? (
              <div className="text-center py-10 opacity-30">
                <p className="text-[10px] font-black text-white uppercase tracking-widest">No Recent Chats</p>
              </div>
            ) : (
              conversations.map(c => (
                <button 
                  key={c.id} 
                  onClick={() => loadConversation(c.id)}
                  className="w-full p-3 text-left bg-surface-800 hover:bg-surface-700 border border-surface-700 transition-colors group"
                >
                  <p className="text-[10px] font-bold text-white truncate">{c.title}</p>
                  <p className="text-[8px] font-black text-surface-500 uppercase mt-1">
                    {new Date(c.last_active).toLocaleDateString()}
                  </p>
                </button>
              ))
            )}
          </div>
          <button 
            onClick={() => setShowHistory(false)}
            className="p-4 text-[10px] font-black text-surface-400 hover:text-white uppercase tracking-widest border-t border-surface-700"
          >
            Close Chats
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#121212] custom-scrollbar">
        {messages.filter(m => m.role === 'user' || m.role === 'assistant').map((m, i) => {
          const textPart = (m.parts?.find(p => p.type === 'text') as any)?.text;
          const toolParts = m.parts?.filter(p => p.type.startsWith('tool-'));

          // Hide empty intermediate messages (e.g., system messages without content or tools)
          if (!textPart && (!toolParts || toolParts.length === 0)) return null;

          return (
            <div key={i} className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              
              {/* Tool Execution indicators */}
              {toolParts && toolParts.length > 0 && (
                <div className="flex flex-col gap-1 items-start w-full mb-2">
                   {toolParts.map((tool: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 bg-surface-800 text-surface-400 px-3 py-1.5 rounded-full text-[10px] uppercase font-black tracking-widest border border-surface-700 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                        {(tool.state === 'input-streaming' || tool.state === 'input-available') && <div className="w-1.5 h-1.5 bg-accent-500 rounded-full animate-ping" />}
                        {tool.state === 'output-available' && <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />}
                        {(tool.state === 'input-streaming' || tool.state === 'input-available') ? 'Executing Tool...' : 'Tool Completed'}
                      </div>
                   ))}
                </div>
              )}

              {/* Text Bubble */}
              {textPart && (
                <div className={`
                  max-w-[85%] p-3 text-xs font-bold leading-relaxed
                  ${m.role === 'user' 
                    ? 'bg-brand-600 text-white rounded-2xl rounded-tr-none border-2 border-[#121212]' 
                    : 'bg-white text-black rounded-2xl rounded-tl-none border-2 border-[#121212] shadow-[4px_4px_0px_0px_#000]'
                  }
                `}>
                  <div className="prose prose-invert prose-xs max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-accent-600">
                    <ReactMarkdown>
                      {textPart}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

            </div>
          );
        })}
        {isWaitingForFirstToken && (
          <div className="flex justify-start animate-in fade-in duration-200">
            <div className="bg-white p-3 rounded-2xl rounded-tl-none border-2 border-[#121212] shadow-[4px_4px_0px_0px_#000]">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-accent-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-accent-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-accent-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-[#888] ml-1">( {loadingPhrase} )</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />

        {/* Big Fat Paywall Overlay */}
        {showPaywall && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-surface-900/90 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white border-4 border-surface-900 p-6 shadow-[8px_8px_0px_0px_var(--accent-500)] text-center">
              <div className="text-4xl mb-4 animate-bounce">💎</div>
              <h4 className="text-sm font-black uppercase tracking-widest text-surface-900 mb-2">Daily Quota Reached</h4>
              <p className="text-[10px] font-bold text-surface-500 uppercase leading-relaxed mb-6">
                Your daily AI usage is at capacity. Upgrade to Premium for unlimited requests and full priority.
              </p>
              <div className="flex flex-col gap-3">
                <Link 
                  href="/pricing"
                  className="bg-brand-600 text-white py-3 px-4 text-[10px] font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-[4px_4px_0px_0px_var(--surface-900)] active:translate-x-0.5 active:translate-y-0.5"
                >
                  Upgrade to Premium
                </Link>
                <button 
                  onClick={() => setShowPaywall(false)}
                  className="text-[10px] font-black uppercase tracking-widest text-surface-400 hover:text-surface-900 transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t-4 border-[#121212] flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Ask Bruno anything..."
          className="flex-1 bg-white border-2 border-[#121212] px-4 py-2 text-xs font-bold uppercase text-black placeholder:text-[#888] focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-[#121212] text-white p-2 border-2 border-[#121212] hover:bg-accent-500 hover:text-black disabled:opacity-50 transition-all active:translate-x-0.5 active:translate-y-0.5"
        >
          <PaperPlaneTilt weight="bold" size={20} />
        </button>
      </form>
    </div>
  );
}
