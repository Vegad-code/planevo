import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the AI SDK before importing the module under test.
const generateObjectMock = vi.fn();
vi.mock('ai', () => ({ generateObject: (opts: unknown) => generateObjectMock(opts) }));
vi.mock('@ai-sdk/openai', () => ({ openai: (model: string) => ({ model }) }));

import {
  extractResponsibilities,
  shouldEscalate,
  buildFallbackExtraction,
} from '../extract';

function validExtraction() {
  return {
    object: {
      summary: 'Found 1 thing',
      items: [
        {
          title: 'Bio lab report',
          description: null,
          type: 'assignment',
          dueText: null,
          dueAt: '2026-07-10T12:00:00.000Z',
          startAt: null,
          endAt: null,
          timezone: 'America/New_York',
          recurrenceRule: null,
          priority: 'high',
          confidence: 0.9,
          needsReview: false,
          reviewReason: null,
          whyItMatters: null,
          sourceHints: [],
        },
      ],
      clarificationQuestions: [],
      confidence: 0.9,
    },
    usage: { inputTokens: 100, outputTokens: 60 },
  };
}

const baseInput = {
  text: 'bio lab report due next friday',
  timezone: 'America/New_York',
  clientNow: '2026-07-04T16:00:00.000Z',
  inputMode: 'text',
};

beforeEach(() => {
  generateObjectMock.mockReset();
});

describe('shouldEscalate', () => {
  it('escalates long and mixed-domain dumps', () => {
    expect(shouldEscalate('a'.repeat(700))).toBe(true);
    expect(shouldEscalate('slack from my boss about the meeting and my chem quiz')).toBe(true);
  });
  it('keeps simple single-domain dumps on nano', () => {
    expect(shouldEscalate('finish the essay')).toBe(false);
  });
});

describe('extractResponsibilities', () => {
  it('returns validated, normalized items from a good response', async () => {
    generateObjectMock.mockResolvedValueOnce(validExtraction());
    const out = await extractResponsibilities(baseInput);
    expect(out.fallback).toBe(false);
    expect(out.extraction.items).toHaveLength(1);
    expect(out.extraction.items[0].title).toBe('Bio lab report');
    expect(out.usage.inputTokens).toBe(100);
    expect(generateObjectMock).toHaveBeenCalledTimes(1);
  });

  it('retries once on invalid JSON, then succeeds on the escalated model', async () => {
    // First call returns schema-invalid object (missing required fields).
    generateObjectMock.mockResolvedValueOnce({ object: { nonsense: true }, usage: {} });
    generateObjectMock.mockResolvedValueOnce(validExtraction());
    const out = await extractResponsibilities(baseInput);
    expect(out.fallback).toBe(false);
    expect(out.escalated).toBe(true);
    expect(generateObjectMock).toHaveBeenCalledTimes(2);
  });

  it('falls back to a raw unsorted item when both attempts fail', async () => {
    generateObjectMock.mockResolvedValue({ object: { nope: 1 }, usage: {} });
    const out = await extractResponsibilities(baseInput);
    expect(out.fallback).toBe(true);
    expect(out.extraction.items).toHaveLength(1);
    expect(out.extraction.items[0].needsReview).toBe(true);
    expect(generateObjectMock).toHaveBeenCalledTimes(2);
  });
});

describe('buildFallbackExtraction', () => {
  it('produces a single unsorted, needs-review item', () => {
    const fallback = buildFallbackExtraction('some messy text');
    expect(fallback.items).toHaveLength(1);
    expect(fallback.items[0].type).toBe('unknown');
    expect(fallback.items[0].needsReview).toBe(true);
    expect(fallback.confidence).toBe(0);
  });
});
