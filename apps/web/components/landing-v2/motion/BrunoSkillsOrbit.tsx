'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { BRUNO_SKILLS } from '../demo/bruno/brunoFixtures';
import { BrunoSkillCard, PRO_SKILL_KEY, type BrunoSkillCardData } from '../demo/bruno/BrunoSkillCard';
import type { BrunoSkillKey } from '../demo/bruno/types';
import { cn } from '@/lib/utils';

const ORBIT_DURATION_S = 60;
const ORBIT_SKILL_ORDER: BrunoSkillCardData[] = [
  ...BRUNO_SKILLS.filter((skill) => skill.key === PRO_SKILL_KEY),
  ...BRUNO_SKILLS.filter((skill) => skill.key !== PRO_SKILL_KEY),
];
const CARD_COUNT = ORBIT_SKILL_ORDER.length;
const CARD_WIDTH = 184;
const CARD_HEIGHT = 152;
const ORBIT_INSET = 16;
const SUGGESTED_SKILL: BrunoSkillKey = PRO_SKILL_KEY;
const HINT_STORAGE_KEY = 'bruno-skills-hint';
const PRO_SPOTLIGHT_STORAGE_KEY = 'bruno-pro-spotlight';

const ORBIT_RECESS_SPRING = { type: 'spring' as const, stiffness: 320, damping: 28, mass: 0.85 };
const DEMO_FOCUS_MS = 9000;

interface BrunoSkillsOrbitProps {
  activeSkill: BrunoSkillKey;
  isLaunching: boolean;
  orbitRecessed: boolean;
  launchingSkillKey: BrunoSkillKey | null;
  proSpotlightActive: boolean;
  onSkillSelect: (skill: BrunoSkillCardData, el: HTMLElement) => void;
  stageRef?: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}

function useOrbitRotation(paused: boolean) {
  const rotation = useMotionValue(0);
  const reduce = useReducedMotion();
  const controlsRef = useRef<ReturnType<typeof animate> | undefined>(undefined);

  useEffect(() => {
    if (reduce) {
      controlsRef.current?.stop();
      controlsRef.current = undefined;
      return;
    }

    if (paused) {
      controlsRef.current?.stop();
      controlsRef.current = undefined;
      return;
    }

    const current = rotation.get();
    controlsRef.current = animate(rotation, current + 360, {
      duration: ORBIT_DURATION_S,
      ease: 'linear',
      repeat: Infinity,
      repeatType: 'loop',
    });

    return () => {
      controlsRef.current?.stop();
      controlsRef.current = undefined;
    };
  }, [paused, reduce, rotation]);

  return rotation;
}

function useStageSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 900, height: 520 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

function OrbitCard({
  skill,
  index,
  rotation,
  radiusX,
  radiusY,
  isActive,
  dimmed,
  orbitRecessed,
  isLaunchingCard,
  proSpotlightActive,
  onSelect,
}: {
  skill: BrunoSkillCardData;
  index: number;
  rotation: ReturnType<typeof useMotionValue<number>>;
  radiusX: number;
  radiusY: number;
  isActive: boolean;
  dimmed: boolean;
  orbitRecessed: boolean;
  isLaunchingCard: boolean;
  proSpotlightActive: boolean;
  onSelect: (skill: BrunoSkillCardData, el: HTMLElement) => void;
}) {
  const isPro = Boolean(skill.pro);
  const proBoost = isPro ? 1.12 : 1;
  const baseAngle = (index / CARD_COUNT) * Math.PI * 2 - Math.PI / 2;

  const x = useTransform(rotation, (deg) => {
    const angle = baseAngle + (deg * Math.PI) / 180;
    return Math.cos(angle) * radiusX;
  });

  const y = useTransform(rotation, (deg) => {
    const angle = baseAngle + (deg * Math.PI) / 180;
    return Math.sin(angle) * radiusY;
  });

  const scale = useTransform(rotation, (deg) => {
    const angle = baseAngle + (deg * Math.PI) / 180;
    const depth = (Math.sin(angle) + 1) / 2;
    return (0.94 + depth * 0.12) * proBoost;
  });

  const zIndex = useTransform(rotation, (deg) => {
    const angle = baseAngle + (deg * Math.PI) / 180;
    return Math.round(10 + Math.sin(angle) * 10) + (isPro ? 8 : 0);
  });

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      onSelect(skill, e.currentTarget);
    },
    [onSelect, skill],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(skill, e.currentTarget);
      }
    },
    [onSelect, skill],
  );

  const recess = orbitRecessed && !isLaunchingCard;
  const showProSpotlight = proSpotlightActive && isPro;

  return (
    <motion.div
      className="pointer-events-auto absolute left-1/2 top-1/2"
      style={{ x, y, scale, zIndex, translateX: '-50%', translateY: '-50%', rotate: 0 }}
    >
      <motion.div
        animate={
          isLaunchingCard
            ? { opacity: 0, y: 0, scale: 0.9 }
            : recess
              ? { opacity: 0, y: 140, scale: 0.82 }
              : { opacity: 1, y: 0, scale: 1 }
        }
        transition={ORBIT_RECESS_SPRING}
        className={cn('relative', (recess || isLaunchingCard) && 'pointer-events-none')}
      >
        <BrunoSkillCard
          skill={skill}
          isActive={isActive}
          dimmed={dimmed}
          showProSpotlight={showProSpotlight}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-honey)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-charcoal)]"
        />
      </motion.div>
    </motion.div>
  );
}

export function MobileSkillStrip({
  activeSkill,
  isLaunching,
  orbitRecessed,
  onSkillSelect,
}: {
  activeSkill: BrunoSkillKey;
  isLaunching: boolean;
  orbitRecessed: boolean;
  onSkillSelect: (skill: BrunoSkillCardData, el: HTMLElement) => void;
}) {
  return (
    <motion.div
      animate={orbitRecessed ? { opacity: 0, y: -24, height: 0 } : { opacity: 1, y: 0, height: 'auto' }}
      transition={ORBIT_RECESS_SPRING}
      className="overflow-hidden"
    >
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 snap-x snap-mandatory scrollbar-none">
        {ORBIT_SKILL_ORDER.map((skill) => (
          <BrunoSkillCard
            key={skill.key}
            skill={skill}
            compact
            isActive={activeSkill === skill.key}
            dimmed={isLaunching && activeSkill !== skill.key}
            onClick={(e) => onSkillSelect(skill, e.currentTarget)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSkillSelect(skill, e.currentTarget);
              }
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function StaticSkillGrid({
  activeSkill,
  isLaunching,
  onSkillSelect,
}: {
  activeSkill: BrunoSkillKey;
  isLaunching: boolean;
  onSkillSelect: (skill: BrunoSkillCardData, el: HTMLElement) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
      {ORBIT_SKILL_ORDER.map((skill) => (
        <BrunoSkillCard
          key={skill.key}
          skill={skill}
          isActive={activeSkill === skill.key}
          dimmed={isLaunching && activeSkill !== skill.key}
          className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-honey)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-charcoal)]"
          onClick={(e) => onSkillSelect(skill, e.currentTarget)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSkillSelect(skill, e.currentTarget);
            }
          }}
        />
      ))}
    </div>
  );
}

export function BrunoSkillsOrbit({
  activeSkill,
  isLaunching,
  orbitRecessed,
  launchingSkillKey,
  proSpotlightActive,
  onSkillSelect,
  stageRef,
  children,
}: BrunoSkillsOrbitProps) {
  const [isHovered, setIsHovered] = useState(false);
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = stageRef ?? internalRef;

  const rotation = useOrbitRotation(isHovered || orbitRecessed || proSpotlightActive);
  const stageSize = useStageSize(containerRef);

  const radiusX = Math.max(160, stageSize.width / 2 - CARD_WIDTH / 2 - ORBIT_INSET);
  const radiusY = Math.max(100, stageSize.height / 2 - CARD_HEIGHT / 2 - ORBIT_INSET);

  return (
    <div
      ref={containerRef}
      className={cn('relative mx-auto w-full max-w-5xl py-6')}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0 transition-opacity duration-300',
          orbitRecessed && 'z-0',
        )}
      >
        {ORBIT_SKILL_ORDER.map((skill, index) => (
          <OrbitCard
            key={skill.key}
            skill={skill}
            index={index}
            rotation={rotation}
            radiusX={radiusX}
            radiusY={radiusY}
            isActive={activeSkill === skill.key}
            dimmed={isLaunching && activeSkill !== skill.key}
            orbitRecessed={orbitRecessed}
            isLaunchingCard={launchingSkillKey === skill.key}
            proSpotlightActive={proSpotlightActive}
            onSelect={onSkillSelect}
          />
        ))}
      </div>

      <div
        className={cn(
          'relative mx-auto w-full max-w-lg px-4 transition-[z-index] sm:max-w-xl',
          orbitRecessed ? 'z-20' : 'z-10',
        )}
      >
        {children}
      </div>
    </div>
  );
}

export {
  SUGGESTED_SKILL,
  HINT_STORAGE_KEY,
  PRO_SPOTLIGHT_STORAGE_KEY,
  PRO_SKILL_KEY,
  DEMO_FOCUS_MS,
};
