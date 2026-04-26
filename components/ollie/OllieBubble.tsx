'use client';

import OllieAvatar from './OllieAvatar';
import { type OllieMood } from '@/types/database';

interface OllieBubbleProps {
  message: string;
  mood?: OllieMood;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function OllieBubble({
  message,
  mood = 'happy',
  size = 'md',
  className = '',
}: OllieBubbleProps) {
  const avatarSize = size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md';

  return (
    <div
      className={`flex items-start gap-3 animate-fade-in ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Ollie avatar */}
      <div className="shrink-0">
        <OllieAvatar mood={mood} size={avatarSize} />
      </div>

      {/* Speech bubble */}
      <div className="relative">
        {/* Bubble arrow */}
        <div
          className="absolute left-[-6px] top-3 w-3 h-3 rotate-45"
          style={{ background: 'rgba(19, 23, 32, 0.7)' }}
        />

        {/* Bubble content */}
        <div className="glass rounded-2xl rounded-tl-sm px-4 py-3 max-w-md">
          <p className={`text-slate-200 leading-relaxed ${
            size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-base' : 'text-sm'
          }`}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
