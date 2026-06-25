import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ReactMarkdown from 'react-markdown';
import { brunoMarkdownComponents } from '../brunoMarkdownComponents';

describe('brunoMarkdownComponents', () => {
  it('opens external links in a new tab', () => {
    render(
      <ReactMarkdown components={brunoMarkdownComponents}>
        {'[Notion task](https://www.notion.so/page-abc)'}
      </ReactMarkdown>
    );

    const link = screen.getByRole('link', { name: 'Notion task' });
    expect(link.getAttribute('href')).toBe('https://www.notion.so/page-abc');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
