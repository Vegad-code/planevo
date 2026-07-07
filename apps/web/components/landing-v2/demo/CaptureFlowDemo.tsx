'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CommandCapture } from '@/components/command/CommandCapture';
import { CommandPreviewPanel } from '@/components/command/CommandPreviewPanel';
import { DemoCursor } from '../motion/DemoCursor';
import { PREVIEW_SUMMARY, DUMP_TEXT, makePreviewDrafts } from './fixtures';
import {
  useCaptureFlowDemo,
  type CaptureFlowDemoController,
  type CaptureFlowStep,
  type UseCaptureFlowDemoOptions,
} from './useCaptureFlowDemo';

const noop = () => {};

export type { CaptureFlowStep, CaptureFlowDemoController };

export interface CaptureFlowDemoProps extends UseCaptureFlowDemoOptions {
  compact?: boolean;
  /** Parent-owned controller — when set, hook runs in the parent instead. */
  controller?: CaptureFlowDemoController;
  onTakeover?: () => void;
}

function CaptureFlowStage({
  compact = false,
  demo,
  onTakeover,
}: {
  compact?: boolean;
  demo: CaptureFlowDemoController;
  onTakeover?: () => void;
}) {
  const {
    containerRef,
    reduce,
    mode,
    typedText,
    typedLength,
    showCaret,
    showPreview,
    cursor,
    cursorVisible,
    clicking,
    submitPressed,
    confirmPressed,
    takeover,
    handleManualSubmit,
    handleManualConfirm,
  } = demo;

  const [now] = useState(() => new Date());
  const drafts = useMemo(() => makePreviewDrafts(now), [now]);

  const handleTakeover = () => {
    takeover();
    onTakeover?.();
  };

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

  const isManual = mode === 'manual';
  const scriptedText = isManual ? undefined : typedLength > 0 ? typedText : undefined;

  return (
    <div
      ref={containerRef}
      onFocusCapture={!isManual ? handleTakeover : undefined}
      className={[
        'relative mx-auto w-full',
        compact ? 'max-w-md' : 'max-w-xl',
        !isManual ? 'cursor-none' : '',
      ].join(' ')}
    >
      <div className="min-h-[400px] sm:min-h-[420px]">
        <AnimatePresence mode="wait">
          {!showPreview ? (
            <motion.div
              key="capture"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <CommandCapture
                variant="hero"
                submitting={false}
                onSubmit={isManual ? () => handleManualSubmit() : noop}
                scriptedText={scriptedText}
                seedText={
                  isManual && typedLength > 0 ? DUMP_TEXT.slice(0, typedLength) : undefined
                }
                showCaret={showCaret}
                demoPressed={submitPressed}
              />
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <CommandPreviewPanel
                summary={PREVIEW_SUMMARY}
                drafts={drafts}
                now={now}
                submitting={false}
                onChange={noop}
                onConfirm={isManual ? handleManualConfirm : noop}
                onDiscard={noop}
                demoPressed={confirmPressed}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <DemoCursor point={cursor} visible={cursorVisible} clicking={clicking} />
    </div>
  );
}

/**
 * Shared capture → review demo: rAF typewriter, cursor clicks Clear My Plate,
 * then cursor clicks Add to Command. Plays once — no infinite loop.
 */
export function CaptureFlowDemo({
  compact = false,
  paused = false,
  autoPlay = true,
  onConfirmed,
  onPreviewChange,
  onStepChange,
  controller,
  onTakeover,
}: CaptureFlowDemoProps) {
  if (controller) {
    return <CaptureFlowStage compact={compact} demo={controller} onTakeover={onTakeover} />;
  }

  return (
    <CaptureFlowDemoInner
      compact={compact}
      paused={paused}
      autoPlay={autoPlay}
      onConfirmed={onConfirmed}
      onPreviewChange={onPreviewChange}
      onStepChange={onStepChange}
      onTakeover={onTakeover}
    />
  );
}

function CaptureFlowDemoInner(props: CaptureFlowDemoProps) {
  const demo = useCaptureFlowDemo({
    paused: props.paused,
    autoPlay: props.autoPlay,
    onConfirmed: props.onConfirmed,
    onPreviewChange: props.onPreviewChange,
    onStepChange: props.onStepChange,
  });

  return <CaptureFlowStage compact={props.compact} demo={demo} onTakeover={props.onTakeover} />;
}
