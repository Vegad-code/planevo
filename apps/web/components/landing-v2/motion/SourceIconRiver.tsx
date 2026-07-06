'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  GraduationCap,
  CalendarBlank,
  CheckSquare,
  Note,
  Microphone,
  type Icon,
} from '@phosphor-icons/react';

interface Point {
  x: number;
  y: number;
}

/** De Casteljau sample of the cubic bezier M 0 340 C 250 340 350 120 700 100. */
function samplePath(steps: number): Point[] {
  const p0 = { x: 0, y: 340 };
  const p1 = { x: 250, y: 340 };
  const p2 = { x: 350, y: 120 };
  const p3 = { x: 700, y: 100 };
  const points: Point[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const u = 1 - t;
    points.push({
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    });
  }
  return points;
}

interface Glyph {
  icon: Icon;
  bg: string;
  fg: string;
  label: string;
}

const GLYPHS: Glyph[] = [
  { icon: GraduationCap, bg: 'bg-[var(--color-rose-soft)]', fg: 'text-[var(--color-rose)]', label: 'Canvas' },
  { icon: CalendarBlank, bg: 'bg-[var(--color-blue-soft)]', fg: 'text-[var(--color-blue)]', label: 'Google Calendar' },
  { icon: CheckSquare, bg: 'bg-[var(--color-honey-soft)]', fg: 'text-[var(--color-honey-deep)]', label: 'Tasks' },
  { icon: Note, bg: 'bg-[var(--color-cream-2)]', fg: 'text-[var(--color-ink-soft)]', label: 'Notes' },
  { icon: Microphone, bg: 'bg-[var(--color-sage-soft)]', fg: 'text-[var(--color-sage)]', label: 'Voice' },
];

const NODE_COUNT = 20;
const LOOP_SECONDS = 14;

/**
 * Wispr's icon-river, translated to Planevo: source glyphs flowing along a
 * bezier toward the board. Honey/cream tinted (no black section), md+ only.
 */
export function SourceIconRiver() {
  const reduce = useReducedMotion();
  const points = useMemo(() => samplePath(24), []);

  if (reduce) return null;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  // Fade in at the path start and out at the end so the loop reads as a flow.
  const opacities = points.map((_, i) =>
    i < 2 ? 0 : i > points.length - 3 ? 0 : 0.9,
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block"
    >
      {Array.from({ length: NODE_COUNT }, (_, i) => {
        const glyph = GLYPHS[i % GLYPHS.length];
        const IconComponent = glyph.icon;
        return (
          <motion.div
            key={i}
            initial={{ x: xs[0], y: ys[0], opacity: 0 }}
            animate={{ x: xs, y: ys, opacity: opacities }}
            transition={{
              duration: LOOP_SECONDS,
              repeat: Infinity,
              ease: 'linear',
              delay: (i * LOOP_SECONDS) / NODE_COUNT,
            }}
            style={{ willChange: 'transform' }}
            className={`absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-lg shadow-sm ${glyph.bg}`}
          >
            <IconComponent size={16} weight="duotone" className={glyph.fg} />
          </motion.div>
        );
      })}
    </div>
  );
}
