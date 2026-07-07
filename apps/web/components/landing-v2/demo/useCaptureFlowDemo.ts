'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { measureDemoTarget, type CursorPoint, type DemoTargetAnchor } from '../motion/DemoCursor';
import { DUMP_TEXT } from './fixtures';

export type CaptureFlowStep = 'dump' | 'preview' | 'board';
export type CaptureFlowMode = 'auto' | 'manual';

type AutoBeat =
  | 'typing'
  | 'pause-before-submit'
  | 'move-to-submit'
  | 'click-submit'
  | 'preview-dwell'
  | 'move-to-confirm'
  | 'click-confirm'
  | 'complete';

const CHARS_PER_SECOND = 55;
const PAUSE_AFTER_TYPING_MS = 600;
const PAUSE_BEFORE_SUBMIT_MS = 650;
const MOVE_HOLD_MS = 280;
const CLICK_MS = 320;
const PREVIEW_DWELL_MS = 1100;
const PAUSE_BEFORE_CONFIRM_MS = 650;
const CONFIRM_HOLD_MS = 280;
const BOARD_REST_MS = 2600;

const TEXTAREA_SELECTOR = '[data-demo-target="capture-textarea"]';
const SUBMIT_SELECTOR = '[data-demo-target="clear-my-plate"]';
const CONFIRM_SELECTOR = '[data-demo-target="add-to-command"]';

const DEFAULT_CURSOR: CursorPoint = { x: 48, y: 88 };

export interface UseCaptureFlowDemoOptions {
  paused?: boolean;
  /** When set, auto-play only runs while true (scroll-into-view gating). */
  autoPlay?: boolean;
  onConfirmed?: () => void;
  onPreviewChange?: (showingPreview: boolean) => void;
  onStepChange?: (step: CaptureFlowStep) => void;
}

export function useCaptureFlowDemo({
  paused = false,
  autoPlay = true,
  onConfirmed,
  onPreviewChange,
  onStepChange,
}: UseCaptureFlowDemoOptions = {}) {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const typingStartRef = useRef<number | null>(null);
  const beatStartRef = useRef<number | null>(null);
  const timelinePausedRef = useRef(false);
  const clickStartedRef = useRef(false);

  const [playKey, setPlayKey] = useState(0);
  const [mode, setMode] = useState<CaptureFlowMode>('auto');
  const [step, setStep] = useState<CaptureFlowStep>('dump');
  const [beat, setBeat] = useState<AutoBeat>('typing');
  const [typedLength, setTypedLength] = useState(0);
  const [cursor, setCursor] = useState<CursorPoint>(DEFAULT_CURSOR);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [clicking, setClicking] = useState(false);
  const [pressedTarget, setPressedTarget] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const measure = useCallback((selector: string, anchor: DemoTargetAnchor = 'center') => {
    return measureDemoTarget(containerRef.current, selector, anchor);
  }, []);

  const onStepChangeRef = useRef<typeof onStepChange>(undefined);
  const onPreviewChangeRef = useRef<typeof onPreviewChange>(undefined);
  const onConfirmedRef = useRef<typeof onConfirmed>(undefined);
  const beatRef = useRef<AutoBeat>('typing');

  useEffect(() => {
    onStepChangeRef.current = onStepChange;
    onPreviewChangeRef.current = onPreviewChange;
    onConfirmedRef.current = onConfirmed;
  }, [onStepChange, onPreviewChange, onConfirmed]);

  useEffect(() => {
    beatRef.current = beat;
  }, [beat]);

  const applyCaptureStep = useCallback((next: CaptureFlowStep) => {
    setStep(next);
    onStepChangeRef.current?.(next);
    onPreviewChangeRef.current?.(next === 'preview');
  }, []);

  const replay = useCallback(() => {
    setPlayKey((k) => k + 1);
  }, []);

  const takeover = useCallback(() => {
    if (mode === 'manual') return;
    timelinePausedRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setMode('manual');
    setCursorVisible(false);
    setClicking(false);
    setPressedTarget(null);
    if (beat === 'typing' || beat === 'pause-before-submit' || beat === 'move-to-submit' || beat === 'click-submit') {
      applyCaptureStep('dump');
    } else if (
      beat === 'preview-dwell' ||
      beat === 'move-to-confirm' ||
      beat === 'click-confirm' ||
      beat === 'complete'
    ) {
      applyCaptureStep('preview');
    }
  }, [mode, beat, applyCaptureStep]);

  const jumpTo = useCallback(
    (target: CaptureFlowStep) => {
      timelinePausedRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setClicking(false);
      setPressedTarget(null);
      setFinished(false);

      if (target === 'dump') {
        setMode('auto');
        setBeat('typing');
        setTypedLength(0);
        typingStartRef.current = null;
        beatStartRef.current = null;
        timelinePausedRef.current = false;
        setCursorVisible(false);
        applyCaptureStep('dump');
        setPlayKey((k) => k + 1);
        return;
      }

      if (target === 'preview') {
        setMode('manual');
        setBeat('preview-dwell');
        setTypedLength(DUMP_TEXT.length);
        setCursorVisible(false);
        applyCaptureStep('preview');
        return;
      }

      setMode('manual');
      setBeat('complete');
      setTypedLength(DUMP_TEXT.length);
      setCursorVisible(false);
      applyCaptureStep('board');
      onConfirmedRef.current?.();
    },
    [applyCaptureStep],
  );

  const handleManualSubmit = useCallback(() => {
    applyCaptureStep('preview');
  }, [applyCaptureStep]);

  const handleManualConfirm = useCallback(() => {
    applyCaptureStep('board');
    setFinished(true);
    onConfirmedRef.current?.();
  }, [applyCaptureStep]);

  // Position cursor only when approaching a button — hidden while text types or preview reads.
  useLayoutEffect(() => {
    if (reduce || mode !== 'auto' || step !== 'dump') return;

    if (beat === 'typing') {
      setCursorVisible(false);
      return;
    }

    if (
      beat === 'pause-before-submit' ||
      beat === 'move-to-submit' ||
      beat === 'click-submit'
    ) {
      const point = measure(SUBMIT_SELECTOR, 'center');
      if (point) setCursor(point);
      setCursorVisible(true);
    }
  }, [reduce, mode, step, beat, measure, playKey]);

  useLayoutEffect(() => {
    if (reduce || mode !== 'auto' || step !== 'preview') return;

    if (beat === 'preview-dwell') {
      setCursorVisible(false);
      return;
    }

    if (
      beat === 'move-to-confirm' ||
      beat === 'click-confirm'
    ) {
      const point = measure(CONFIRM_SELECTOR, 'center');
      if (point) setCursor(point);
      setCursorVisible(true);
    }
  }, [reduce, mode, step, beat, measure, playKey]);

  // Reset on replay key only — runs before the rAF loop starts.
  useEffect(() => {
    typingStartRef.current = null;
    beatStartRef.current = null;
    timelinePausedRef.current = false;
    beatRef.current = 'typing';
    setMode('auto');
    setBeat('typing');
    setTypedLength(0);
    setCursor(DEFAULT_CURSOR);
    setCursorVisible(false);
    setClicking(false);
    setPressedTarget(null);
    setFinished(false);
    applyCaptureStep('dump');
  }, [playKey, applyCaptureStep]);

  // Auto-play timeline (single rAF loop).
  useEffect(() => {
    if (reduce || paused || !autoPlay || mode !== 'auto' || timelinePausedRef.current) {
      return;
    }

    let cancelled = false;

    const advanceBeat = (next: AutoBeat) => {
      if (cancelled) return;
      beatStartRef.current = null;
      clickStartedRef.current = false;
      beatRef.current = next;
      setBeat(next);
    };

    const tick = (t: number) => {
      if (cancelled || timelinePausedRef.current) return;

      if (typingStartRef.current === null) typingStartRef.current = t;
      if (beatStartRef.current === null) beatStartRef.current = t;

      const elapsed = t - typingStartRef.current;
      const beatElapsed = t - beatStartRef.current;
      const currentBeat = beatRef.current;

      switch (currentBeat) {
        case 'typing': {
          const typingMs = (DUMP_TEXT.length / CHARS_PER_SECOND) * 1000 + PAUSE_AFTER_TYPING_MS;
          const nextLen = Math.min(
            DUMP_TEXT.length,
            Math.floor((elapsed / 1000) * CHARS_PER_SECOND),
          );
          setTypedLength(nextLen);
          if (elapsed >= typingMs) {
            const rest = measure(TEXTAREA_SELECTOR, 'text-start');
            if (rest) setCursor(rest);
            setCursorVisible(true);
            advanceBeat('pause-before-submit');
          }
          break;
        }
        case 'pause-before-submit': {
          if (beatElapsed >= PAUSE_BEFORE_SUBMIT_MS) {
            advanceBeat('move-to-submit');
          }
          break;
        }
        case 'move-to-submit': {
          if (beatElapsed >= MOVE_HOLD_MS) {
            advanceBeat('click-submit');
          }
          break;
        }
        case 'click-submit': {
          if (!clickStartedRef.current) {
            clickStartedRef.current = true;
            setClicking(true);
            setPressedTarget(SUBMIT_SELECTOR);
          }
          if (beatElapsed >= CLICK_MS) {
            setClicking(false);
            setPressedTarget(null);
            applyCaptureStep('preview');
            advanceBeat('preview-dwell');
          }
          break;
        }
        case 'preview-dwell': {
          if (beatElapsed >= PREVIEW_DWELL_MS) {
            setCursorVisible(true);
            advanceBeat('move-to-confirm');
          }
          break;
        }
        case 'move-to-confirm': {
          if (beatElapsed >= PAUSE_BEFORE_CONFIRM_MS + CONFIRM_HOLD_MS) {
            advanceBeat('click-confirm');
          }
          break;
        }
        case 'click-confirm': {
          if (!clickStartedRef.current) {
            clickStartedRef.current = true;
            setClicking(true);
            setPressedTarget(CONFIRM_SELECTOR);
          }
          if (beatElapsed >= CLICK_MS) {
            setClicking(false);
            setPressedTarget(null);
            applyCaptureStep('board');
            onConfirmedRef.current?.();
            advanceBeat('complete');
          }
          break;
        }
        case 'complete': {
          if (beatElapsed >= BOARD_REST_MS) {
            setFinished(true);
          }
          break;
        }
        default: {
          const exhaustive: never = currentBeat;
          throw new Error(`Unhandled auto beat: ${exhaustive}`);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [reduce, paused, autoPlay, mode, playKey, measure, applyCaptureStep]);

  const typedText =
    mode === 'manual' && step === 'dump'
      ? undefined
      : DUMP_TEXT.slice(0, typedLength);

  const showCaret =
    mode === 'auto' && beat === 'typing' && typedLength < DUMP_TEXT.length;

  const showPreview = step !== 'dump';
  const submitPressed = pressedTarget === SUBMIT_SELECTOR;
  const confirmPressed = pressedTarget === CONFIRM_SELECTOR;

  return {
    containerRef,
    reduce: Boolean(reduce),
    mode,
    step,
    beat,
    typedText,
    typedLength,
    showCaret,
    showPreview,
    cursor,
    cursorVisible: mode === 'auto' && cursorVisible,
    clicking,
    submitPressed,
    confirmPressed,
    finished,
    takeover,
    replay,
    jumpTo,
    handleManualSubmit,
    handleManualConfirm,
    playKey,
  };
}

export type CaptureFlowDemoController = ReturnType<typeof useCaptureFlowDemo>;
