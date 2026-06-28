import type { BlockNoteBlock, InlineContent } from '../types';

type InlineStyle = Record<string, boolean | string>;

export function generateBlockId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    if (char === 'x') return random.toString(16);
    return ((random & 0x3) | 0x8).toString(16);
  });
}

function normalizeStyles(styles: InlineStyle): InlineStyle {
  const normalized: InlineStyle = {};
  for (const [key, value] of Object.entries(styles)) {
    if (value) normalized[key] = value;
  }
  return normalized;
}

function stylesEqual(a: InlineStyle | undefined, b: InlineStyle | undefined): boolean {
  return JSON.stringify(normalizeStyles(a ?? {})) === JSON.stringify(normalizeStyles(b ?? {}));
}

function mergeAdjacentSegments(segments: InlineContent[]): InlineContent[] {
  const merged: InlineContent[] = [];

  for (const segment of segments) {
    const styles = normalizeStyles(segment.styles ?? {});
    const last = merged[merged.length - 1];

    if (last && last.type === 'text' && segment.type === 'text' && stylesEqual(last.styles, styles)) {
      last.text += segment.text;
      continue;
    }

    merged.push({ type: 'text', text: segment.text, styles });
  }

  return merged;
}

function findClosingDoubleAsterisk(text: string, start: number): number {
  for (let i = start; i < text.length - 1; i++) {
    if (text[i] === '*' && text[i + 1] === '*') return i;
  }
  return -1;
}

function findClosingSingleAsterisk(text: string, start: number): number {
  for (let i = start; i < text.length; i++) {
    if (text[i] === '*' && text[i - 1] !== '*' && text[i + 1] !== '*') return i;
  }
  return -1;
}

function parseInlineMarkdownRecursive(text: string, inheritedStyles: InlineStyle): InlineContent[] {
  const result: InlineContent[] = [];
  let buffer = '';
  let i = 0;

  const flushBuffer = () => {
    if (!buffer) return;
    result.push({ type: 'text', text: buffer, styles: normalizeStyles(inheritedStyles) });
    buffer = '';
  };

  while (i < text.length) {
    if (text[i] === '`') {
      const close = text.indexOf('`', i + 1);
      if (close !== -1) {
        flushBuffer();
        result.push({
          type: 'text',
          text: text.slice(i + 1, close),
          styles: normalizeStyles({ ...inheritedStyles, code: true }),
        });
        i = close + 1;
        continue;
      }
    }

    if (text.startsWith('**', i)) {
      const close = findClosingDoubleAsterisk(text, i + 2);
      if (close !== -1) {
        flushBuffer();
        const inner = text.slice(i + 2, close);
        result.push(
          ...parseInlineMarkdownRecursive(inner, { ...inheritedStyles, bold: true })
        );
        i = close + 2;
        continue;
      }
    }

    if (text[i] === '*' && text[i + 1] !== '*') {
      const close = findClosingSingleAsterisk(text, i + 1);
      if (close !== -1) {
        flushBuffer();
        const inner = text.slice(i + 1, close);
        result.push(
          ...parseInlineMarkdownRecursive(inner, { ...inheritedStyles, italic: true })
        );
        i = close + 1;
        continue;
      }
    }

    buffer += text[i];
    i += 1;
  }

  flushBuffer();
  return mergeAdjacentSegments(result);
}

/** Parse inline markdown (**bold**, *italic*, `code`) into BlockNote inline content. */
export function parseInlineMarkdown(text: string): InlineContent[] {
  if (!text) return [{ type: 'text', text: '', styles: {} }];
  return parseInlineMarkdownRecursive(text, {});
}

function textContent(text: string): InlineContent[] {
  return parseInlineMarkdown(text);
}

export function createParagraphBlock(text: string): BlockNoteBlock {
  return {
    id: generateBlockId(),
    type: 'paragraph',
    props: {},
    content: textContent(text),
    children: [],
  };
}

export function createHeadingBlock(text: string, level: 1 | 2 | 3 = 2): BlockNoteBlock {
  return {
    id: generateBlockId(),
    type: 'heading',
    props: { level },
    content: textContent(text),
    children: [],
  };
}

export function createCustomBlock(
  type: string,
  label: string,
  body: string,
  extraProps: Record<string, unknown> = {}
): BlockNoteBlock {
  return {
    id: generateBlockId(),
    type,
    props: { label, variant: 'default', ...extraProps },
    content: textContent(body),
    children: [],
  };
}

export function createChecklistBlock(items: string[]): BlockNoteBlock {
  return {
    id: generateBlockId(),
    type: 'checklist',
    props: { label: 'Checklist' },
    content: textContent(items.join('\n')),
    children: [],
  };
}

export function createBulletListBlock(items: string[]): BlockNoteBlock {
  return {
    id: generateBlockId(),
    type: 'bulletListItem',
    props: {},
    content: textContent(items[0] ?? ''),
    children: items.slice(1).map((item) => ({
      id: generateBlockId(),
      type: 'bulletListItem',
      props: {},
      content: textContent(item),
      children: [],
    })),
  };
}

export function emptyDocument(): BlockNoteBlock[] {
  return [createParagraphBlock('')];
}

export function markdownToPlainParagraphBlocks(markdown: string): BlockNoteBlock[] {
  if (!markdown.trim()) return emptyDocument();

  const lines = markdown.split('\n');
  const blocks: BlockNoteBlock[] = [];
  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    blocks.push(createParagraphBlock(paragraphBuffer.join('\n').trim()));
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (listBuffer.length === 0) return;
    blocks.push(createBulletListBlock(listBuffer));
    listBuffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      flushParagraph();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      flushParagraph();
      const level = headingMatch[1].length as 1 | 2 | 3;
      blocks.push(createHeadingBlock(headingMatch[2], level));
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      listBuffer.push(bulletMatch[1]);
      continue;
    }

    flushList();
    paragraphBuffer.push(trimmed);
  }

  flushList();
  flushParagraph();

  return blocks.length > 0 ? blocks : emptyDocument();
}

function normalizeSectionName(name: string): string {
  return name.toLowerCase().replace(/[#*_]/g, '').trim();
}

/** Strip ###+ subheadings from note section bodies — convert to bold labels or plain text. */
function flattenSubheadingsInBody(body: string): string {
  return body
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      const subheadingMatch = trimmed.match(/^#{3,6}\s+(.+)$/);
      if (subheadingMatch) return `**${subheadingMatch[1]}**`;
      return line;
    })
    .join('\n');
}

export function markdownToStructuredBlocks(
  markdown: string,
  sectionMap: Record<string, string>
): BlockNoteBlock[] {
  if (!markdown.trim()) return emptyDocument();

  const sections = markdown.split(/\n(?=##\s)/);
  const blocks: BlockNoteBlock[] = [];

  for (const section of sections) {
    const headingMatch = section.match(/^##\s+(.+?)(?:\n([\s\S]*))?$/);
    if (!headingMatch) {
      blocks.push(...markdownToPlainParagraphBlocks(section));
      continue;
    }

    const sectionTitle = normalizeSectionName(headingMatch[1]);
    const body = (headingMatch[2] ?? '').trim();
    const blockType = sectionMap[sectionTitle];

    if (blockType && blockType !== 'heading') {
      blocks.push(createCustomBlock(blockType, headingMatch[1], flattenSubheadingsInBody(body || '')));
      continue;
    }

    blocks.push(createHeadingBlock(headingMatch[1], 2));
    if (body) {
      blocks.push(...markdownToPlainParagraphBlocks(flattenSubheadingsInBody(body)));
    }
  }

  return blocks.length > 0 ? blocks : emptyDocument();
}

export function inferTitleFromBlocks(blocks: BlockNoteBlock[], fallback = 'Untitled'): string {
  for (const block of blocks) {
    if (block.type === 'heading' && block.content?.[0]?.text) {
      return block.content[0].text.slice(0, 200);
    }
  }
  for (const block of blocks) {
    const text = inlineContentToText(block.content);
    if (text.trim()) return text.trim().slice(0, 200);
  }
  return fallback;
}

export function inferTitleFromMarkdown(content: string, fallback = 'Untitled'): string {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading.slice(0, 200);
  const firstLine = content.split('\n').find((line) => line.trim())?.trim();
  return (firstLine || fallback).slice(0, 200);
}

export function inlineContentToText(content: InlineContent[] | undefined): string {
  if (!content?.length) return '';
  return content.map((item) => item.text).join('');
}

export function inlineContentToMarkdown(content: InlineContent[] | undefined): string {
  if (!content?.length) return '';

  return content
    .map((item) => {
      if (item.type !== 'text') return item.text;

      const { text, styles } = item;
      if (styles?.code) return `\`${text}\``;
      if (styles?.bold && styles?.italic) return `***${text}***`;
      if (styles?.bold) return `**${text}**`;
      if (styles?.italic) return `*${text}*`;
      return text;
    })
    .join('');
}

export function blocksToMarkdown(blocks: BlockNoteBlock[], depth = 0): string {
  const lines: string[] = [];

  for (const block of blocks) {
    const text = inlineContentToMarkdown(block.content);
    const indent = '  '.repeat(depth);

    switch (block.type) {
      case 'heading': {
        const level = (block.props.level as number) ?? 2;
        lines.push(`${'#'.repeat(level)} ${text}`);
        break;
      }
      case 'bulletListItem':
        lines.push(`${indent}- ${text}`);
        break;
      case 'numberedListItem':
        lines.push(`${indent}1. ${text}`);
        break;
      case 'checklist':
        lines.push(`## Checklist\n${text.split('\n').map((l) => `- [ ] ${l}`).join('\n')}`);
        break;
      case 'summary':
        lines.push(`## Summary\n${text}`);
        break;
      case 'keyTerms':
        lines.push(`## Key Terms\n${text}`);
        break;
      case 'studyQuestions':
        lines.push(`## Study Questions\n${text}`);
        break;
      case 'nextActions':
        lines.push(`## Next Actions\n${text}`);
        break;
      case 'callout': {
        const label = (block.props.label as string) ?? 'Note';
        lines.push(`> **${label}:** ${text}`);
        break;
      }
      case 'flashcardDeck':
        lines.push(`## Flashcards\n${text}`);
        break;
      case 'cornellRow':
        lines.push(`| Cue | Notes |\n| --- | --- |\n| ${(block.props.cue as string) ?? ''} | ${text} |`);
        break;
      case 'noteEmbed':
        lines.push(`[[${(block.props.noteTitle as string) ?? 'Note'}]]`);
        break;
      case 'assignmentLink':
        lines.push(`📎 Assignment: ${(block.props.assignmentName as string) ?? text}`);
        break;
      default:
        if (text) lines.push(text);
    }

    if (block.children.length > 0) {
      lines.push(blocksToMarkdown(block.children, depth + 1));
    }
  }

  return lines.filter(Boolean).join('\n\n');
}
