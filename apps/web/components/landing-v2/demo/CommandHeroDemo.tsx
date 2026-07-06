'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CommandBoard } from '@/components/command/CommandBoard';
import { CaptureFlowDemo } from './CaptureFlowDemo';
import { DemoStateDots, DEMO_STATES, type DemoState } from './DemoStateDots';
import { DemoCursor, type CursorPoint } from '../motion/DemoCursor';
import { makeBoardFixture } from './fixtures';

const noop = () => {};

type HeroStage = 'capture' | 'board';

const HERO_DEMO_STATES = DEMO_STATES.filter((s) => s.id !== 'plan');

function heroDotForStage(stage: HeroStage, capturePreview: boolean): DemoState {
  if (stage === 'capture') return capturePreview ? 'preview' : 'dump';
  return 'board';
}

/**
 * Hero product demo — plays capture → board once, then rests. Replay restarts the flow.
 */
export function CommandHeroDemo() {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<HeroStage>('capture');
  const [capturePreview, setCapturePreview] = useState(false);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [runId, setRunId] = useState(0);
  const [cursor, setCursor] = useState<CursorPoint>({ x: 20, y: 20 });
  const [clicking, setClicking] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [captureKey, setCaptureKey] = useState(0);
  const [now] = useState(() => new Date());

  const board = useMemo(() => makeBoardFixture(now), [now]);

  useEffect(() => {
    if (reduce || paused || stage !== 'board' || finished) return;
    const id = window.setTimeout(() => {
      setCursorVisible(false);
      setFinished(true);
    }, 2600);
    return () => window.clearTimeout(id);
  }, [stage, reduce, paused, finished]);

  const replay = useCallback(() => {
    setFinished(false);
    setCapturePreview(false);
    setCaptureKey((k) => k + 1);
    setRunId((r) => r + 1);
    setStage('capture');
  }, []);

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
          key={`${captureKey}-${runId}`}
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
            setFinished(false);
            setCaptureKey((k) => k + 1);
            setCapturePreview(state === 'preview');
            setStage('capture');
          } else if (state === 'board') {
            setStage('board');
          }
        }}
      />
      {finished && (
        <button
          type="button"
          onClick={replay}
          className="mx-auto rounded-full border border-[var(--color-line-strong)] bg-[var(--color-paper)] px-4 py-1.5 text-[13px] font-medium text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
        >
          Replay demo ↺
        </button>
      )}
    </div>
  );
}
