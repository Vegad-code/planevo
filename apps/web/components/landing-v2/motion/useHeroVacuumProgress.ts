'use client';

import { useSpring, type MotionValue } from 'framer-motion';
import type { HeroTimelineTask } from '@/components/landing-v2/demo/fixtures';

export const HERO_VACUUM_PHASES = {
  gatherEnd: 0.38,
  organizeEnd: 0.72,
  payoffEnd: 0.82,
  /** Slot chrome fades before pills peel. */
  slotFadeStart: 0.84,
  slotFadeEnd: 0.9,
  /** Lead pills hand off to hero deposit layer. */
  depositStart: 0.88,
  depositEnd: 0.965,
  /** Demo card visible / intake ready. */
  demoEnterStart: 0.9,
  /** CommandHeroDemo replay fires just after deposit lands. */
  demoTrigger: 0.97,
  end: 1,
} as const;

/** @deprecated Use slotFadeStart/depositStart — kept for gradual migration */
export const HERO_VACUUM_RELEASE = {
  releaseStart: HERO_VACUUM_PHASES.slotFadeStart,
  releaseEnd: HERO_VACUUM_PHASES.depositEnd,
} as const;

export const HERO_VACUUM_EASE = [0.22, 1, 0.36, 1] as const;

const SPRING_CONFIG = { stiffness: 180, damping: 26, mass: 0.5 } as const;

export interface PillWindow {
  start: number;
  gatherEnd: number;
  organizeEnd: number;
}

/** Per-pill scroll windows — cascade by order during organize. */
export function pillWindow(task: HeroTimelineTask): PillWindow {
  const start = Math.max(0, 0.02 + task.order * 0.025);
  return {
    start,
    gatherEnd: HERO_VACUUM_PHASES.gatherEnd,
    organizeEnd: HERO_VACUUM_PHASES.organizeEnd,
  };
}

export function useHeroVacuumProgress(scrollYProgress: MotionValue<number>) {
  const smoothProgress = useSpring(scrollYProgress, SPRING_CONFIG);
  return { smoothProgress };
}

/** Ease-out quint for manual progress interpolation inside transform callbacks. */
export function easeOutQuint(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - (1 - clamped) ** 5;
}

/** Ease-in quad — gravity-like acceleration for downward deposit fall. */
export function easeInQuad(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Ease-out cubic — quick settle. */
export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - (1 - clamped) ** 3;
}

/** 0→1 while slot chrome fades (84–90%). */
export function slotFadeT(progress: number): number {
  const { slotFadeStart, slotFadeEnd } = HERO_VACUUM_PHASES;
  if (progress <= slotFadeStart) return 0;
  if (progress >= slotFadeEnd) return 1;
  return easeOutQuint((progress - slotFadeStart) / (slotFadeEnd - slotFadeStart));
}

/** Interleaved stagger: left/right pairs peel by slot order (0…7). */
export function depositStaggerIndex(task: HeroTimelineTask): number {
  return task.order * 2 + (task.track === 'right' ? 1 : 0);
}

/** 0→1 per deposit pill (staggerIndex 0…7 interleaves left/right by slot order). */
export function depositT(progress: number, staggerIndex: number): number {
  const { depositStart, depositEnd } = HERO_VACUUM_PHASES;
  const span = depositEnd - depositStart;
  const staggerStep = span * 0.045;
  const fallSpan = span * 0.72;
  const landStart = depositStart + staggerStep * staggerIndex;
  const landEnd = Math.min(depositEnd, landStart + fallSpan);
  if (progress <= landStart) return 0;
  if (progress >= landEnd) return 1;
  return easeInQuad((progress - landStart) / (landEnd - landStart));
}

/** @deprecated Use slotFadeT — legacy alias */
export function releaseT(progress: number): number {
  return slotFadeT(progress);
}
