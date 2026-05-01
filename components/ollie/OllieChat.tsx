'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import OllieAvatar from './OllieAvatar';
import { PaperPlaneTilt, X, ChatTeardropDots, Minus } from '@phosphor-icons/react';

interface Message {
  role: 'user' | 'ollie';
  content: string;
}

export default function OllieChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ollie', content: "Systems online. Ready for tactical support, Pilot. How can I help you clear the deck today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }].map(m => ({
            role: m.role === 'ollie' ? 'assistant' : 'user',
            content: m.content
          }))
        }),
      });

      const data = await response.json();
      
      if (response.status === 403) {
        setShowPaywall(true);
        return;
      }

      if (data.text) {
        setMessages(prev => [...prev, { role: 'ollie', content: data.text }]);
      } else {
        throw new Error(data.error || 'Connection lost');
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ollie', content: "Sorry Pilot, I hit some signal interference. Could you repeat that?" }]);
    } finally {
      setLoading(false);
    }
  };

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
    <div className="fixed bottom-6 right-6 w-[350px] sm:w-[400px] h-[500px] bg-white border-4 border-surface-900 shadow-[12px_12px_0px_0px_var(--accent-500)] flex flex-col z-50 animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="bg-surface-900 p-4 flex items-center justify-between border-b-2 border-surface-900">
        <div className="flex items-center gap-3">
          <OllieAvatar mood={loading ? "thinking" : "happy"} size="sm" />
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Ollie Navigator</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[8px] font-black text-surface-400 uppercase tracking-widest">Active Link</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsOpen(false)} className="text-surface-400 hover:text-white p-1">
            <Minus weight="bold" size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-50 custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`
              max-w-[85%] p-3 text-xs font-bold leading-relaxed
              ${m.role === 'user' 
                ? 'bg-brand-600 text-white rounded-2xl rounded-tr-none border-2 border-brand-700' 
                : 'bg-white text-surface-900 rounded-2xl rounded-tl-none border-2 border-surface-900 shadow-[4px_4px_0px_0px_var(--surface-900)]'
              }
            `}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-2xl rounded-tl-none border-2 border-surface-900 shadow-[4px_4px_0px_0px_var(--surface-900)]">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
      <form onSubmit={handleSend} className="p-4 bg-white border-t-2 border-surface-900 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Request tactical support..."
          className="flex-1 bg-surface-100 border-2 border-surface-900 px-4 py-2 text-xs font-bold uppercase placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="bg-surface-900 text-surface-100 p-2 border-2 border-surface-900 hover:bg-accent-500 hover:text-surface-900 disabled:opacity-50 transition-all active:translate-x-0.5 active:translate-y-0.5"
        >
          <PaperPlaneTilt weight="bold" size={20} />
        </button>
      </form>
    </div>
  );
}
