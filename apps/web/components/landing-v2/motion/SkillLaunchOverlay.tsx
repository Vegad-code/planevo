'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BrunoSkillCard, type BrunoSkillCardData } from '../demo/bruno/BrunoSkillCard';
import { ProIntegrationSwarm } from './ProIntegrationSwarm';
import { SKILL_LAUNCH_SPRING } from './useSkillLaunchAnimation';
import { cn } from '@/lib/utils';

interface SkillLaunchOverlayProps {
  skill: BrunoSkillCardData;
  fromRect: DOMRect;
  toRect: DOMRect | null;
  demoRect?: DOMRect | null;
  mobile?: boolean;
  onComplete: () => void;
}

export function SkillLaunchOverlay({
  skill,
  fromRect,
  toRect,
  demoRect = null,
  mobile = false,
  onComplete,
}: SkillLaunchOverlayProps) {
  const reduce = useReducedMotion();
  const isPro = Boolean(skill.pro);
  const [target, setTarget] = useState(() => ({
    x: fromRect.left,
    y: fromRect.top,
    width: fromRect.width,
    height: fromRect.height,
  }));

  useEffect(() => {
    if (reduce) {
      onComplete();
      return;
    }

    if (!toRect) return;

    const frame = requestAnimationFrame(() => {
      setTarget({
        x: toRect.left,
        y: toRect.top,
        width: toRect.width,
        height: toRect.height,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [toRect, reduce, onComplete]);

  useEffect(() => {
    if (reduce || !toRect) return;
    const baseMs = mobile ? 520 : 680;
    const durationMs = isPro ? baseMs + 480 : baseMs;
    const timeout = window.setTimeout(onComplete, durationMs);
    return () => window.clearTimeout(timeout);
  }, [toRect, reduce, onComplete, mobile, isPro]);

  if (reduce) return null;

  const midScale = mobile ? 0.94 : isPro ? 0.9 : 0.92;
  const landScale = 1;
  const flightDuration = mobile ? 0.52 : isPro ? 1.15 : 0.65;
  const arcLift = isPro && !mobile ? -32 : 0;
  const swarmTarget = demoRect ?? toRect;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[200]"
      initial={{ opacity: 1 }}
      animate={{ opacity: toRect ? 1 : 0 }}
      exit={{ opacity: 0 }}
    >
      {isPro && swarmTarget && (
        <ProIntegrationSwarm fromRect={fromRect} toRect={swarmTarget} variant="launch" />
      )}

      <motion.div
        className={cn(
          'absolute left-0 top-0 origin-top-left',
          isPro && 'drop-shadow-[0_12px_40px_color-mix(in_srgb,var(--color-honey)_45%,transparent)]',
        )}
        initial={{
          x: fromRect.left,
          y: fromRect.top,
          width: fromRect.width,
          height: fromRect.height,
          scale: 1,
          rotate: 0,
        }}
        animate={{
          x: target.x,
          y: toRect
            ? isPro && !mobile
              ? [fromRect.top, fromRect.top + arcLift, target.y]
              : target.y
            : fromRect.top,
          width: target.width,
          height: target.height,
          scale: toRect ? [1, midScale, landScale] : 1,
          rotate: toRect ? (mobile ? 0 : isPro ? [0, -4, 2, 0] : [0, -3, 2, 0]) : 0,
          opacity: toRect ? [1, 1, 0.85, 0] : 1,
        }}
        transition={{
          x: SKILL_LAUNCH_SPRING,
          y: toRect
            ? {
                type: 'tween',
                duration: flightDuration,
                times: isPro && !mobile ? [0, 0.45, 1] : [0, 1],
                ease: 'easeInOut',
              }
            : SKILL_LAUNCH_SPRING,
          width: SKILL_LAUNCH_SPRING,
          height: SKILL_LAUNCH_SPRING,
          scale: toRect
            ? {
                type: 'tween',
                duration: flightDuration,
                times: [0, 0.45, 1],
                ease: 'easeInOut',
              }
            : SKILL_LAUNCH_SPRING,
          opacity: toRect
            ? {
                type: 'tween',
                duration: flightDuration,
                times: [0, 0.72, 0.9, 1],
                ease: 'easeOut',
              }
            : SKILL_LAUNCH_SPRING,
          rotate:
            toRect && !mobile
              ? {
                  type: 'tween',
                  duration: flightDuration,
                  times: [0, 0.38, 0.68, 1],
                  ease: 'easeInOut',
                }
              : SKILL_LAUNCH_SPRING,
        }}
      >
        <BrunoSkillCard skill={skill} isActive className="h-full w-full shadow-2xl" />
      </motion.div>
    </motion.div>
  );
}
