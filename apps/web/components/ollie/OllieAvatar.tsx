'use client';

import { type OllieMood } from '@/types/database';

interface OllieAvatarProps {
  mood?: OllieMood;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  sm: 32,
  md: 48,
  lg: 80,
  xl: 120,
};

// Eye expressions based on mood
function getEyeExpression(mood: OllieMood) {
  switch (mood) {
    case 'happy':
      return { leftEye: 'M16 18 Q18 16 20 18', rightEye: 'M28 18 Q30 16 32 18' }; // happy arcs
    case 'celebrating':
      return { leftEye: 'M16 18 Q18 15 20 18', rightEye: 'M28 18 Q30 15 32 18' }; // wider happy
    case 'sleepy':
      return { leftEye: 'M16 19 L20 19', rightEye: 'M28 19 L32 19' }; // lines
    case 'thinking':
      return { leftEye: 'circle-sm', rightEye: 'circle-lg' }; // asymmetric
    case 'gentle':
    default:
      return { leftEye: 'circle', rightEye: 'circle' }; // normal round
  }
}

export default function OllieAvatar({ mood = 'happy', size = 'md', className = '' }: OllieAvatarProps) {
  const px = SIZE_MAP[size];
  const eyes = getEyeExpression(mood);

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${mood === 'celebrating' ? 'animate-bounce-gentle' : ''} ${mood === 'thinking' ? 'animate-float' : ''}`}
      role="img"
      aria-label={`Ollie the Owl — ${mood} mood`}
    >
      {/* Body */}
      <ellipse cx="24" cy="28" rx="16" ry="18" fill="#4a6e52" />

      {/* Belly */}
      <ellipse cx="24" cy="32" rx="10" ry="12" fill="#F5E6D3" />

      {/* Head */}
      <circle cx="24" cy="16" r="14" fill="#5d8a66" />

      {/* Ear tufts */}
      <path d="M12 6 L15 12 L10 10 Z" fill="#4a6e52" />
      <path d="M36 6 L33 12 L38 10 Z" fill="#4a6e52" />

      {/* Eye sockets */}
      <circle cx="18" cy="17" r="6" fill="#F5E6D3" />
      <circle cx="30" cy="17" r="6" fill="#F5E6D3" />

      {/* Eyes — dynamic based on mood */}
      {eyes.leftEye === 'circle' && (
        <>
          <circle cx="18" cy="17" r="2.5" fill="#2D1B0E" />
          <circle cx="17" cy="16" r="0.8" fill="white" />
        </>
      )}
      {eyes.rightEye === 'circle' && (
        <>
          <circle cx="30" cy="17" r="2.5" fill="#2D1B0E" />
          <circle cx="29" cy="16" r="0.8" fill="white" />
        </>
      )}

      {eyes.leftEye === 'circle-sm' && (
        <circle cx="18" cy="17" r="2" fill="#2D1B0E" />
      )}
      {eyes.rightEye === 'circle-lg' && (
        <>
          <circle cx="30" cy="17" r="3" fill="#2D1B0E" />
          <circle cx="29" cy="16" r="1" fill="white" />
        </>
      )}

      {typeof eyes.leftEye === 'string' && eyes.leftEye.startsWith('M') && (
        <path d={eyes.leftEye} stroke="#2D1B0E" strokeWidth="2" strokeLinecap="round" fill="none" />
      )}
      {typeof eyes.rightEye === 'string' && eyes.rightEye.startsWith('M') && (
        <path d={eyes.rightEye} stroke="#2D1B0E" strokeWidth="2" strokeLinecap="round" fill="none" />
      )}

      {/* Beak */}
      <path d="M22 21 L24 24 L26 21 Z" fill="#F59E0B" />

      {/* Blush marks for happy/celebrating moods */}
      {(mood === 'happy' || mood === 'celebrating') && (
        <>
          <circle cx="12" cy="20" r="2" fill="#FBBF24" opacity="0.3" />
          <circle cx="36" cy="20" r="2" fill="#FBBF24" opacity="0.3" />
        </>
      )}

      {/* Celebration sparkles */}
      {mood === 'celebrating' && (
        <>
          <circle cx="8" cy="8" r="1.5" fill="#FBBF24" opacity="0.8" />
          <circle cx="40" cy="6" r="1" fill="#22C55E" opacity="0.8" />
          <circle cx="6" cy="20" r="1" fill="#22C55E" opacity="0.6" />
          <circle cx="42" cy="18" r="1.5" fill="#FBBF24" opacity="0.6" />
        </>
      )}
    </svg>
  );
}
