import { describe, expect, it } from 'vitest';
import {
  BRUNO_PROMINENT_VERB,
  BRUNO_ROTATION_VERBS,
  BRUNO_START_VERB,
  BRUNO_THINKING_PREFIX,
  buildVerbSequence,
  formatBrunoThinkingParts,
  shuffleRotationVerbs,
} from '@/lib/bruno/brunoThinkingPhrases';

describe('brunoThinkingPhrases', () => {
  it('buildVerbSequence always starts with thinking then cooking', () => {
    for (let i = 0; i < 20; i += 1) {
      const sequence = buildVerbSequence();
      expect(sequence[0]).toBe(BRUNO_START_VERB);
      expect(sequence[1]).toBe(BRUNO_PROMINENT_VERB);
      expect(sequence).toHaveLength(2 + BRUNO_ROTATION_VERBS.length);
    }
  });

  it('buildVerbSequence includes all rotation verbs in shuffled order', () => {
    const sequence = buildVerbSequence();
    const tail = sequence.slice(2);
    expect(tail.sort()).toEqual([...BRUNO_ROTATION_VERBS].sort());
    expect(new Set(tail).size).toBe(BRUNO_ROTATION_VERBS.length);
  });

  it('shuffleRotationVerbs returns a permutation of rotation verbs', () => {
    const shuffled = shuffleRotationVerbs();
    expect(shuffled.sort()).toEqual([...BRUNO_ROTATION_VERBS].sort());
  });

  it('formatBrunoThinkingParts splits prefix and verb text', () => {
    expect(formatBrunoThinkingParts('cooking')).toEqual({
      prefix: BRUNO_THINKING_PREFIX,
      verbText: 'cooking...',
    });
  });
});
