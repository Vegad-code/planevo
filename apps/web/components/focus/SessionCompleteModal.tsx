'use client';

import { useState } from 'react';
import { useFocusStore } from '@/store/useFocusStore';
import BrunoAvatar from '@/components/bruno/BrunoAvatar';

export default function SessionCompleteModal() {
  const { timeLeft, sessionsCompleted, activeTask, resetTimer } = useFocusStore();
  const [progress, setProgress] = useState(50);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Only show if timer reached 0 and we haven't reset yet
  if (timeLeft !== 0 || sessionsCompleted === 0 || isSubmitted) return null;

  function handleSubmit() {
    setIsSubmitted(true);
    // In a real app, we'd update the DB here. For now, we just close.
    setTimeout(() => {
        resetTimer();
        setIsSubmitted(false);
    }, 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-50 border-4 border-surface-900 p-8 rounded-3xl max-w-md w-full shadow-[12px_12px_0_0_var(--shadow-color)] animate-bounce-subtle">
        <div className="flex flex-col items-center text-center">
          <BrunoAvatar mood="celebrating" size="lg" />
          <h2 className="mt-6 text-2xl font-black uppercase text-surface-900 tracking-tighter">Session Complete!</h2>
          <p className="text-surface-500 mt-2 text-sm italic font-medium">Excellent work. Your focus session is in the books.</p>

          <div className="mt-8 w-full">
            <label className="text-xs font-black uppercase text-surface-400 block mb-4 tracking-widest">
              How much of &quot;{activeTask?.title || 'your task'}&quot; is finished?
            </label>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={progress}
              onChange={(e) => setProgress(parseInt(e.target.value))}
              className="w-full h-3 bg-surface-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
            />
            <div className="flex justify-between mt-2 font-black text-surface-900 italic">
              <span>0%</span>
              <span className="text-brand-600 text-lg">{progress}%</span>
              <span>100%</span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="mt-8 w-full py-4 bg-accent-600 text-surface-50 font-black uppercase border-2 border-surface-900 shadow-[4px_4px_0_0_var(--shadow-color)] hover:bg-accent-500 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
          >
            Save Summary
          </button>
        </div>
      </div>
    </div>
  );
}
