import React from 'react';
import { useDeepWorkTimer } from '@/hooks/use-deep-work-timer';

interface DeepWorkTimerUIProps {
  timer: ReturnType<typeof useDeepWorkTimer>;
  taskName: string;
  onExit: () => void;
  totalSeconds: number;
}

export function DeepWorkTimerUI({ timer, taskName, onExit, totalSeconds }: DeepWorkTimerUIProps) {
  const { secondsLeft, isActive, isFinished, handleStart, handlePause } = timer;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  
  // Format as MM:SS
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.max(0, Math.min(1, secondsLeft / (totalSeconds || 1)));
  const strokeDashoffset = circumference - (percentage * circumference);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] transition-colors duration-1000">
      
      {/* Title Area */}
      <div className="absolute top-16 text-center animate-in slide-in-from-top-4 fade-in duration-700">
        <h2 className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-ink-faint)] uppercase mb-3">
          Deep Work Session
        </h2>
        <h1 className="font-serif text-3xl md:text-4xl max-w-2xl px-6 tracking-wide text-[var(--color-ink)] font-normal">
          {taskName}
        </h1>
      </div>

      {/* Timer Circle */}
      <div className="relative flex items-center justify-center mt-4">
        {/* Pulsing background effect when active */}
        <div 
          className={`absolute inset-0 rounded-full bg-[var(--color-honey-soft)] opacity-20 blur-3xl transition-all duration-[4000ms] ease-in-out ${isActive ? 'scale-125' : 'scale-90'}`}
        />
        
        <div className={`relative w-72 h-72 md:w-96 md:h-96 flex items-center justify-center transition-transform duration-[4000ms] ease-in-out ${isActive ? 'scale-[1.02]' : 'scale-100'}`}>
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background Circle */}
            <circle 
              cx="50" cy="50" r="48" 
              fill="none" 
              stroke="rgba(26, 20, 13, 0.04)" 
              strokeWidth="1"
            />
            {/* Foreground Animated Circle */}
            <circle 
              cx="50" cy="50" r="48" 
              fill="none" 
              stroke="var(--color-honey)" 
              strokeWidth="1.5"
              strokeLinecap="round"
              className="transition-all duration-1000 ease-linear transform -rotate-90 origin-center"
              style={{
                strokeDasharray: `${circumference}`,
                strokeDashoffset: `${strokeDashoffset}`
              }}
            />
          </svg>
          
          <div className="z-10 flex flex-col items-center">
            <div className="font-serif text-7xl md:text-8xl tabular-nums tracking-wide text-[var(--color-ink)] font-light">
              {formattedTime}
            </div>
            {isFinished && (
              <div className="mt-4 font-mono text-sm tracking-[0.2em] text-[var(--color-sage)] uppercase animate-pulse">
                Session Complete
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-24 w-full max-w-md px-12 flex items-center justify-between animate-in slide-in-from-bottom-4 fade-in duration-700">
        <div className="w-28 flex justify-start">
          <button
            onClick={onExit}
            className="px-5 py-2.5 rounded-full border border-[var(--color-line-strong)] bg-transparent text-[var(--color-ink-soft)] font-sans text-xs font-medium hover:bg-[var(--color-line)] transition-colors shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-paper)] focus-visible:ring-[var(--color-ink)]"
          >
            {isFinished ? 'Dashboard' : 'End Early'}
          </button>
        </div>
        
        {!isFinished && (
          <button
            onClick={isActive ? handlePause : handleStart}
            className="w-16 h-16 rounded-full flex items-center justify-center bg-[var(--color-ink)] text-[var(--color-paper)] hover:bg-[var(--color-ink-2)] transition-all hover:scale-105 shadow-xl hover:shadow-2xl cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-paper)] focus-visible:ring-[var(--color-ink)]"
            aria-label={isActive ? "Pause" : "Start"}
          >
            {isActive ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <rect x="7" y="5" width="3" height="14" rx="1" />
                <rect x="14" y="5" width="3" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="ml-1">
                <path d="M6 4l14 8-14 8V4z" />
              </svg>
            )}
          </button>
        )}

        <div className="w-28 flex justify-end">
          <div className="px-5 py-2.5 rounded-full border border-[var(--color-line-strong)] bg-transparent text-[var(--color-ink-soft)] font-sans text-xs font-medium shadow-sm flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[var(--color-honey)] animate-pulse' : 'bg-[var(--color-ink-soft)]'}`}></span>
            {isActive ? 'Focusing' : 'Paused'}
          </div>
        </div>
      </div>

    </div>
  );
}
