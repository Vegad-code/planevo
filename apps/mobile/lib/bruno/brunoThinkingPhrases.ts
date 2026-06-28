import type { ChatStatus } from 'ai';
import type { BrunoProgressStep } from './bruno-progress';

export const BRUNO_START_VERB = 'thinking' as const;
export const BRUNO_PROMINENT_VERB = 'cooking' as const;

export const BRUNO_ROTATION_VERBS = [
  'crafting',
  'pondering',
  'brewing',
] as const;

export type BrunoRotationVerb = (typeof BRUNO_ROTATION_VERBS)[number];

export type BrunoThinkingVerb =
  | typeof BRUNO_START_VERB
  | typeof BRUNO_PROMINENT_VERB
  | BrunoRotationVerb;

export const BRUNO_FINALIZING_VERB = 'finalizing' as const;

export type BrunoThinkingPhaseVerb =
  | BrunoThinkingVerb
  | typeof BRUNO_FINALIZING_VERB;

export const BRUNO_THINKING_PREFIX = 'Bruno is';

export function shuffleRotationVerbs(
  verbs: readonly BrunoRotationVerb[] = BRUNO_ROTATION_VERBS
): BrunoRotationVerb[] {
  const next = [...verbs];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function buildVerbSequence(): BrunoThinkingVerb[] {
  return [
    BRUNO_START_VERB,
    BRUNO_PROMINENT_VERB,
    ...shuffleRotationVerbs(),
  ];
}

export function formatBrunoVerbText(verb: BrunoThinkingPhaseVerb): string {
  return `${verb}...`;
}

export function formatBrunoThinkingParts(verb: BrunoThinkingPhaseVerb): {
  prefix: string;
  verbText: string;
} {
  return {
    prefix: BRUNO_THINKING_PREFIX,
    verbText: formatBrunoVerbText(verb),
  };
}

export function formatBrunoThinkingLabel(verb: BrunoThinkingPhaseVerb): string {
  return `${BRUNO_THINKING_PREFIX} ${formatBrunoVerbText(verb)}`;
}

export function formatBrunoHeaderLabel(verb: BrunoThinkingPhaseVerb): string {
  const capitalized = verb.charAt(0).toUpperCase() + verb.slice(1);
  return `${capitalized}...`;
}

export const BRUNO_SEQUENCE_LOOP_INDEX = 1;

type FinalizingPhaseInput = {
  progressSteps: BrunoProgressStep[];
  progressSummary: string | null;
  chatStatus: ChatStatus;
  assistantAnswerText: string | null;
};

const GENERATE_STEP_ID = 'generate';

export function isBrunoFinalizingPhase(input: FinalizingPhaseInput): boolean {
  const generateActive = input.progressSteps.some(
    (step) => step.id === GENERATE_STEP_ID && step.status === 'active'
  );
  const writingSummary = input.progressSummary === 'Writing response';
  const hasStreamedText = Boolean(input.assistantAnswerText?.length);
  const isStreaming = input.chatStatus === 'streaming';

  return generateActive || writingSummary || (isStreaming && hasStreamedText);
}
