'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BrunoSkillCard, type BrunoSkillCardData } from '../demo/bruno/BrunoSkillCard';
import { SKILL_LAUNCH_SPRING } from './useSkillLaunchAnimation';
import { cn } from '@/lib/utils';

const USER_BUBBLE_LAYOUT_ID = 'bruno-skill-launch';

interface SkillLaunchOverlayProps {
  skill: BrunoSkillCardData;
  fromRect: DOMRect;
  toRect: DOMRect | null;
  mobile?: boolean;
  onComplete: () => void;
}

export function SkillLaunchOverlay({ skill, fromRect, toRect, mobile = false, onComplete }: SkillLaunchOverlayProps) {
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
    const durationMs = isPro ? baseMs + 160 : baseMs;
    const timeout = window.setTimeout(onComplete, durationMs);
    return () => window.clearTimeout(timeout);
  }, [toRect, reduce, onComplete, mobile, isPro]);

  if (reduce) return null;

  const midScale = mobile ? 0.94 : isPro ? 0.9 : 0.92;
  const landScale = 1;
  const flightDuration = mobile ? 0.52 : isPro ? 0.82 : 0.65;
  const arcLift = isPro && !mobile ? -28 : 0;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[200]"
      initial={{ opacity: 1 }}
      animate={{ opacity: toRect ? 1 : 0 }}
      exit={{ opacity: 0 }}
    >
      {isPro && toRect && (
        <motion.div
          className="absolute left-0 top-0 h-2 w-2 rounded-full bg-[var(--color-honey)] blur-md"
          initial={{
            x: fromRect.left + fromRect.width / 2,
            y: fromRect.top + fromRect.height / 2,
            opacity: 0.8,
            scale: 1,
          }}
          animate={{
            x: target.x + target.width / 2,
            y: target.y + target.height / 2 + arcLift * 0.5,
            opacity: 0,
            scale: 3.5,
          }}
          transition={{
            duration: flightDuration,
            ease: 'easeOut',
          }}
        />
      )}

      <motion.div
        layoutId={toRect ? USER_BUBBLE_LAYOUT_ID : undefined}
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
          scale: toRect ? [1, midScale, isPro ? 1.06 : 1.02, landScale] : 1,
          rotate: toRect ? (mobile ? 0 : isPro ? [0, -5, 3, 0] : [0, -3, 2, 0]) : 0,
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
                times: [0, 0.4, 0.72, 1],
                ease: 'easeInOut',
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
