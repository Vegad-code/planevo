'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef, useState } from 'react';

export default function Chat() {
  const [input, setInput] = useState('');
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value);

  // Extract error and stop alongside core streaming primitives
  {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
  const { messages, sendMessage, status, error, stop, regenerate } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    onError: (err) => {
      console.error('Frontend Stream Interruption:', err);
    },
  });
  
  const isLoading = status === 'submitted' || status === 'streaming';
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput('');
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 60;
    setIsAtBottom(isNearBottom);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container && isAtBottom) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isAtBottom]);

  return (
    <div className="flex flex-col h-[650px] w-full max-w-2xl mx-auto border rounded-xl overflow-hidden bg-white shadow-md border-gray-200">
      
      {/* Scrollable Conversation Stream */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth bg-gray-50/50"
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {messages.map((m: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const textPart = (m.parts?.find((p: any) => p.type === 'text') as any)?.text || m.content || '';
          return (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
              m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-900 border border-gray-100 rounded-bl-none'
            }`}>
              <div className="font-semibold text-[10px] uppercase tracking-wider mb-1 opacity-60">
                {m.role === 'user' ? 'You' : 'Assistant'}
              </div>
              
              <div className="text-sm leading-relaxed space-y-2">
                {textPart.split('\n').map((paragraph: string, index: number) => {
                  const formatBold = (text: string) => {
                    const parts = text.split(/(\*\*.*?\*\*)/g);
                    return parts.map((part, i) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={i} className="font-bold text-current">{part.slice(2, -2)}</strong>;
                      }
                      return part;
                    });
                  };

                  if (paragraph.trim().startsWith('* ')) {
                    return (
                      <ul key={index} className="list-disc pl-5 my-1">
                        <li>{formatBold(paragraph.trim().slice(2))}</li>
                      </ul>
                    );
                  }
                  return paragraph.trim() === '' ? <div key={index} className="h-2" /> : <p key={index}>{formatBold(paragraph)}</p>;
                })}
              </div>
            </div>
          </div>
        )})}
        
        {/* Dynamic Thinking State with Stop Control */}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-between items-center bg-gray-100/80 rounded-xl px-4 py-3 max-w-[200px] animate-pulse">
            <span className="text-sm text-gray-500 font-medium">Generating answers...</span>
            <button 
              type="button" 
              onClick={stop} 
              className="ml-2 px-2 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs rounded transition-all font-semibold"
            >
              Stop
            </button>
          </div>
        )}

        {/* Global Error Context Handler */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex flex-col gap-2">
            <p className="font-medium">Connection interrupted or model failed to respond.</p>
            <button 
              type="button" 
              onClick={() => stop()} 
              className="w-fit text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded transition-colors font-semibold"
            >
              Retry Generation
            </button>
          </div>
        )}
      </div>

      {/* Control Actions & Input Block */}
      <div className="p-4 border-t bg-white border-gray-100">
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder={isLoading ? "AI is responding..." : "Type your query..."}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50 text-sm transition-all"
          />
          {isLoading ? (
            <button 
              type="button"
              onClick={stop}
              className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
            >
              Halt
            </button>
          ) : (
            <button 
              type="submit" 
              disabled={!input.trim()}
              className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors shadow-sm"
            >
              Send
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
