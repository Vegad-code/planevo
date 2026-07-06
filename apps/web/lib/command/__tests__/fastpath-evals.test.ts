/**
 * Planevo Command — deterministic fast-path evals (§12.2 cost invariant, §19
 * step 3). `tryFastPath` must ACCEPT simple single-item entries with zero AI
 * cost, and DEFER (return `null`) on anything ambiguous or multi-item so the
 * model only runs when it is actually needed. These are deterministic tests
 * against the real `tryFastPath` — no mocking, since it never calls the model.
 */

import { describe, it, expect } from 'vitest';
import { tryFastPath } from '../fastpath';

const refDate = new Date('2026-07-07T09:00:00-04:00'); // Tuesday

describe('tryFastPath: accepts simple single-item entries', () => {
  const acceptedInputs = [
    'dentist Friday 3pm',
    'call mom tomorrow',
    'gym at 6am tomorrow',
    'team standup Thursday at 10am',
  ];

  it.each(acceptedInputs)('resolves "%s" deterministically without the model', (text) => {
    const result = tryFastPath(text, refDate);
    expect(result).not.toBeNull();
    expect(result?.items).toHaveLength(1);
    expect(result?.items[0].startAt ?? result?.items[0].dueAt).not.toBeNull();
    expect(result?.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('produces a summary referencing the item so the client can render instantly', () => {
    const result = tryFastPath('dentist Friday 3pm', refDate);
    expect(result?.summary).toContain('dentist Friday 3pm');
  });
});

describe('tryFastPath: defers multi-item dumps to the model', () => {
  const multiItemDumps = [
    // §9.1 student dump — six distinct obligations joined by commas/"and".
    'I have a bio lab report due Friday, algebra quiz tomorrow, English essay ' +
      'next week, soccer practice every day at 4, and I need to ask my ' +
      'teacher about missing work. Also I promised my mom I would clean my ' +
      'room before Saturday.',
    // §9.3 corporate dump.
    'Need to send Q3 forecast to Maya by Thursday, prep for 1:1 with Drew ' +
      'tomorrow, Slack from Alex about the onboarding doc, daycare pickup at ' +
      '5, dentist Friday, and I still need to review the product spec ' +
      'before the leadership meeting.',
    // Newline-separated list.
    'call mom\nbuy milk\nfinish essay',
    // Semicolon-separated list.
    'call mom; buy milk; finish essay',
  ];

  it.each(multiItemDumps)('returns null for a multi-item dump', (text) => {
    expect(tryFastPath(text, refDate)).toBeNull();
  });
});

describe('tryFastPath: defers ambiguous single-item input to the model', () => {
  const ambiguousInputs = [
    // No date signal at all — cannot confidently skip the model.
    'buy milk',
    'submit timesheet',
    'pick up dry cleaning',
    // Vague temporal hedge with no resolvable date.
    'maybe clean up the garage sometime',
  ];

  it.each(ambiguousInputs)('returns null for ambiguous input "%s" (no confident date)', (text) => {
    expect(tryFastPath(text, refDate)).toBeNull();
  });
});

describe('tryFastPath: cost invariant (§12.2)', () => {
  it('never returns a result with more than one item', () => {
    // The fast path is defined to handle single-item entries only; anything
    // that could plausibly be multiple items must defer instead of guessing.
    const inputs = ['dentist Friday 3pm', 'call mom tomorrow', 'gym at 6am tomorrow'];
    for (const text of inputs) {
      const result = tryFastPath(text, refDate);
      if (result) {
        expect(result.items.length).toBe(1);
      }
    }
  });

  it('empty input never triggers a fast-path accept', () => {
    expect(tryFastPath('', refDate)).toBeNull();
  });
});
