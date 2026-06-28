'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ShimmeringText } from '@/components/ui/shimmering-text';
import {
  BRUNO_PROMINENT_VERB,
  type BrunoThinkingPhaseVerb,
} from '@/lib/bruno/brunoThinkingPhrases';
import { cn } from '@/lib/utils';

interface BrunoThinkingIndicatorProps {
  prefix: string;
  verbText: string;
  verb: BrunoThinkingPhaseVerb;
}

export function BrunoThinkingIndicator({
  prefix,
  verbText,
  verb,
}: BrunoThinkingIndicatorProps) {
  const isCooking = verb === BRUNO_PROMINENT_VERB;

  return (
    <div
      className="mr-auto w-full max-w-[min(90%,44rem)]"
      aria-live="polite"
      aria-busy="true"
      aria-label={`${prefix} ${verbText}`}
    >
      <span className="inline-flex items-baseline gap-1.5 text-[15px] font-medium">
        <span className="shrink-0 text-[var(--color-settings-text)]">
          {prefix}
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={verbText}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="inline-block tracking-[-0.01em]"
          >
            <ShimmeringText
              text={verbText}
              className={cn(isCooking && 'font-semibold')}
              shimmerColor={
                isCooking ? 'var(--color-settings-brand)' : undefined
              }
              duration={1.2}
              spread={4}
            />
          </motion.span>
        </AnimatePresence>
      </span>
    </div>
  );
}
