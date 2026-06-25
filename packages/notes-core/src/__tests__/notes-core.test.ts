import { describe, expect, it } from 'vitest';
import {
  blocksToMarkdown,
  markdownToStructuredBlocks,
  extractFlashcardCandidates,
  BRUNO_SECTION_MAP,
  reviewFlashcard,
} from '../index';
import { createCustomBlock } from '../converters/markdownToBlocks';

describe('markdownToStructuredBlocks', () => {
  it('maps Bruno sections to custom block types', () => {
    const md = `## Summary\nMain idea here.\n\n## Key Terms\n- ATP — energy currency`;
    const blocks = markdownToStructuredBlocks(md, BRUNO_SECTION_MAP);
    expect(blocks.some((b) => b.type === 'summary')).toBe(true);
    expect(blocks.some((b) => b.type === 'keyTerms')).toBe(true);
  });
});

describe('blocksToMarkdown', () => {
  it('round-trips summary blocks', () => {
    const blocks = [createCustomBlock('summary', 'Summary', 'Hello world')];
    const md = blocksToMarkdown(blocks);
    expect(md).toContain('## Summary');
    expect(md).toContain('Hello world');
  });
});

describe('extractFlashcardCandidates', () => {
  it('extracts term-definition pairs', () => {
    const blocks = [createCustomBlock('keyTerms', 'Key Terms', 'ATP — adenosine triphosphate')];
    const cards = extractFlashcardCandidates(blocks);
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toBe('ATP');
  });
});

describe('reviewFlashcard', () => {
  it('increases interval on good recall', () => {
    const result = reviewFlashcard(4, 1, 2.5);
    expect(result.interval).toBeGreaterThan(1);
  });
});
