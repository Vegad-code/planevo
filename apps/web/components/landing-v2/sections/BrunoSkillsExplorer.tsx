'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LayoutGroup, useReducedMotion } from 'framer-motion';
import { BrunoScenarioPanel } from '../demo/bruno/BrunoScenarioPanel';
import { BrunoSkillLaunchProvider } from '../demo/bruno/BrunoSkillLaunchContext';
import { PRO_SKILL_KEY, SKILL_CAPTIONS } from '../demo/bruno/BrunoSkillCard';
import type { BrunoSkillCardData } from '../demo/bruno/BrunoSkillCard';
import { useBrunoPersona } from '../demo/bruno/BrunoPersonaContext';
import type { BrunoSkillKey } from '../demo/bruno/types';
import {
  BrunoSkillsOrbit,
  DEMO_FOCUS_MS,
  MobileSkillStrip,
  PRO_SPOTLIGHT_STORAGE_KEY,
  StaticSkillGrid,
} from '../motion/BrunoSkillsOrbit';
import { SkillLaunchOverlay } from '../motion/SkillLaunchOverlay';
import { ProIntegrationSwarm } from '../motion/ProIntegrationSwarm';
import { useSkillLaunchAnimation } from '../motion/useSkillLaunchAnimation';
import { cn } from '@/lib/utils';

const USER_BUBBLE_LAYOUT_ID = 'bruno-skill-launch';
const PRO_SPOTLIGHT_MS = 3200;

export function BrunoSkillsExplorer() {
  const reduce = useReducedMotion();
  const { persona } = useBrunoPersona();
  const [activeSkill, setActiveSkill] = useState<BrunoSkillKey>('schedule_repair');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [demoKey, setDemoKey] = useState(0);
  const [showLayoutMorph, setShowLayoutMorph] = useState(false);
  const [proSpotlightActive, setProSpotlightActive] = useState(false);
  const [toRect, setToRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isLg, setIsLg] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const demoPanelRef = useRef<HTMLDivElement>(null);
  const [proSwarmRects, setProSwarmRects] = useState<{ from: DOMRect; to: DOMRect } | null>(null);
  const [demoRect, setDemoRect] = useState<DOMRect | null>(null);
  const proSpotlightShownRef = useRef(false);
  const recessTimerRef = useRef<number | null>(null);
  const [orbitRecessed, setOrbitRecessed] = useState(false);

  const clearRecessTimer = useCallback(() => {
    if (recessTimerRef.current) {
      window.clearTimeout(recessTimerRef.current);
      recessTimerRef.current = null;
    }
  }, []);

  const scheduleOrbitReturn = useCallback(() => {
    clearRecessTimer();
    recessTimerRef.current = window.setTimeout(() => {
      setOrbitRecessed(false);
      recessTimerRef.current = null;
    }, DEMO_FOCUS_MS);
  }, [clearRecessTimer]);

  const handleLanded = useCallback((skill: BrunoSkillKey) => {
    setActiveSkill(skill);
    setDemoKey((k) => k + 1);
    setShowLayoutMorph(false);
    setHasInteracted(true);
  }, []);

  const {
    phase,
    launchSkill,
    fromRect,
    launchId,
    landingRef,
    launch,
    completeLaunch,
    getLandingRect,
    isLaunching,
  } = useSkillLaunchAnimation({
    reduceMotion: Boolean(reduce),
    onLanded: handleLanded,
  });

  useEffect(() => {
    const mqMobile = window.matchMedia('(max-width: 1023px)');
    const mqLg = window.matchMedia('(min-width: 1024px)');
    const update = () => {
      setIsMobile(mqMobile.matches);
      setIsLg(mqLg.matches);
    };
    update();
    mqMobile.addEventListener('change', update);
    mqLg.addEventListener('change', update);
    return () => {
      mqMobile.removeEventListener('change', update);
      mqLg.removeEventListener('change', update);
    };
  }, []);

  useEffect(() => {
    if (reduce || hasInteracted || proSpotlightShownRef.current) return;
    if (typeof window !== 'undefined' && sessionStorage.getItem(PRO_SPOTLIGHT_STORAGE_KEY)) return;

    const stage = stageRef.current;
    if (!stage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || proSpotlightShownRef.current) return;
        proSpotlightShownRef.current = true;
        sessionStorage.setItem(PRO_SPOTLIGHT_STORAGE_KEY, '1');

        window.setTimeout(() => {
          setProSpotlightActive(true);
          window.setTimeout(() => setProSpotlightActive(false), PRO_SPOTLIGHT_MS);
        }, 2000);
      },
      { threshold: 0.4 },
    );

    observer.observe(stage);
    return () => observer.disconnect();
  }, [reduce, hasInteracted]);

  useEffect(() => {
    if (phase !== 'launching') return;
    setDemoRect(demoPanelRef.current?.getBoundingClientRect() ?? null);
  }, [phase, launchId]);

  useEffect(() => {
    if (!proSpotlightActive || reduce) {
      setProSwarmRects(null);
      return;
    }

    const frame = requestAnimationFrame(() => {
      const card = stageRef.current?.querySelector<HTMLElement>('[data-skill-key="integrations"]');
      const demo = demoPanelRef.current;
      if (!card || !demo) return;
      setProSwarmRects({
        from: card.getBoundingClientRect(),
        to: demo.getBoundingClientRect(),
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [proSpotlightActive, reduce]);

  useEffect(() => {
    if (phase !== 'launching' || !fromRect) return;

    const frame = requestAnimationFrame(() => {
      setToRect(getLandingRect());
    });

    return () => cancelAnimationFrame(frame);
  }, [phase, fromRect, getLandingRect, launchId]);

  const handleSkillSelect = useCallback(
    (skill: BrunoSkillCardData, el: HTMLElement) => {
      if (isLaunching) return;

      setHasInteracted(true);
      setProSpotlightActive(false);
      setOrbitRecessed(true);
      clearRecessTimer();

      if (reduce) {
        setActiveSkill(skill.key);
        setDemoKey((k) => k + 1);
        scheduleOrbitReturn();
        return;
      }

      launch(skill, el);
    },
    [isLaunching, launch, reduce, clearRecessTimer, scheduleOrbitReturn],
  );

  const handleLaunchComplete = useCallback(() => {
    completeLaunch();
    setToRect(null);
    scheduleOrbitReturn();
  }, [completeLaunch, scheduleOrbitReturn]);

  useEffect(() => () => clearRecessTimer(), [clearRecessTimer]);

  const demoPanel = (
    <div
      ref={demoPanelRef}
      className={cn(
        'relative rounded-[28px] border border-[var(--color-line)]/70 bg-[var(--color-surface-raised)]/78 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.12)] backdrop-blur-md transition-opacity duration-300 sm:p-6',
        isLaunching && 'opacity-35',
      )}
    >
      <div
        ref={landingRef}
        data-skill-landing
        className="pointer-events-none absolute right-6 top-6 z-0 h-11 w-44 rounded-2xl sm:right-8 sm:top-8 sm:h-12 sm:w-48"
        aria-hidden
      />

      <BrunoSkillLaunchProvider userBubbleLayoutId={USER_BUBBLE_LAYOUT_ID} showLayoutMorph={showLayoutMorph}>
        <BrunoScenarioPanel key={`${persona}-${activeSkill}-${demoKey}`} skill={activeSkill} />
      </BrunoSkillLaunchProvider>
    </div>
  );

  const useOrbitLayout = isLg && !reduce;

  return (
    <LayoutGroup>
      <div className="flex flex-col gap-6">
        <div className="relative">
          {useOrbitLayout ? (
            <BrunoSkillsOrbit
              stageRef={stageRef}
              activeSkill={activeSkill}
              isLaunching={isLaunching}
              orbitRecessed={orbitRecessed}
              launchingSkillKey={launchSkill?.key ?? null}
              proSpotlightActive={proSpotlightActive}
              onSkillSelect={handleSkillSelect}
            >
              {demoPanel}
            </BrunoSkillsOrbit>
          ) : (
            <div ref={stageRef} className="flex flex-col gap-4">
              {reduce ? (
                <StaticSkillGrid
                  activeSkill={activeSkill}
                  isLaunching={isLaunching}
                  onSkillSelect={handleSkillSelect}
                />
              ) : (
                <MobileSkillStrip
                  activeSkill={activeSkill}
                  isLaunching={isLaunching}
                  orbitRecessed={orbitRecessed}
                  onSkillSelect={handleSkillSelect}
                />
              )}
              {demoPanel}
            </div>
          )}
        </div>

        <p className="text-center font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-soft)]">
          {SKILL_CAPTIONS[activeSkill]}
        </p>

        {activeSkill === PRO_SKILL_KEY && hasInteracted && (
          <p className="text-center text-[13px] text-[var(--color-paper)]/75">
            Pro unlocks Notion, Slack &amp; Linear in chat.{' '}
            <Link
              href="/pricing"
              className="font-medium text-[var(--color-honey)] underline decoration-[var(--color-honey)]/40 underline-offset-2 transition-colors hover:text-[var(--color-paper)]"
            >
              See Pro features
            </Link>
          </p>
        )}

        <div className="flex flex-col items-center gap-3 text-center">
          <Link
            href="/signup"
            className="rounded-full bg-[var(--color-ocean)] px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--color-ocean-deep)]"
          >
            Start free — try Bruno
          </Link>
          <p className="max-w-sm text-[13px] text-[var(--color-ink-soft)]">
            5 Bruno asks a day on Free. Pro lifts the limit and unlocks connected apps.
          </p>
        </div>
      </div>

      {proSwarmRects && (
        <ProIntegrationSwarm
          fromRect={proSwarmRects.from}
          toRect={proSwarmRects.to}
          variant="spotlight"
        />
      )}

      {phase === 'launching' && launchSkill && fromRect && (
        <SkillLaunchOverlay
          key={launchId}
          skill={launchSkill}
          fromRect={fromRect}
          toRect={toRect}
          demoRect={demoRect}
          mobile={isMobile}
          onComplete={handleLaunchComplete}
        />
      )}
    </LayoutGroup>
  );
}
