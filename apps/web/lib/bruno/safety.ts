export type DeterministicSafetyResult =
  | { status: 'clear' }
  | { status: 'crisis'; response: string };

const CRISIS_PATTERNS = [
  /\b(kill myself|end my life|commit suicide|suicide plan)\b/i,
  /\b(hurt myself|self[- ]harm)\b.+\b(tonight|now|today|plan|going to)\b/i,
  /\b(i have a plan)\b.+\b(kill myself|suicide|end my life)\b/i,
];

export const BRUNO_CRISIS_RESPONSE = [
  "I'm really sorry you're in this much pain. Your immediate safety matters more than any plan or deadline.",
  'If you may act on this now, call or text 988 in the United States or Canada, or contact your local emergency number.',
  'Move away from anything you could use to hurt yourself and tell a trusted person nearby exactly what is happening. Stay with them while you get help.',
].join('\n\n');

export function checkDeterministicBrunoSafety(
  message: string
): DeterministicSafetyResult {
  if (CRISIS_PATTERNS.some((pattern) => pattern.test(message))) {
    return { status: 'crisis', response: BRUNO_CRISIS_RESPONSE };
  }
  return { status: 'clear' };
}
