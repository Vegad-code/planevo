import { describe, expect, it } from 'vitest';
import { getNoteAccent, stripMarkdownPreview } from '../preview';

describe('stripMarkdownPreview', () => {
  it('removes heading and bold markdown', () => {
    expect(stripMarkdownPreview('## AP Biology\n**atoms** and molecules')).toBe(
      'AP Biology atoms and molecules'
    );
  });

  it('strips list markers', () => {
    expect(stripMarkdownPreview('- First item\n- Second item')).toBe('First item Second item');
  });

  it('truncates long text', () => {
    const long = 'word '.repeat(40);
    const result = stripMarkdownPreview(long, 50);
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result.endsWith('…')).toBe(true);
  });

  it('returns empty for blank input', () => {
    expect(stripMarkdownPreview('')).toBe('');
    expect(stripMarkdownPreview(null)).toBe('');
  });
});

describe('getNoteAccent', () => {
  it('returns yellow for daily notes', () => {
    expect(getNoteAccent('abc', { isDaily: true })).toBe('yellow');
    expect(getNoteAccent('abc', { noteKind: 'daily' })).toBe('yellow');
  });

  it('returns coral for pinned notes', () => {
    expect(getNoteAccent('abc', { isPinned: true })).toBe('coral');
  });

  it('returns sky for course notebook', () => {
    expect(getNoteAccent('abc', { notebookKind: 'course' })).toBe('sky');
  });

  it('is stable for the same note id', () => {
    const a = getNoteAccent('note-123');
    const b = getNoteAccent('note-123');
    expect(a).toBe(b);
  });
});
