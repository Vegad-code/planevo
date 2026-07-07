'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CommandBoard } from '@/components/command/CommandBoard';
import { CaptureFlowDemo } from './CaptureFlowDemo';
import { DemoStateDots, DEMO_STATES, type DemoState } from './DemoStateDots';
import { makeBoardFixture } from './fixtures';
import { useCaptureFlowDemo, type CaptureFlowStep } from './useCaptureFlowDemo';

const noop = () => {};

const HERO_DEMO_STATES = DEMO_STATES.filter((s) => s.id !== 'plan');

function stepToDot(step: CaptureFlowStep): DemoState {
  return step;
}

/**
 * Hero product demo — plays capture → board once, then rests. Replay restarts the flow.
 */
export function CommandHeroDemo({ startWhen }: { startWhen?: boolean }) {
  const reduce = useReducedMotion();
  const waitForDeposit = startWhen !== undefined;
  const autoStartedRef = useRef(false);
  const [paused, setPaused] = useState(waitForDeposit && !startWhen);
  const [manualMode, setManualMode] = useState(false);
  const [now] = useState(() => new Date());

  const board = useMemo(() => makeBoardFixture(now), [now]);

  const demo = useCaptureFlowDemo({
    paused: paused && !manualMode,
    autoPlay: true,
  });

  const { step, finished, replay, jumpTo, playKey } = demo;

  useEffect(() => {
    if (!waitForDeposit || reduce) return;

    if (!startWhen) {
      if (!manualMode) setPaused(true);
      autoStartedRef.current = false;
      return;
    }

    if (autoStartedRef.current) return;

    autoStartedRef.current = true;
    setManualMode(false);
    setPaused(false);
    replay();
  }, [startWhen, waitForDeposit, reduce, manualMode, replay]);

  const handleReplay = useCallback(() => {
    autoStartedRef.current = true;
    setManualMode(false);
    setPaused(false);
    replay();
  }, [replay]);

  const handleJump = useCallback(
    (state: DemoState) => {
      setManualMode(true);
      jumpTo(state as CaptureFlowStep);
    },
    [jumpTo],
  );

  const handleTakeover = useCallback(() => {
    setManualMode(true);
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

  const showBoard = step === 'board';

  return (
    <div className="flex flex-col gap-4">
      <div className="relative rounded-[28px] border border-[var(--color-line-strong)] bg-[var(--color-paper)] p-4 shadow-xl sm:p-6">
        <AnimatePresence mode="wait">
          {!showBoard ? (
            <motion.div
              key={`capture-${playKey}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <CaptureFlowDemo
                controller={demo}
                paused={paused && !manualMode}
                onTakeover={handleTakeover}
              />
            </motion.div>
          ) : (
            <motion.div
              key={`board-${playKey}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="min-h-[400px] overflow-hidden rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-paper)] p-4 sm:min-h-[420px]"
            >
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.06 } },
                  }}
                >
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 8 },
                      visible: { opacity: 1, y: 0 },
                    }}
                  >
                    <CommandBoard
                      board={board}
                      now={now}
                      selectedId={null}
                      onSelect={noop}
                      onToggleDone={noop}
                    />
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
      </div>
      <DemoStateDots states={HERO_DEMO_STATES} active={stepToDot(step)} onJump={handleJump} />
      {finished && (
        <button
          type="button"
          onClick={handleReplay}
          className="mx-auto rounded-full border border-[var(--color-line-strong)] bg-[var(--color-paper)] px-4 py-1.5 text-[13px] font-medium text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
        >
          Replay demo ↺
        </button>
      )}
    </div>
  );
}
