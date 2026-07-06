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

function useTypewriter(text: string, active: boolean, speedMs = 14): string {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) {
      setCount(0);
      return;
    }
    setCount(0);
    const id = window.setInterval(() => {
      setCount((c) => {
        if (c >= text.length) {
          window.clearInterval(id);
          return c;
        }
        return c + 1;
      });
    }, speedMs);
    return () => window.clearInterval(id);
  }, [text, active, speedMs]);
  return text.slice(0, count);
}

/**
 * Shared capture → review demo: typewriter dump, cursor clicks Clear My Plate,
 * then cursor clicks Add to Command. Used in hero and Capture feature section.
 */
export function CaptureFlowDemo({
  compact = false,
  paused = false,
  onConfirmed,
  onPreviewChange,
}: {
  compact?: boolean;
  paused?: boolean;
  /** Called after the confirm click — hero uses this to advance to board. */
  onConfirmed?: () => void;
  /** Fires when the review panel opens or closes. */
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
  const typed = useTypewriter(DUMP_TEXT, phase === 'typing' && !reduce && !paused);

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
    if (reduce || paused) return;

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
          await wait(DUMP_TEXT.length * 14 + 600);
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
        case 'hold': {
          await wait(onConfirmed ? 400 : 2400);
          if (cancelled) return;
          setShowPreview(false);
          onPreviewChange?.(false);
          setCursorVisible(false);
          setCursor(REST);
          setPhase('typing');
          break;
        }
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
