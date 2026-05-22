'use client';

import BrunoAvatar from './BrunoAvatar';
import { type BrunoMood } from './BrunoAvatar';

interface BrunoBubbleProps {
  message: string;
  mood?: BrunoMood;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function BrunoBubble({
  message,
  mood = 'happy',
  size = 'md',
  className = '',
}: BrunoBubbleProps) {
  const avatarSize = size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md';

  return (
    <div
      className={`flex items-start gap-3 animate-fade-in ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Bruno avatar */}
      <div className="shrink-0">
        <BrunoAvatar mood={mood} size={avatarSize} />
      </div>

      {/* Speech bubble */}
      <div className="relative">
        {/* Bubble arrow */}
        <div
          className="absolute left-[-8px] top-4 w-4 h-4 rotate-45 border-l-2 border-b-2 border-border bg-card"
        />

        {/* Bubble content */}
        <div className="glass px-4 py-3 max-w-md shadow-[4px_4px_0px_0px_var(--border)] bg-card border-2 border-border">
          <p className={`text-foreground font-black leading-relaxed ${
            size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
          }`}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
