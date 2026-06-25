import { describe, expect, it } from 'vitest';
import { resolveNoteContent } from '@/lib/notes/saveNote';
import { BRUNO_SECTION_MAP } from '@planevo/notes-core';

describe('resolveNoteContent', () => {
  it('structures Bruno markdown into block types', () => {
    const md = '## Summary\nHello\n\n## Key Terms\n- ATP — energy';
    const { contentJson, contentMarkdown } = resolveNoteContent({
      content: md,
      isBrunoContent: true,
    });
    expect(contentJson.some((b) => b.type === 'summary')).toBe(true);
    expect(contentJson.some((b) => b.type === 'keyTerms')).toBe(true);
    expect(contentMarkdown).toContain('Summary');
  });

  it('uses explicit contentJson when provided', () => {
    const blocks = [{ id: '1', type: 'paragraph', props: {}, content: [{ type: 'text' as const, text: 'Hi', styles: {} }], children: [] }];
    const result = resolveNoteContent({ contentJson: blocks });
    expect(result.contentJson).toEqual(blocks);
  });
});

describe('BRUNO_SECTION_MAP', () => {
  it('includes summary mapping', () => {
    expect(BRUNO_SECTION_MAP.summary).toBe('summary');
  });
});
