'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CommandBoard } from '@/components/command/CommandBoard';
import { CaptureFlowDemo } from './CaptureFlowDemo';
import { DemoStateDots, DEMO_STATES, type DemoState } from './DemoStateDots';
import { DemoCursor, targetCenter, type CursorPoint } from '../motion/DemoCursor';
import { makeBoardFixture } from './fixtures';

const noop = () => {};

// Hero ends on the calm board; "Plan my day" gets its own dedicated section
// so its timeline animation is never duplicated here.
type HeroStage = 'capture' | 'board';

const HERO_DEMO_STATES = DEMO_STATES.filter((s) => s.id !== 'plan');

function heroDotForStage(stage: HeroStage, capturePreview: boolean): DemoState {
  if (stage === 'capture') return capturePreview ? 'preview' : 'dump';
  return 'board';
}

/**
 * Hero product demo — cursor clicks drive every transition (no magic fades).
 * Capture + review share one flow; board and plan advance via cursor on step dots.
 */
export function CommandHeroDemo() {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<HeroStage>('capture');
  const [capturePreview, setCapturePreview] = useState(false);
  const [paused, setPaused] = useState(false);
  const [cursor, setCursor] = useState<CursorPoint>({ x: 20, y: 20 });
  const [clicking, setClicking] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [captureKey, setCaptureKey] = useState(0);
  const [now] = useState(() => new Date());

  const board = useMemo(() => makeBoardFixture(now), [now]);

  const moveTo = useCallback((selector: string) => {
    const point = targetCenter(containerRef.current, selector);
    if (point) setCursor(point);
    setCursorVisible(true);
  }, []);

  const playClick = useCallback(() => {
    setClicking(true);
    return new Promise<void>((resolve) => {
      window.setTimeout(() => {
        setClicking(false);
        resolve();
      }, 320);
    });
  }, []);

  // After board/plan stages, cursor clicks the next step dot.
  useEffect(() => {
    if (reduce || paused || stage === 'capture') return;

    let cancelled = false;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(() => {
          if (!cancelled) resolve();
        }, ms);
      });

    async function run() {
      await wait(3200);
      if (cancelled) return;

      moveTo('[data-demo-target="demo-dot-dump"]');
      await wait(550);
      if (cancelled) return;

      await playClick();
      if (cancelled) return;

      setCaptureKey((k) => k + 1);
      setCapturePreview(false);
      setStage('capture');
      setCursorVisible(false);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [stage, reduce, paused, moveTo, playClick]);

  if (reduce) {
    return (
      <div className="rounded-[28px] border border-[var(--color-line-strong)] bg-[var(--color-paper)] p-4 shadow-xl sm:p-6">
        <CommandBoard
          board={board}
          now={now}
          selectedId={null}
          onSelect={noop}
          onToggleDone={noop}
        />
      </div>
    );
  }

  let panel: React.ReactNode;
  switch (stage) {
    case 'capture':
      panel = (
        <CaptureFlowDemo
          key={captureKey}
          paused={paused}
          onPreviewChange={setCapturePreview}
          onConfirmed={() => {
            setCursorVisible(false);
            setStage('board');
          }}
        />
      );
      break;
    case 'board':
      panel = (
        <div className="min-h-[380px] overflow-hidden rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-paper)] p-4">
          <CommandBoard
            board={board}
            now={now}
            selectedId={null}
            onSelect={noop}
            onToggleDone={noop}
          />
        </div>
      );
      break;
    default: {
      const exhaustive: never = stage;
      throw new Error(`Unhandled hero stage: ${exhaustive}`);
    }
  }

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="flex flex-col gap-4"
    >
      <div
        ref={containerRef}
        aria-hidden
        className="relative rounded-[28px] border border-[var(--color-line-strong)] bg-[var(--color-paper)] p-4 shadow-xl sm:p-6"
      >
        <motion.div
          key={stage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {panel}
        </motion.div>
        {stage !== 'capture' && (
          <DemoCursor point={cursor} visible={cursorVisible} clicking={clicking} />
        )}
      </div>
      <DemoStateDots
        states={HERO_DEMO_STATES}
        active={heroDotForStage(stage, capturePreview)}
        onJump={(state) => {
          if (state === 'dump' || state === 'preview') {
            setCaptureKey((k) => k + 1);
            setCapturePreview(state === 'preview');
            setStage('capture');
          } else if (state === 'board') {
            setStage('board');
          }
        }}
      />
    </div>
  );
}
