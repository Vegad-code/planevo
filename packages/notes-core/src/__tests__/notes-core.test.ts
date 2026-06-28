import { describe, expect, it } from 'vitest';
import {
  blocksToMarkdown,
  markdownToStructuredBlocks,
  extractFlashcardCandidates,
  BRUNO_SECTION_MAP,
  reviewFlashcard,
  parseInlineMarkdown,
  inlineContentToText,
  inlineContentToMarkdown,
} from '../index';
import { createCustomBlock } from '../converters/markdownToBlocks';

describe('parseInlineMarkdown', () => {
  it('parses bold text without leaving asterisks', () => {
    const content = parseInlineMarkdown('**ATP**');
    expect(inlineContentToText(content)).toBe('ATP');
    expect(content[0]?.styles?.bold).toBe(true);
  });

  it('parses mixed inline styles in a sentence', () => {
    const content = parseInlineMarkdown('cells **capture, store, transfer, and use energy** to power life');
    expect(inlineContentToText(content)).toBe(
      'cells capture, store, transfer, and use energy to power life'
    );
    expect(content.some((part) => part.styles?.bold)).toBe(true);
  });

  it('parses code spans', () => {
    const content = parseInlineMarkdown('use `ATP` here');
    expect(inlineContentToText(content)).toBe('use ATP here');
    expect(content.some((part) => part.styles?.code)).toBe(true);
  });
});

describe('inlineContentToMarkdown', () => {
  it('round-trips bold segments', () => {
    const content = parseInlineMarkdown('**Cellular respiration**');
    expect(inlineContentToMarkdown(content)).toBe('**Cellular respiration**');
  });
});

describe('markdownToStructuredBlocks', () => {
  it('maps Bruno sections to custom block types', () => {
    const md = `## Summary\nMain idea here.\n\n## Key Terms\n- ATP — energy currency`;
    const blocks = markdownToStructuredBlocks(md, BRUNO_SECTION_MAP);
    expect(blocks.some((b) => b.type === 'summary')).toBe(true);
    expect(blocks.some((b) => b.type === 'keyTerms')).toBe(true);
  });

  it('parses bold key terms inside custom blocks', () => {
    const md = `## Key Terms\n- **ATP** — main energy currency\n- **Cellular respiration** — breaks down glucose`;
    const blocks = markdownToStructuredBlocks(md, BRUNO_SECTION_MAP);
    const keyTerms = blocks.find((b) => b.type === 'keyTerms');
    expect(keyTerms).toBeDefined();
    expect(inlineContentToText(keyTerms?.content)).not.toContain('**');
    expect(keyTerms?.content?.some((part) => part.styles?.bold)).toBe(true);
  });

  it('flattens ### subheadings inside custom blocks into bold labels', () => {
    const md = `## Summary\n- Main idea\n### Glycolysis\n- Step 1: glucose split`;
    const blocks = markdownToStructuredBlocks(md, BRUNO_SECTION_MAP);
    const summary = blocks.find((b) => b.type === 'summary');
    expect(summary).toBeDefined();
    expect(inlineContentToText(summary?.content)).not.toContain('###');
    expect(inlineContentToText(summary?.content)).toContain('Glycolysis');
    expect(summary?.content?.some((part) => part.text === 'Glycolysis' && part.styles?.bold)).toBe(true);
  });
});

describe('blocksToMarkdown', () => {
  it('round-trips summary blocks', () => {
    const blocks = [createCustomBlock('summary', 'Summary', 'Hello world')];
    const md = blocksToMarkdown(blocks);
    expect(md).toContain('## Summary');
    expect(md).toContain('Hello world');
  });

  it('round-trips bold content through markdown export', () => {
    const blocks = [createCustomBlock('keyTerms', 'Key Terms', '**ATP** — energy currency')];
    const md = blocksToMarkdown(blocks);
    expect(md).toContain('**ATP**');
    expect(md).not.toContain('****');
  });
});

describe('extractFlashcardCandidates', () => {
  it('extracts term-definition pairs', () => {
    const blocks = [createCustomBlock('keyTerms', 'Key Terms', 'ATP — adenosine triphosphate')];
    const cards = extractFlashcardCandidates(blocks);
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toBe('ATP');
  });

  it('extracts clean term names when bold markers were parsed', () => {
    const blocks = [
      createCustomBlock('keyTerms', 'Key Terms', '- **ATP** — adenosine triphosphate'),
    ];
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
