'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import OllieAvatar from './OllieAvatar';
import { createClient } from '@/lib/supabase/client';
import { PaperPlaneTilt, Minus, ArrowsOut, ArrowsIn, ClockCounterClockwise, Plus, Trash } from '@phosphor-icons/react';
import ReactMarkdown from 'react-markdown';
import {
  buildChatClientLatencyDiagnostic,
  reportChatLatencyDiagnostic,
} from '@/lib/diagnostics/clientLatency';

interface Message {
  role: 'user' | 'ollie';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  last_active: string;
}

type ChatResponseBody = {
  text?: string;
  error?: string;
  diagnostic?: Parameters<typeof buildChatClientLatencyDiagnostic>[0]['server'];
};

export default function OllieChat() {
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ollie', content: "Systems online. Ready for tactical support, Pilot. How can I help you clear your schedule today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const handleDeconstruct = (e: any) => {
      const { name } = e.detail;
      setIsOpen(true);
      setInput(`Deconstruct assignment: "${name}". Break it into manageable steps.`);
    };

    window.addEventListener('ollie-deconstruct', handleDeconstruct);
    fetchConversations();
    return () => window.removeEventListener('ollie-deconstruct', handleDeconstruct);
  }, []);

  const fetchConversations = async () => {
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

    if (data) setConversations(data);
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([{ role: 'ollie', content: "Systems online. Ready for tactical support, Pilot. How can I help you clear your schedule today?" }]);
    setShowHistory(false);
  };

  const loadConversation = async (id: string) => {
    setCurrentConversationId(id);
    setShowHistory(false);
    setLoading(true);

    const { data } = await supabase
      .from('ollie_messages')
      .select('content, message_type')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data.map(m => ({
        role: m.message_type === 'user' ? 'user' : 'ollie',
        content: m.content
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const clickAt = performance.now();
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

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

      // Save user message
      if (convId) {
        await supabase.from('ollie_messages').insert({
          conversation_id: convId,
          message_type: 'user',
          content: userMessage,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });
      }

      const requestStartedAt = performance.now();
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnostics: true,
          messages: [...messages, { role: 'user', content: userMessage }].map(m => ({
            role: m.role === 'ollie' ? 'assistant' : 'user',
            content: m.content
          }))
        }),
      });
      const responseReceivedAt = performance.now();

      const data = await response.json() as ChatResponseBody;
      const parsedAt = performance.now();
      
      if (response.status === 403) {
        setShowPaywall(true);
        return;
      }

      if (data.text) {
        const ollieResponse = data.text;
        setMessages(prev => [...prev, { role: 'ollie', content: ollieResponse }]);
        
        // Save Ollie message
        if (convId) {
          await supabase.from('ollie_messages').insert({
            conversation_id: convId,
            message_type: 'assistant',
            content: ollieResponse,
            user_id: (await supabase.auth.getUser()).data.user?.id
          });
          // Update last active
          await supabase.from('chat_conversations').update({ last_active: new Date().toISOString() }).eq('id', convId);
        }
        const answerReadyAt = performance.now();
        reportChatLatencyDiagnostic(buildChatClientLatencyDiagnostic({
          clickAt,
          requestStartedAt,
          responseReceivedAt,
          parsedAt,
          answerReadyAt,
          server: data.diagnostic,
        }));
      } else {
        throw new Error(data.error || 'Connection lost');
      }
    } catch {
      setMessages(prev => [...prev, { role: 'ollie', content: "Sorry Pilot, I hit some signal interference. Could you repeat that?" }]);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-surface-900 text-surface-100 rounded-full flex items-center justify-center border-4 border-surface-900 shadow-[6px_6px_0px_0px_var(--accent-500)] hover:scale-105 active:scale-95 transition-all z-50 group"
      >
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent-500 rounded-full border-2 border-surface-900 animate-bounce" />
        <OllieAvatar mood="happy" size="md" />
        <div className="absolute right-20 bg-surface-900 text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border-2 border-surface-900">
          Tactical Support
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
          <OllieAvatar mood={loading ? "thinking" : "happy"} size="sm" />
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Ollie Navigator</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[8px] font-black text-[#888] uppercase tracking-widest">
                {currentConversationId ? 'MISSION ACTIVE' : 'STANDBY MODE'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowHistory(!showHistory)} 
            className={`p-1.5 rounded transition-colors ${showHistory ? 'bg-accent-500 text-surface-900' : 'text-[#888] hover:text-white'}`}
            title="Mission History"
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
            <h4 className="text-xs font-black text-white uppercase tracking-widest">Mission Logs</h4>
            <button onClick={startNewConversation} className="bg-accent-500 text-surface-900 p-1.5 rounded flex items-center gap-2 text-[10px] font-black uppercase">
              <Plus weight="bold" /> New Link
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {conversations.length === 0 ? (
              <div className="text-center py-10 opacity-30">
                <p className="text-[10px] font-black text-white uppercase tracking-widest">No Logged Missions</p>
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
            Close Logs
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#121212] custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`
              max-w-[85%] p-3 text-xs font-bold leading-relaxed
              ${m.role === 'user' 
                ? 'bg-brand-600 text-white rounded-2xl rounded-tr-none border-2 border-[#121212]' 
                : 'bg-white text-black rounded-2xl rounded-tl-none border-2 border-[#121212] shadow-[4px_4px_0px_0px_#000]'
              }
            `}>
              <div className="prose prose-invert prose-xs max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-accent-600">
                <ReactMarkdown>
                  {m.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-2xl rounded-tl-none border-2 border-[#121212] shadow-[4px_4px_0px_0px_#000]">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-[#888] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-[#888] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-[#888] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
                Your tactical support link is at capacity. Upgrade to Elite for 200+ daily missions and full priority.
              </p>
              <div className="flex flex-col gap-3">
                <Link 
                  href="/pricing"
                  className="bg-brand-600 text-white py-3 px-4 text-[10px] font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-[4px_4px_0px_0px_var(--surface-900)] active:translate-x-0.5 active:translate-y-0.5"
                >
                  Upgrade to Elite
                </Link>
                <button 
                  onClick={() => setShowPaywall(false)}
                  className="text-[10px] font-black uppercase tracking-widest text-surface-400 hover:text-surface-900 transition-colors"
                >
                  Maybe later, Pilot
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
          onChange={(e) => setInput(e.target.value)}
          placeholder="Request tactical support..."
          className="flex-1 bg-white border-2 border-[#121212] px-4 py-2 text-xs font-bold uppercase text-black placeholder:text-[#888] focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="bg-[#121212] text-white p-2 border-2 border-[#121212] hover:bg-accent-500 hover:text-black disabled:opacity-50 transition-all active:translate-x-0.5 active:translate-y-0.5"
        >
          <PaperPlaneTilt weight="bold" size={20} />
        </button>
      </form>
    </div>
  );
}
