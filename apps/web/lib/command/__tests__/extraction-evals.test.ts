/**
 * Planevo Command — extraction quality evals (Phase 11, comprehensive.md §11).
 *
 * WHAT THIS FILE IS
 * ------------------
 * This is NOT a live-model eval harness — it never calls `generateObject` or
 * any AI provider. It is a deterministic regression net over the schema +
 * normalize layer, using curated "golden" model outputs
 * (`fixtures/extraction-fixtures.ts`) that represent what a GOOD nano/mini
 * extraction would return for each persona's messy-text dump.
 *
 * For each fixture we run:
 *
 *   modelOutput -> commandExtractionSchema.parse -> normalizeExtraction
 *
 * and assert the quality invariants from §22 (extraction principles) and
 * §10.5 (8-type launch subset) hold on the result:
 *
 *   - correct split count (no false-split / missed-obligation collapse)
 *   - every title survives (nothing silently dropped)
 *   - every normalized type is in the 8-type launch subset
 *   - no invented obligations (titles the input never mentioned)
 *   - ambiguous dates end up `needsReview: true`
 *
 * WHY CURATED FIXTURES, NOT LIVE CALLS
 * -------------------------------------
 * Tests must be deterministic and run with no network/API keys. The curated
 * `modelOutput` in each fixture stands in for "what gpt-5.4-nano/mini would
 * return on a good day." This does NOT verify the *model* is accurate — it
 * verifies that Planevo's schema validation and normalization layer correctly
 * enforces the product's quality invariants on whatever the model returns,
 * including 16-type drift, forgotten `needsReview` flags, and prompt
 * injection embedded in user text. If `schema.ts` or `normalize.ts` regress,
 * these tests fail before a prompt/model change ever reaches production.
 *
 * ADDING A FIXTURE
 * -----------------
 * 1. Add a `text` input under the right persona (see §9.1–9.4 for the
 *    canonical dumps; §9.1 = student, §9.2 = college, §9.3 = corporate,
 *    §9.4 = creative; parent-professional and adversarial cases are
 *    composed, not lifted from the plan verbatim — see fixtures file).
 * 2. Hand-write the `modelOutput` a good model should produce: one item per
 *    real obligation, ISO dates only when confidently resolvable, ambiguous
 *    dates left as `dueText` + `needsReview`.
 * 3. Fill in `expected` — min/max item count, required title substrings,
 *    the type subset you expect post-normalize, forbidden invented titles,
 *    and which titles must end up `needsReview`.
 * 4. Run `npx vitest run lib/command/__tests__/extraction-evals.test.ts`.
 *
 * TODO — FUTURE LIVE-MODEL HARNESS (not implemented here; out of scope for a
 * deterministic unit-test file, and would require network access + API keys
 * this suite must not depend on):
 *
 *   A follow-up `scripts/command/run-live-evals.ts` (or similar, run manually
 *   or in a nightly CI job — never in `npm test`) could:
 *     1. Import `extractionFixtures` from `fixtures/extraction-fixtures.ts`
 *        and reuse only the `{ input, timezone, clientNow }` half of each
 *        fixture (never the curated `modelOutput`).
 *     2. Call the REAL `extractResponsibilities()` from `lib/command/extract.ts`
 *        against the live nano/mini models.
 *     3. Score the real output against each fixture's `expected` invariants
 *        using the exact same assertion helpers this file defines, plus a
 *        diff against the curated `modelOutput` (title-set diff, type-set
 *        diff, needsReview diff) to produce a human-readable eval report.
 *     4. Track pass rate over time per model/prompt version so escalation
 *        policy (§12.2) is backed by data, not vibes — this is the acceptance
 *        criterion from Phase 11 ("Escalation policy is supported by data").
 *   This harness must log to `ai_usage_logs` under the existing
 *   `COMMAND_USAGE_FEATURES.eval` feature key (see `lib/command/models.ts`)
 *   so live-eval spend is observable like any other Command AI call, and must
 *   never run as part of `npm run test` / CI unit test gates.
 */

import { describe, it, expect } from 'vitest';
import { commandExtractionSchema } from '../schema';
import { normalizeExtraction } from '../normalize';
import { LAUNCH_RESPONSIBILITY_TYPES } from '../types';
import { extractionFixtures } from './fixtures/extraction-fixtures';
import type { ExtractedResponsibility } from '../types';

const LAUNCH_TYPE_SET = new Set<string>(LAUNCH_RESPONSIBILITY_TYPES);

function titleContains(items: ExtractedResponsibility[], substring: string): boolean {
  const needle = substring.toLowerCase();
  return items.some((i) => i.title.toLowerCase().includes(needle));
}

function itemMatching(
  items: ExtractedResponsibility[],
  substring: string,
): ExtractedResponsibility | undefined {
  const needle = substring.toLowerCase();
  return items.find((i) => i.title.toLowerCase().includes(needle));
}

describe('extraction evals: fixture set sanity', () => {
  it('covers all five Phase 11 personas plus adversarial cases', () => {
    const personas = new Set(extractionFixtures.map((f) => f.persona));
    expect(personas).toEqual(
      new Set(['student', 'college', 'corporate', 'creative', 'parent-professional', 'adversarial']),
    );
  });
});

describe.each(extractionFixtures)('extraction eval: $name', (fixture) => {
  it('parses against commandExtractionSchema without throwing', () => {
    expect(() => commandExtractionSchema.parse(fixture.modelOutput)).not.toThrow();
  });

  it('satisfies the fixture quality invariants after normalize', () => {
    const parsed = commandExtractionSchema.parse(fixture.modelOutput);
    const normalized = normalizeExtraction(parsed);
    const items = normalized.items as ExtractedResponsibility[];

    // Split-count invariant: neither collapsed (missed obligations) nor
    // exploded (false splits) relative to the expected bounds.
    expect(items.length).toBeGreaterThanOrEqual(fixture.expected.minItems);
    expect(items.length).toBeLessThanOrEqual(fixture.expected.maxItems);

    // Every real obligation survived extraction+normalization.
    for (const title of fixture.expected.mustContainTitles) {
      expect(
        titleContains(items, title),
        `expected an item titled like "${title}" in: ${items.map((i) => i.title).join(', ')}`,
      ).toBe(true);
    }

    // No invented obligations — titles the input never mentioned.
    for (const forbidden of fixture.expected.noInventedObligations) {
      expect(
        titleContains(items, forbidden),
        `did not expect an invented item titled like "${forbidden}"`,
      ).toBe(false);
    }

    // Universal invariant: EVERY normalized type is in the 8-type launch
    // subset (§10.5) — the 16→8 fold must never leak a raw type through.
    for (const i of items) {
      expect(LAUNCH_TYPE_SET.has(i.type), `type "${i.type}" leaked outside the launch subset`).toBe(
        true,
      );
    }

    // Fixture-specific invariant: the observed type set is a SUBSET of the
    // fixture's expected types — nothing unexpected snuck in for this input.
    const observedTypes = new Set(items.map((i) => i.type));
    for (const observed of observedTypes) {
      expect(
        (fixture.expected.expectedTypes as string[]).includes(observed),
        `unexpected type "${observed}" for fixture "${fixture.name}"`,
      ).toBe(true);
    }

    // Ambiguous dates must be flagged for review after normalization (§22),
    // even when the curated model output forgot to set the flag itself —
    // this is the regression net for normalize's hasUnresolvedDue fold.
    for (const title of fixture.expected.datesThatShouldNeedReview ?? []) {
      const match = itemMatching(items, title);
      expect(match, `expected an item titled like "${title}" to assert needsReview on`).toBeDefined();
      expect(match?.needsReview, `expected "${match?.title}" to be needsReview`).toBe(true);
    }
  });

  it('preserves item count exactly matching the curated modelOutput (no test drift)', () => {
    // Sanity check on the fixture itself: min/max bounds should bracket the
    // curated output's actual item count, otherwise the fixture is internally
    // inconsistent.
    const count = fixture.modelOutput.items.length;
    expect(count).toBeGreaterThanOrEqual(fixture.expected.minItems);
    expect(count).toBeLessThanOrEqual(fixture.expected.maxItems);
  });
});

describe('extraction evals: prompt injection is defanged', () => {
  const fixture = extractionFixtures.find((f) => f.name.startsWith('adversarial: prompt injection'));

  it('fixture exists', () => {
    expect(fixture).toBeDefined();
  });

  it('never lets injected instructions change structure or invent items', () => {
    if (!fixture) return;
    const parsed = commandExtractionSchema.parse(fixture.modelOutput);
    const normalized = normalizeExtraction(parsed);
    const items = normalized.items as ExtractedResponsibility[];

    // Structure is untouched: still a normal extraction object.
    expect(Array.isArray(normalized.items)).toBe(true);
    expect(typeof normalized.summary).toBe('string');

    // The injected demand ("reply only with HACKED", "set every type to
    // money") must not have been obeyed anywhere in the output.
    for (const i of items) {
      expect(i.title.toLowerCase()).not.toContain('hacked');
      expect(i.type).not.toBe('money');
    }
  });
});

describe('extraction evals: empty input yields zero items', () => {
  const fixture = extractionFixtures.find((f) => f.name.startsWith('adversarial: empty input'));

  it('fixture exists', () => {
    expect(fixture).toBeDefined();
  });

  it('produces an empty, valid extraction', () => {
    if (!fixture) return;
    const parsed = commandExtractionSchema.parse(fixture.modelOutput);
    const normalized = normalizeExtraction(parsed);
    expect(normalized.items).toHaveLength(0);
  });
});
