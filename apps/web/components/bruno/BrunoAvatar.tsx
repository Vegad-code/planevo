'use client';

export type BrunoMood = 'happy' | 'celebrating' | 'sleepy' | 'thinking' | 'gentle';

interface BrunoAvatarProps {
  mood?: BrunoMood;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  sm: 32,
  md: 48,
  lg: 80,
  xl: 120,
};

export default function BrunoAvatar({ mood = 'happy', size = 'md', className = '' }: BrunoAvatarProps) {
  const px = SIZE_MAP[size];

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${mood === 'celebrating' ? 'animate-bounce-gentle' : ''} ${mood === 'thinking' ? 'animate-float' : ''}`}
      role="img"
      aria-label={`Bruno the Bear — ${mood} mood`}
    >
      {/* Bear Ears (Rounded) */}
      <circle cx="12" cy="11" r="5.5" fill="var(--color-bruno-deep, #6B4423)" />
      <circle cx="12" cy="11" r="2.8" fill="var(--color-belly, #E8C896)" />
      
      <circle cx="36" cy="11" r="5.5" fill="var(--color-bruno-deep, #6B4423)" />
      <circle cx="36" cy="11" r="2.8" fill="var(--color-belly, #E8C896)" />

      {/* Body */}
      <ellipse cx="24" cy="32" rx="15" ry="14" fill="var(--color-bruno-deep, #6B4423)" />

      {/* Belly */}
      <ellipse cx="24" cy="34" rx="9" ry="8" fill="var(--color-belly, #E8C896)" />

      {/* Head */}
      <circle cx="24" cy="20" r="12" fill="var(--color-bruno, #8B5A2B)" />

      {/* Muzzle */}
      <ellipse cx="24" cy="23.5" rx="5.5" ry="4" fill="var(--color-belly, #E8C896)" />

      {/* Nose */}
      <ellipse cx="24" cy="21.8" rx="1.6" ry="1.1" fill="var(--color-bruno-ink, #1A140D)" />

      {/* Mouth based on mood */}
      {mood === 'happy' && (
        <path d="M 21.5 24.5 Q 24 26.5 26.5 24.5" stroke="var(--color-bruno-ink, #1A140D)" strokeWidth="1" fill="none" strokeLinecap="round" />
      )}
      {mood === 'celebrating' && (
        <path d="M 21 24.2 Q 24 27 27 24.2" stroke="var(--color-bruno-ink, #1A140D)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      )}
      {mood === 'gentle' && (
        <path d="M 22.2 24.5 Q 24 25.5 25.8 24.5" stroke="var(--color-bruno-ink, #1A140D)" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      )}
      {mood === 'sleepy' && (
        <circle cx="24" cy="24.8" r="0.8" fill="var(--color-bruno-ink, #1A140D)" />
      )}
      {mood === 'thinking' && (
        <line x1="22.2" y1="24.8" x2="25.8" y2="24.8" stroke="var(--color-bruno-ink, #1A140D)" strokeWidth="0.8" strokeLinecap="round" />
      )}

      {/* Eyes based on mood */}
      {mood === 'gentle' && (
        <>
          <circle cx="19.5" cy="18" r="1.3" fill="var(--color-bruno-ink, #1A140D)" />
          <circle cx="28.5" cy="18" r="1.3" fill="var(--color-bruno-ink, #1A140D)" />
        </>
      )}
      {mood === 'happy' && (
        <>
          <path d="M 17.8 19 Q 19.5 17 21.2 19" stroke="var(--color-bruno-ink, #1A140D)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M 26.8 19 Q 28.5 17 30.2 19" stroke="var(--color-bruno-ink, #1A140D)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </>
      )}
      {mood === 'celebrating' && (
        <>
          <path d="M 17.5 19.2 Q 19.5 16.8 21.5 19.2" stroke="var(--color-bruno-ink, #1A140D)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M 26.5 19.2 Q 28.5 16.8 30.5 19.2" stroke="var(--color-bruno-ink, #1A140D)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </>
      )}
      {mood === 'sleepy' && (
        <>
          <line x1="17.8" y1="18.5" x2="21.2" y2="18.5" stroke="var(--color-bruno-ink, #1A140D)" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="26.8" y1="18.5" x2="30.2" y2="18.5" stroke="var(--color-bruno-ink, #1A140D)" strokeWidth="1.2" strokeLinecap="round" />
        </>
      )}
      {mood === 'thinking' && (
        <>
          <circle cx="19.5" cy="18" r="1" fill="var(--color-bruno-ink, #1A140D)" />
          <path d="M 27.2 18.5 Q 28.5 17 29.8 18.5" stroke="var(--color-bruno-ink, #1A140D)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* Blush marks for happy/celebrating moods */}
      {(mood === 'happy' || mood === 'celebrating') && (
        <>
          <circle cx="16" cy="21.5" r="1.5" fill="var(--color-rose, #C56B5E)" opacity="0.35" />
          <circle cx="32" cy="21.5" r="1.5" fill="var(--color-rose, #C56B5E)" opacity="0.35" />
        </>
      )}

      {/* Celebration sparkles */}
      {mood === 'celebrating' && (
        <>
          <circle cx="7" cy="8" r="1" fill="var(--color-honey, #D08741)" opacity="0.8" />
          <circle cx="41" cy="6" r="0.8" fill="var(--color-sage, #6B8B69)" opacity="0.8" />
          <circle cx="5" cy="20" r="0.8" fill="var(--color-sage, #6B8B69)" opacity="0.6" />
          <circle cx="43" cy="18" r="1" fill="var(--color-honey, #D08741)" opacity="0.6" />
        </>
      )}
    </svg>
  );
}

