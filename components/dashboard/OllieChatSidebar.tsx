'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send } from 'lucide-react';
import OllieAvatar from '../ollie/OllieAvatar';

interface Message {
  role: 'user' | 'ollie';
  content: string;
}

interface OllieChatSidebarProps {
  onCommand: (message: string) => Promise<string | null>;
  isProcessing: boolean;
}

export default function OllieChatSidebar({ onCommand, isProcessing }: OllieChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ollie', content: "Hey! I've drafted your daily plan. Need to change anything? Just say the word." }
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');

    const response = await onCommand(userMsg);
    if (response) {
      setMessages(prev => [...prev, { role: 'ollie', content: response }]);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-surface-900 rounded-3xl overflow-hidden border-4 border-surface-800 shadow-2xl">
      {/* Header */}
      <div className="p-4 bg-surface-800 flex items-center gap-3 border-b border-surface-700">
        <OllieAvatar mood={isProcessing ? 'thinking' : 'happy'} size="sm" />
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Ollie Intelligence</h3>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="text-[10px] text-surface-400 font-bold uppercase">
              {isProcessing ? 'Analyzing schedule...' : 'Active & Ready'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-[radial-gradient(circle_at_50%_0%,rgba(50,50,50,1)_0%,rgba(20,20,20,1)_100%)]"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] p-3 rounded-2xl text-sm font-medium ${
                msg.role === 'user' 
                  ? 'bg-brand-600 text-white rounded-tr-none' 
                  : 'bg-surface-800 text-surface-100 border border-surface-700 rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </motion.div>
          ))}
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-surface-800 p-3 rounded-2xl rounded-tl-none border border-surface-700">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-surface-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-surface-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-surface-500 rounded-full animate-bounce" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 bg-surface-800 border-t border-surface-700">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Adjust my schedule..."
            className="w-full bg-surface-900 border-2 border-surface-700 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:bg-surface-700"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-2 text-[10px] text-surface-500 text-center uppercase font-bold tracking-tighter">
          Voice commands coming soon
        </p>
      </form>
    </div>
  );
}
