'use client';

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';

export interface HandoffPoint {
  x: number;
  y: number;
}

interface HeroHandoffContextValue {
  heroViewportRef: RefObject<HTMLDivElement | null>;
  demoIntakeRef: RefObject<HTMLDivElement | null>;
  intakePoint: HandoffPoint | null;
  /** Fallback intake target when ref not measured yet (px from hero center). */
  fallbackIntake: HandoffPoint;
}

const HeroHandoffContext = createContext<HeroHandoffContextValue | null>(null);

const DEFAULT_FALLBACK_INTAKE: HandoffPoint = { x: 0, y: 300 };

function centerRelativeTo(container: DOMRect, target: DOMRect): HandoffPoint {
  return {
    x: target.left + target.width / 2 - (container.left + container.width / 2),
    y: target.top + target.height * 0.15 - (container.top + container.height / 2),
  };
}

export function HeroHandoffProvider({
  children,
  fallbackIntake = DEFAULT_FALLBACK_INTAKE,
}: {
  children: ReactNode;
  fallbackIntake?: HandoffPoint;
}) {
  const heroViewportRef = useRef<HTMLDivElement>(null);
  const demoIntakeRef = useRef<HTMLDivElement>(null);
  const [intakePoint, setIntakePoint] = useState<HandoffPoint | null>(null);

  const measure = useCallback(() => {
    const hero = heroViewportRef.current;
    const intake = demoIntakeRef.current;
    if (!hero || !intake) return;
    const heroRect = hero.getBoundingClientRect();
    const intakeRect = intake.getBoundingClientRect();
    if (heroRect.width === 0 || intakeRect.width === 0) return;
    setIntakePoint(centerRelativeTo(heroRect, intakeRect));
  }, []);

  useLayoutEffect(() => {
    measure();
    const hero = heroViewportRef.current;
    if (!hero) return;

    let raf = 0;
    let retries = 0;
    const maxRetries = 120;

    const retryMeasure = () => {
      measure();
      const intake = demoIntakeRef.current;
      if (intake) {
        observer.observe(intake);
        return;
      }
      if (retries < maxRetries) {
        retries += 1;
        raf = requestAnimationFrame(retryMeasure);
      }
    };

    const observer = new ResizeObserver(measure);
    observer.observe(hero);
    raf = requestAnimationFrame(retryMeasure);

    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  const value = useMemo(
    () => ({
      heroViewportRef,
      demoIntakeRef,
      intakePoint,
      fallbackIntake,
    }),
    [intakePoint, fallbackIntake],
  );

  return <HeroHandoffContext.Provider value={value}>{children}</HeroHandoffContext.Provider>;
}

export function useHeroHandoff(): HeroHandoffContextValue {
  const ctx = useContext(HeroHandoffContext);
  if (!ctx) {
    return {
      heroViewportRef: { current: null },
      demoIntakeRef: { current: null },
      intakePoint: null,
      fallbackIntake: DEFAULT_FALLBACK_INTAKE,
    };
  }
  return ctx;
}
