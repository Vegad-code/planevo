import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BRUNO_FINALIZING_VERB,
  BRUNO_SEQUENCE_LOOP_INDEX,
  buildVerbSequence,
  formatBrunoHeaderLabel,
  formatBrunoThinkingLabel,
  formatBrunoThinkingParts,
  type BrunoThinkingPhaseVerb,
  type BrunoThinkingVerb,
} from '@/lib/bruno/brunoThinkingPhrases';

const ROTATION_INTERVAL_MS = 3500;

type UseBrunoThinkingLabelOptions = {
  isBrunoWorking: boolean;
  isBrunoFinalizing: boolean;
};

function advanceVerbIndex(current: number, sequenceLength: number): number {
  const next = current + 1;
  if (next >= sequenceLength) {
    return BRUNO_SEQUENCE_LOOP_INDEX;
  }
  return next;
}

export function useBrunoThinkingLabel({
  isBrunoWorking,
  isBrunoFinalizing,
}: UseBrunoThinkingLabelOptions) {
  const [sequence, setSequence] = useState<BrunoThinkingVerb[]>(() =>
    buildVerbSequence()
  );
  const [verbIndex, setVerbIndex] = useState(0);
  const wasWorkingRef = useRef(false);

  useEffect(() => {
    const wasWorking = wasWorkingRef.current;
    wasWorkingRef.current = isBrunoWorking;

    if (isBrunoWorking && !wasWorking) {
      setSequence(buildVerbSequence());
      setVerbIndex(0);
    }
  }, [isBrunoWorking]);

  useEffect(() => {
    if (!isBrunoWorking || isBrunoFinalizing) {
      return;
    }

    const timer = setInterval(() => {
      setVerbIndex((current) => advanceVerbIndex(current, sequence.length));
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isBrunoFinalizing, isBrunoWorking, sequence.length]);

  const currentVerb: BrunoThinkingPhaseVerb = isBrunoFinalizing
    ? BRUNO_FINALIZING_VERB
    : sequence[verbIndex] ?? sequence[0];

  return useMemo(() => {
    const { prefix, verbText } = formatBrunoThinkingParts(currentVerb);
    return {
      verb: currentVerb,
      prefix,
      verbText,
      chatLabel: formatBrunoThinkingLabel(currentVerb),
      headerLabel: formatBrunoHeaderLabel(currentVerb),
    };
  }, [currentVerb]);
}
