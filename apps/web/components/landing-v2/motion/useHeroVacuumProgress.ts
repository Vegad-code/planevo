'use client';

import { useSpring, type MotionValue } from 'framer-motion';
import type { HeroTimelineTask } from '@/components/landing-v2/demo/fixtures';

export const HERO_VACUUM_PHASES = {
  gatherEnd: 0.45,
  organizeEnd: 0.72,
  payoffEnd: 0.88,
  depositStart: 0.88,
  releaseEnd: 0.92,
  scatterEnd: 0.97,
  depositEnd: 1,
} as const;

export const HERO_VACUUM_EASE = [0.22, 1, 0.36, 1] as const;

const SPRING_CONFIG = { stiffness: 120, damping: 28, mass: 0.6 } as const;

export interface PillWindow {
  start: number;
  gatherEnd: number;
  organizeEnd: number;
}

/** Per-pill scroll windows — farther pills start earlier; landing cascades by order. */
export function pillWindow(task: HeroTimelineTask): PillWindow {
  const distanceFactor = Math.min(Math.abs(task.startX) / 400, 1);
  const start = Math.max(0, 0.02 + task.order * 0.03 - distanceFactor * 0.05);
  const organizeEnd = Math.min(
    0.82,
    HERO_VACUUM_PHASES.organizeEnd + task.order * 0.015,
  );
  return {
    start,
    gatherEnd: HERO_VACUUM_PHASES.gatherEnd,
    organizeEnd,
  };
}

/** Focal cluster offset toward center during the gather phase. */
export function pillFocalX(task: HeroTimelineTask): number {
  return task.track === 'left' ? -24 : 24;
}

export const PILL_FOCAL_Y = 0;

export function useHeroVacuumProgress(scrollYProgress: MotionValue<number>) {
  const smoothProgress = useSpring(scrollYProgress, SPRING_CONFIG);
  return { smoothProgress };
}

/** Ease-out quint for manual progress interpolation inside transform callbacks. */
export function easeOutQuint(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - (1 - clamped) ** 5;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Ease-in quad — gravity-like acceleration for downward motion. */
export function easeInQuad(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped;
}

/** Ease-out cubic — quick scatter burst settling outward. */
export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - (1 - clamped) ** 3;
}

/** Per-pill deposit start — outer stack positions release first. */
export function pillDepositStart(task: HeroTimelineTask): number {
  const outerBias = Math.abs(task.order - 1.5) / 1.5;
  return (
    HERO_VACUUM_PHASES.depositStart +
    (1 - outerBias) * 0.012 +
    task.delay * 0.15
  );
}
