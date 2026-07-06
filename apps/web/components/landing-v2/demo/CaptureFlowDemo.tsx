'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { CommandCapture } from '@/components/command/CommandCapture';
import { CommandPreviewPanel } from '@/components/command/CommandPreviewPanel';
import { DemoCursor, targetCenter, type CursorPoint } from '../motion/DemoCursor';
import {
  DUMP_TEXT,
  PREVIEW_SUMMARY,
  makePreviewDrafts,
} from './fixtures';

const noop = () => {};

type Phase =
  | 'typing'
  | 'move-submit'
  | 'click-submit'
  | 'preview'
  | 'move-confirm'
  | 'click-confirm'
  | 'hold';

const REST: CursorPoint = { x: 24, y: 24 };
const TYPEWRITER_CPS = 48;

function useRafTypewriter(text: string, active: boolean): string {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) {
      setCount(0);
      return;
    }
    setCount(0);
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const next = Math.min(text.length, Math.floor(elapsed * TYPEWRITER_CPS));
      setCount(next);
      if (next < text.length) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, active]);

  return text.slice(0, count);
}

/** Capture → review demo with rAF typewriter. Plays once — no loop. */
export function CaptureFlowDemo({
  compact = false,
  paused = false,
  onConfirmed,
  onPreviewChange,
}: {
  compact?: boolean;
  paused?: boolean;
  onConfirmed?: () => void;
  onPreviewChange?: (showingPreview: boolean) => void;
}) {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('typing');
  const [showPreview, setShowPreview] = useState(false);
  const [cursor, setCursor] = useState<CursorPoint>(REST);
  const [clicking, setClicking] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [now] = useState(() => new Date());

  const drafts = useMemo(() => makePreviewDrafts(now), [now]);
  const typed = useRafTypewriter(DUMP_TEXT, phase === 'typing' && !reduce && !paused);

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

  useEffect(() => {
    if (reduce || paused || phase === 'hold') return;

    let cancelled = false;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(() => {
          if (!cancelled) resolve();
        }, ms);
      });

    async function run() {
      switch (phase) {
        case 'typing': {
          await wait((DUMP_TEXT.length / TYPEWRITER_CPS) * 1000 + 600);
          if (cancelled) return;
          setPhase('move-submit');
          break;
        }
        case 'move-submit': {
          await wait(400);
          if (cancelled) return;
          moveTo('[data-demo-target="clear-my-plate"]');
          await wait(500);
          if (cancelled) return;
          setPhase('click-submit');
          break;
        }
        case 'click-submit': {
          await playClick();
          if (cancelled) return;
          setShowPreview(true);
          onPreviewChange?.(true);
          setPhase('preview');
          break;
        }
        case 'preview': {
          await wait(900);
          if (cancelled) return;
          setPhase('move-confirm');
          break;
        }
        case 'move-confirm': {
          await wait(350);
          if (cancelled) return;
          moveTo('[data-demo-target="add-to-command"]');
          await wait(500);
          if (cancelled) return;
          setPhase('click-confirm');
          break;
        }
        case 'click-confirm': {
          await playClick();
          if (cancelled) return;
          onConfirmed?.();
          setPhase('hold');
          break;
        }
        case 'hold':
          break;
        default: {
          const exhaustive: never = phase;
          throw new Error(`Unhandled capture demo phase: ${exhaustive}`);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [phase, reduce, paused, moveTo, playClick, onConfirmed, onPreviewChange]);

  if (reduce) {
    return (
      <div className="mx-auto max-w-md">
        <CommandPreviewPanel
          summary={PREVIEW_SUMMARY}
          drafts={drafts}
          now={now}
          submitting={false}
          onChange={noop}
          onConfirm={noop}
          onDiscard={noop}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative mx-auto w-full ${compact ? 'max-w-md' : 'max-w-xl'}`}
    >
      {!showPreview ? (
        <CommandCapture
          variant="hero"
          submitting={false}
          onSubmit={noop}
          scriptedText={typed}
        />
      ) : (
        <CommandPreviewPanel
          summary={PREVIEW_SUMMARY}
          drafts={drafts}
          now={now}
          submitting={false}
          onChange={noop}
          onConfirm={noop}
          onDiscard={noop}
        />
      )}
      <DemoCursor point={cursor} visible={cursorVisible} clicking={clicking} />
    </div>
  );
}
