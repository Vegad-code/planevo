export const NLP_PLACEHOLDER = "What's on your plate?";

export const NLP_EMPTY_HINT =
  'Planevo picks up dates and duration as you type.';

export const NLP_GHOST_EXAMPLES = [
  'Essay draft by Friday',
  'Study block tomorrow afternoon',
  'Team sync at 3',
] as const;

export const NLP_SUBMIT_LABEL = 'Capture';

export function getGhostExample(seed: number = Date.now()): string {
  const index = Math.abs(seed) % NLP_GHOST_EXAMPLES.length;
  return NLP_GHOST_EXAMPLES[index];
}
