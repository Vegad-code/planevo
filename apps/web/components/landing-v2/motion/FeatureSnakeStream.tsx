'use client';

import { useMemo, useRef, useState } from 'react';
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { cn } from '@/lib/utils';
import type { FeatureStreamGlyph } from './featureStreamGlyphs';
import {
  buildSnakeSamples,
  buildTrailSlots,
  iconOpacity,
  pointAtProgress,
  type Point,
  type TrailSlot,
} from './featureSnakePath';
import { useSnakeStreamProgress } from './snakeStreamContext';

function SnakeIcon({
  progress,
  phase,
  samples,
  glyph,
  prominent,
  segmentIndex,
  segmentCount,
}: {
  progress: MotionValue<number>;
  phase: number;
  samples: Point[];
  glyph: FeatureStreamGlyph;
  prominent: boolean;
  segmentIndex: number;
  segmentCount: number;
}) {
  const segmentStart = segmentIndex / segmentCount;
  const segmentEnd = (segmentIndex + 1) / segmentCount;

  const left = useTransform(progress, (p) => {
    const t = p - phase;
    if (t < segmentStart - 0.03 || t > segmentEnd + 0.03) return '-9999px';
    const point = pointAtProgress(samples, t);
    return `${point.x * 100}%`;
  });
  const top = useTransform(progress, (p) => {
    const t = p - phase;
    if (t < segmentStart - 0.03 || t > segmentEnd + 0.03) return '-9999px';
    const point = pointAtProgress(samples, t);
    const localY = (point.y - segmentStart) * segmentCount;
    return `${localY * 100}%`;
  });
  const opacity = useTransform(progress, (p) => {
    const t = p - phase;
    if (t < segmentStart - 0.03 || t > segmentEnd + 0.03) return 0;
    const local = (t - segmentStart) * segmentCount;
    return prominent ? iconOpacity(local) : iconOpacity(local) * 0.82;
  });
  const scale = useTransform(progress, (p) => {
    const t = p - phase;
    if (t < segmentStart || t > segmentEnd) return prominent ? 0.9 : 0.78;
    const local = (t - segmentStart) * segmentCount;
    const pulse = 0.04 * Math.sin(local * Math.PI);
    return prominent ? 1 + pulse : 0.86 + pulse * 0.5;
  });

  return (
    <motion.div
      className={cn(
        'absolute -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl shadow-sm',
        'flex',
        prominent
          ? 'h-9 w-9 border border-[var(--color-paper)]/80 shadow-[0_8px_24px_rgba(0,0,0,0.28)]'
          : 'h-6 w-6 opacity-90',
        glyph.bg,
      )}
      style={{ left, top, opacity, scale, willChange: 'transform, opacity' }}
    >
      {glyph.icon}
    </motion.div>
  );
}

function FeatureSnakeStreamInner({
  progress,
  segmentIndex,
  segmentCount,
  className,
}: {
  progress: MotionValue<number>;
  segmentIndex: number;
  segmentCount: number;
  className?: string;
}) {
  const lastProgress = useRef(0);
  const lastDirection = useRef<'up' | 'down'>('down');
  const [streamSeed, setStreamSeed] = useState(1);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('down');

  useMotionValueEvent(progress, 'change', (latest) => {
    const delta = latest - lastProgress.current;
    if (Math.abs(delta) < 0.0004) return;

    const direction: 'up' | 'down' = delta > 0 ? 'down' : 'up';
    lastProgress.current = latest;

    if (direction !== lastDirection.current) {
      lastDirection.current = direction;
      setScrollDirection(direction);
      setStreamSeed((prev) => prev + 1 + Math.floor(Math.random() * 999));
    }
  });

  const samples = useMemo(() => buildSnakeSamples(streamSeed), [streamSeed]);
  const trail = useMemo(
    () => buildTrailSlots(streamSeed * 31 + 7, scrollDirection),
    [streamSeed, scrollDirection],
  );

  const segmentStart = segmentIndex / segmentCount;
  const segmentEnd = (segmentIndex + 1) / segmentCount;

  const pathD = useMemo(() => {
    const segmentPoints = samples.filter(
      (point) => point.y >= segmentStart - 0.02 && point.y <= segmentEnd + 0.02,
    );
    return segmentPoints
      .map((point, index) => {
        const localY = (point.y - segmentStart) * segmentCount;
        return `${index === 0 ? 'M' : 'L'} ${point.x * 100} ${localY * 100}`;
      })
      .join(' ');
  }, [samples, segmentCount, segmentEnd, segmentStart]);

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 z-[1] hidden overflow-hidden lg:block',
        className,
      )}
    >
      {pathD ? (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <motion.path
            d={pathD}
            fill="none"
            stroke="rgba(255, 248, 232, 0.1)"
            strokeWidth={0.3}
            strokeDasharray="1.2 2.4"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : null}

      {trail.map((slot: TrailSlot, index) => (
        <SnakeIcon
          key={`snake-${streamSeed}-${index}-${slot.glyph.label}`}
          progress={progress}
          phase={slot.phase}
          samples={samples}
          glyph={slot.glyph}
          prominent={slot.prominent}
          segmentIndex={segmentIndex}
          segmentCount={segmentCount}
        />
      ))}
    </div>
  );
}

/**
 * Per-section snake slice — above charcoal bg, behind copy and demo cards.
 */
export function FeatureSnakeStream({
  segmentIndex,
  segmentCount,
  className,
}: {
  segmentIndex: number;
  segmentCount: number;
  className?: string;
}) {
  const progress = useSnakeStreamProgress();
  const reduce = useReducedMotion();

  if (reduce || !progress) return null;

  return (
    <FeatureSnakeStreamInner
      progress={progress}
      segmentIndex={segmentIndex}
      segmentCount={segmentCount}
      className={className}
    />
  );
}
