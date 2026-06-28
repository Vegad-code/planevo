import { useId } from 'react';
import { cn } from '@/lib/utils';
import {
  BRUNO_THINKING_GRADIENTS,
  BRUNO_THINKING_PATHS,
  BRUNO_THINKING_VIEWBOX,
} from '@/components/bruno/bruno-thinking-art';

const DEFAULT_HEIGHT = 140;

interface BrunoThinkingIllustrationProps {
  className?: string;
  maxHeight?: number;
}

export function BrunoThinkingIllustration({
  className,
  maxHeight = DEFAULT_HEIGHT,
}: BrunoThinkingIllustrationProps) {
  const [, , viewW, viewH] = BRUNO_THINKING_VIEWBOX.split(' ').map(Number);
  const width = Math.round(maxHeight * (viewW / viewH));
  const gradientPrefix = useId().replace(/:/g, '');

  const gradientMap = Object.fromEntries(
    BRUNO_THINKING_GRADIENTS.map((gradient) => [
      gradient.id,
      `url(#${gradientPrefix}-${gradient.id})`,
    ]),
  );

  return (
    <div
      className={cn(
        'shrink-0 drop-shadow-[0_10px_28px_rgba(0,0,0,0.18)]',
        className,
      )}
      style={{ width, height: maxHeight }}
    >
      <svg
        viewBox={BRUNO_THINKING_VIEWBOX}
        width={width}
        height={maxHeight}
        aria-hidden
        className="pointer-events-none size-full select-none"
      >
        <defs>
          {BRUNO_THINKING_GRADIENTS.map((gradient) => (
            <linearGradient
              key={gradient.id}
              id={`${gradientPrefix}-${gradient.id}`}
              gradientUnits="userSpaceOnUse"
              x1={gradient.x1}
              y1={gradient.y1}
              x2={gradient.x2}
              y2={gradient.y2}
            >
              {gradient.stops.map((stop) => (
                <stop
                  key={stop.offset}
                  offset={stop.offset}
                  stopColor={stop.color}
                />
              ))}
            </linearGradient>
          ))}
        </defs>
        {BRUNO_THINKING_PATHS.map((path, index) => {
          const fill = path.fill.startsWith('url(#')
            ? gradientMap[path.fill.slice(5, -1)] ?? path.fill
            : path.fill;

          return <path key={index} fill={fill} d={path.d} />;
        })}
      </svg>
    </div>
  );
}
