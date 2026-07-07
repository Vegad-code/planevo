'use client';

import { useReducedMotion } from 'framer-motion';
import { BrunoThinkingIndicator } from '@/components/bruno/BrunoThinkingIndicator';
import {
  BRUNO_PROMINENT_VERB,
  formatBrunoThinkingLabel,
  formatBrunoThinkingParts,
} from '@/lib/bruno/brunoThinkingPhrases';

const COOKING = formatBrunoThinkingParts(BRUNO_PROMINENT_VERB);

/** Landing demos always show Bruno cooking — matches the app stream style, one verb for humor. */
export function BrunoDemoCookingIndicator() {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <p
        className="text-[13px] font-medium text-[var(--color-ink-soft)]"
        aria-live="polite"
        aria-busy="true"
      >
        {formatBrunoThinkingLabel(BRUNO_PROMINENT_VERB)}
      </p>
    );
  }

  return (
    <BrunoThinkingIndicator
      prefix={COOKING.prefix}
      verbText={COOKING.verbText}
      verb={BRUNO_PROMINENT_VERB}
    />
  );
}
