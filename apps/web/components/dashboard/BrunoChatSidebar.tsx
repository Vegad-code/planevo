'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PaperPlaneTilt, ArrowsOutSimple, CaretLeft } from '@phosphor-icons/react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import ReactMarkdown from 'react-markdown';
import BrunoAvatar from '../bruno/BrunoAvatar';

interface Message {
  role: 'user' | 'bruno';
  content: string;
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

interface BrunoChatSidebarProps {
  onFinish?: () => void;
  isProcessing: boolean;
  initialMessage?: string;
  assignmentId?: string;
}

export default function BrunoChatSidebar({ 
  onFinish, 
  isProcessing: isExternalProcessing, 
  initialMessage, 
  assignmentId 
}: BrunoChatSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [loadingPhrase, setLoadingPhrase] = useState(LOADING_PHRASES[0]);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { messages, setMessages, sendMessage, status, error } = useChat({
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
    onFinish: () => {
      if (onFinish) onFinish();
    }
  });

  const isProcessing = isExternalProcessing || status === 'streaming' || status === 'submitted';

  const isWaitingForFirstToken = isProcessing && (
    messages.length === 0 ||
    messages[messages.length - 1]?.role === 'user' ||
    (messages[messages.length - 1]?.role === 'assistant' && 
     !(messages[messages.length - 1].parts?.some((p: any) => p.type === 'text' && p.text.length > 0)) &&
     !(messages[messages.length - 1].parts?.some((p: any) => p.type === 'tool-invocation')))
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isExpanded]);

  // Update messages when initialMessage changes (context switch)
  useEffect(() => {
    if (initialMessage) {
      setMessages([{ 
        id: 'init',
        role: 'assistant', 
        parts: [{ type: 'text', text: initialMessage }] 
      } as UIMessage]);
    }
  }, [initialMessage, assignmentId, setMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    sendMessage({ text: input.trim() }, {
      body: { diagnostics: true }
    });
    setInput('');
    setLoadingPhrase(LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)]);
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

      <div className={isExpanded ? "fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 pointer-events-none" : "relative w-full"}>
        <div className={`flex flex-col bg-[#2c221a] overflow-hidden border border-[#3e3227] pointer-events-auto transition-all duration-300 ease-out origin-center ${
          isExpanded ? "w-full max-w-4xl h-[85vh] rounded-[32px] shadow-2xl" : "w-full h-[600px] rounded-[22px] shadow-lg"
        }`}>
          {/* Header */}
          <div className={`bg-[#2c221a] flex items-center justify-between border-b border-[#3e3227] transition-all ${isExpanded ? "p-6" : "p-4"}`}>
            <div className="flex items-center gap-3">
              <BrunoAvatar mood={isProcessing ? 'thinking' : 'happy'} size={isExpanded ? "md" : "sm"} />
              <div>
                <h3 className={`font-sans font-bold text-[#fdfbf7] ${isExpanded ? "text-lg" : "text-base"}`}>Bruno</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`font-serif italic text-[var(--color-belly)] ${isExpanded ? "text-base" : "text-sm"}`}>
                    {isProcessing ? 'Thinking by the fire...' : 'Your academic guide'}
                  </span>
                </div>
              </div>
            </div>

            {isExpanded ? (
              <button 
                onClick={() => setIsExpanded(false)} 
                className="flex items-center gap-2 px-4 py-2.5 bg-[#3e3227] hover:bg-[#4a3f32] text-[#fdfbf7] rounded-xl transition-colors font-sans text-sm font-medium"
              >
                <CaretLeft weight="bold" /> Back to Calendar
              </button>
            ) : (
              <button 
                onClick={() => setIsExpanded(true)} 
                className="p-2 text-[#fdfbf7]/60 hover:text-[#fdfbf7] transition-colors rounded-lg hover:bg-[#3e3227]" 
                title="Enter Zen Mode"
              >
                <ArrowsOutSimple weight="bold" className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Messages Area */}
          <div 
            ref={scrollRef}
            className={`flex-1 overflow-y-auto space-y-6 scrollbar-hide bg-[var(--color-paper)] relative transition-all ${isExpanded ? "p-8 md:p-12" : "p-4"}`}
          >
            {/* Subtle campfire glow at the bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[var(--color-honey)]/5 to-transparent pointer-events-none" />
            
            <AnimatePresence initial={false}>
              {messages.map((message, i) => {
                const textPart = message.parts?.find(p => p.type === 'text')?.text || '';
                const toolParts = message.parts?.filter(p => p.type === 'tool-invocation') || [];
                
                return (
                  <motion.div
                    key={message.id || i}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex relative z-10 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-[16px] px-4 py-3 ${
                      message.role === 'user' 
                        ? 'bg-[#2c221a] text-[#fdfbf7] rounded-tr-none font-medium' 
                        : 'bg-white text-[#2c221a] border border-[#E8DCC0] rounded-tl-none'
                    }`}>
                      {message.role === 'user' ? (
                        <p className={isExpanded ? "text-[15px]" : "text-[13.5px]"}>{textPart}</p>
                      ) : (
                        <div className={`prose prose-sm max-w-none leading-relaxed ${isExpanded ? "text-[15px]" : "text-[13.5px]"}`}>
                          {toolParts.length > 0 && (
                            <div className="text-xs text-amber-500/80 mb-2 font-mono uppercase tracking-wider">
                              {toolParts.map((t: any) => t.toolInvocation?.toolName).join(', ')}...
                            </div>
                          )}
                          <ReactMarkdown>{textPart}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              {isWaitingForFirstToken && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="flex relative z-10 justify-start"
                >
                  <div className="bg-white px-4 py-3 rounded-[16px] rounded-tl-none border border-[#E8DCC0] shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-[#2c221a]/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 bg-[#2c221a]/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 bg-[#2c221a]/40 rounded-full animate-bounce" />
                      </div>
                      <span className={`font-sans font-medium text-[#2c221a]/60 ml-1 ${isExpanded ? "text-[14px]" : "text-[12.5px]"}`}>( {loadingPhrase} )</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <form onSubmit={handleSubmit} className={`bg-[#2c221a] border-t border-[#3e3227] transition-all ${isExpanded ? "p-6" : "p-4"}`}>
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isProcessing}
                placeholder={isProcessing ? "Bruno is working..." : "Ask Bruno anything..."}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                rows={Math.min(5, input.split('\n').length || 1)}
                className={`w-full bg-black/20 border border-[#3e3227] rounded-xl text-[#fdfbf7] placeholder:text-[#fdfbf7]/40 focus:outline-none focus:border-[#fdfbf7]/30 transition-all resize-none ${
                  isExpanded ? "py-4 pl-5 pr-14 text-[15px] min-h-[60px]" : "py-3 pl-4 pr-12 text-[13.5px] min-h-[50px]"
                } max-h-[200px]`}
              />
              <button
                type="submit"
                disabled={!input.trim() || isProcessing}
                className={`absolute bg-[#fdfbf7] hover:bg-[#f4ebe1] text-[#2c221a] rounded-lg transition-all disabled:opacity-50 disabled:bg-[#fdfbf7]/10 disabled:text-[#fdfbf7]/30 cursor-pointer ${
                  isExpanded ? "right-3 bottom-3 p-2.5" : "right-2 bottom-2 p-2"
                }`}
              >
                <PaperPlaneTilt className={isExpanded ? "w-5 h-5" : "w-4 h-4"} />
              </button>
            </div>
            <p className={`mt-2 font-mono tracking-widest uppercase text-[#fdfbf7]/40 text-center ${isExpanded ? "text-xs" : "text-[10px]"}`}>
              Shift + Enter for new line
            </p>
          </form>
        </div>
      </div>
    </>
  );
}
