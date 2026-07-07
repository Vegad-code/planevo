'use client';

import { useCallback, useRef, useState } from 'react';
import type { BrunoSkillKey } from '../demo/bruno/types';
import type { BrunoSkillCardData } from '../demo/bruno/BrunoSkillCard';

export type SkillLaunchPhase = 'idle' | 'launching' | 'landed';

export const SKILL_LAUNCH_SPRING = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 22,
  mass: 0.9,
};

interface UseSkillLaunchAnimationOptions {
  reduceMotion: boolean;
  onLanded: (skill: BrunoSkillKey) => void;
}

export function useSkillLaunchAnimation({ reduceMotion, onLanded }: UseSkillLaunchAnimationOptions) {
  const [phase, setPhase] = useState<SkillLaunchPhase>('idle');
  const [launchSkill, setLaunchSkill] = useState<BrunoSkillCardData | null>(null);
  const [fromRect, setFromRect] = useState<DOMRect | null>(null);
  const [launchId, setLaunchId] = useState(0);
  const landingRef = useRef<HTMLDivElement>(null);
  const isLaunchingRef = useRef(false);

  const launch = useCallback(
    (skill: BrunoSkillCardData, sourceEl: HTMLElement) => {
      if (isLaunchingRef.current) return;

      if (reduceMotion) {
        onLanded(skill.key);
        return;
      }

      isLaunchingRef.current = true;
      const rect = sourceEl.getBoundingClientRect();
      setLaunchSkill(skill);
      setFromRect(rect);
      setPhase('launching');
      setLaunchId((id) => id + 1);
    },
    [reduceMotion, onLanded],
  );

  const completeLaunch = useCallback(() => {
    if (!launchSkill) return;
    onLanded(launchSkill.key);
    isLaunchingRef.current = false;
    window.setTimeout(() => {
      setPhase('idle');
      setLaunchSkill(null);
      setFromRect(null);
    }, 100);
  }, [launchSkill, onLanded]);

  const cancelLaunch = useCallback(() => {
    isLaunchingRef.current = false;
    setPhase('idle');
    setLaunchSkill(null);
    setFromRect(null);
  }, []);

  const getLandingRect = useCallback((): DOMRect | null => {
    const el = landingRef.current;
    if (!el) return null;
    return el.getBoundingClientRect();
  }, []);

  return {
    phase,
    launchSkill,
    fromRect,
    launchId,
    landingRef,
    launch,
    completeLaunch,
    cancelLaunch,
    getLandingRect,
    isLaunching: phase === 'launching',
  };
}
