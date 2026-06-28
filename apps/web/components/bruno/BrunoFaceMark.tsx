import { useId } from 'react';
import { cn } from '@/lib/utils';
import { BRUNO_FACE_PATHS } from '@/components/bruno/bruno-face-art';

interface BrunoFaceMarkProps {
  size?: number;
  className?: string;
}

export function BrunoFaceMark({ size = 36, className }: BrunoFaceMarkProps) {
  const gradientId = useId().replace(/:/g, '');
  const gradientRef = `url(#${gradientId})`;

  return (
    <svg
      viewBox="0 0 1024 1024"
      width={size}
      height={size}
      role="img"
      aria-label="Bruno"
      className={cn('shrink-0 rounded-full', className)}
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1="200.30646"
          y1="404.32071"
          x2="228.00905"
          y2="275.59662"
        >
          <stop offset="0" stopColor="#B57346" />
          <stop offset="1" stopColor="#E5A46C" />
        </linearGradient>
      </defs>
      {BRUNO_FACE_PATHS.map((path, index) => (
        <path
          key={index}
          fill={path.fill === 'url(#gradient_0)' ? gradientRef : path.fill}
          d={path.d}
        />
      ))}
    </svg>
  );
}
