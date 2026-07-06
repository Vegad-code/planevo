'use client';

import { useEffect, useMemo } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from 'framer-motion';
import { FOOTER_FLOW_TASKS } from '@/components/landing-v2/demo/fixtures';

interface Point {
  x: number;
  y: number;
}

/** Offset from section center (px). Arc sweeps left → up over headline → right. */
const PATH_START: Point = { x: -360, y: 48 };
const PATH_CP1: Point = { x: -150, y: -72 };
const PATH_CP2: Point = { x: 190, y: -64 };
const PATH_END: Point = { x: 360, y: 36 };

const PATH_CENTER = { x: 360, y: 100 };
const PATH_D = `M ${PATH_CENTER.x + PATH_START.x} ${PATH_CENTER.y + PATH_START.y} C ${PATH_CENTER.x + PATH_CP1.x} ${PATH_CENTER.y + PATH_CP1.y} ${PATH_CENTER.x + PATH_CP2.x} ${PATH_CENTER.y + PATH_CP2.y} ${PATH_CENTER.x + PATH_END.x} ${PATH_CENTER.y + PATH_END.y}`;

const LOOP_SECONDS = 20;
const PILL_COUNT = 6;
const PATH_SAMPLES = 72;

/** Muted glass tones that blend with the warm cinematic scrim. */
const FOOTER_PILL_STYLES = [
  {
    bg: 'rgba(255, 248, 232, 0.14)',
    border: 'rgba(255, 250, 240, 0.24)',
    dot: 'rgba(255, 238, 210, 0.72)',
    text: 'rgba(255, 253, 245, 0.92)',
  },
  {
    bg: 'rgba(190, 165, 120, 0.16)',
    border: 'rgba(210, 185, 140, 0.26)',
    dot: 'rgba(225, 200, 155, 0.75)',
    text: 'rgba(255, 250, 240, 0.9)',
  },
  {
    bg: 'rgba(140, 155, 115, 0.18)',
    border: 'rgba(165, 180, 135, 0.28)',
    dot: 'rgba(190, 205, 165, 0.7)',
    text: 'rgba(248, 252, 242, 0.9)',
  },
  {
    bg: 'rgba(120, 105, 90, 0.2)',
    border: 'rgba(150, 135, 115, 0.3)',
    dot: 'rgba(180, 165, 145, 0.68)',
    text: 'rgba(255, 250, 245, 0.88)',
  },
  {
    bg: 'rgba(200, 145, 110, 0.15)',
    border: 'rgba(220, 170, 130, 0.25)',
    dot: 'rgba(235, 190, 155, 0.72)',
    text: 'rgba(255, 248, 240, 0.9)',
  },
] as const;

function sampleCubic(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return {
    x:
      u * u * u * p0.x +
      3 * u * u * t * p1.x +
      3 * u * t * t * p2.x +
      t * t * t * p3.x,
    y:
      u * u * u * p0.y +
      3 * u * u * t * p1.y +
      3 * u * t * t * p2.y +
      t * t * t * p3.y,
  };
}

function buildPathSamples(): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < PATH_SAMPLES; i++) {
    points.push(
      sampleCubic(PATH_START, PATH_CP1, PATH_CP2, PATH_END, i / (PATH_SAMPLES - 1)),
    );
  }
  return points;
}

function pointAtProgress(samples: Point[], t: number): Point {
  const clamped = ((t % 1) + 1) % 1;
  const scaled = clamped * (samples.length - 1);
  const index = Math.floor(scaled);
  const frac = scaled - index;
  const a = samples[index];
  const b = samples[Math.min(index + 1, samples.length - 1)];
  return {
    x: a.x + (b.x - a.x) * frac,
    y: a.y + (b.y - a.y) * frac,
  };
}

function edgeOpacity(t: number): number {
  const wrapped = ((t % 1) + 1) % 1;
  if (wrapped < 0.07) return wrapped / 0.07;
  if (wrapped > 0.93) return (1 - wrapped) / 0.07;
  return 1;
}

function FlowPill({
  label,
  meta,
  style,
}: {
  label: string;
  meta?: string;
  style: (typeof FOOTER_PILL_STYLES)[number];
}) {
  return (
    <div
      className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[11px] shadow-[0_4px_20px_rgba(0,0,0,0.12)] backdrop-blur-sm"
      style={{ backgroundColor: style.bg, border: `1px solid ${style.border}` }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: style.dot }}
      />
      <span className="font-medium" style={{ color: style.text }}>
        {label}
      </span>
      {meta ? (
        <span style={{ color: style.text, opacity: 0.72 }}> · {meta}</span>
      ) : null}
    </div>
  );
}

function TravelingPill({
  progress,
  phase,
  samples,
  label,
  meta,
  style,
}: {
  progress: MotionValue<number>;
  phase: number;
  samples: Point[];
  label: string;
  meta?: string;
  style: (typeof FOOTER_PILL_STYLES)[number];
}) {
  const x = useTransform(progress, (p) => pointAtProgress(samples, p + phase).x);
  const y = useTransform(progress, (p) => pointAtProgress(samples, p + phase).y);
  const opacity = useTransform(progress, (p) => edgeOpacity(p + phase));

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 will-change-transform"
      style={{ x, y, opacity, translateX: '-50%', translateY: '-50%' }}
    >
      <FlowPill label={label} meta={meta} style={style} />
    </motion.div>
  );
}

export function TaskFlowPath({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const samples = useMemo(() => buildPathSamples(), []);
  const progress = useMotionValue(0);

  useEffect(() => {
    if (reduce) return;
    const controls = animate(progress, [0, 1], {
      duration: LOOP_SECONDS,
      repeat: Infinity,
      ease: 'linear',
    });
    return () => controls.stop();
  }, [progress, reduce]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`}
    >
      <svg
        className="absolute left-1/2 top-1/2 h-[200px] w-[min(720px,94%)] -translate-x-1/2 -translate-y-1/2"
        viewBox="0 0 720 200"
        fill="none"
      >
        <motion.path
          d={PATH_D}
          stroke="rgba(255, 252, 235, 0.32)"
          strokeWidth={1.5}
          strokeDasharray="5 9"
          strokeLinecap="round"
          opacity={0.7}
          animate={reduce ? undefined : { strokeDashoffset: [0, -56] }}
          transition={
            reduce
              ? undefined
              : { duration: 14, repeat: Infinity, ease: 'linear' }
          }
        />
      </svg>

      {!reduce &&
        Array.from({ length: PILL_COUNT }, (_, i) => {
          const task = FOOTER_FLOW_TASKS[i % FOOTER_FLOW_TASKS.length];
          return (
            <TravelingPill
              key={`footer-flow-${i}`}
              progress={progress}
              phase={i / PILL_COUNT}
              samples={samples}
              label={task.label}
              meta={'meta' in task ? task.meta : undefined}
              style={FOOTER_PILL_STYLES[i % FOOTER_PILL_STYLES.length]}
            />
          );
        })}
    </div>
  );
}
