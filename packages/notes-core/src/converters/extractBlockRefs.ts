import type { BlockNoteBlock, BlockRef } from '../types';
import { inlineContentToText } from './markdownToBlocks';

function walkBlocks(blocks: BlockNoteBlock[], refs: BlockRef[]): void {
  for (const block of blocks) {
    const textPreview = inlineContentToText(block.content).slice(0, 120);
    refs.push({
      blockId: block.id,
      blockType: block.type,
      textPreview,
    });
    if (block.children.length > 0) {
      walkBlocks(block.children, refs);
    }
  }
}

export function extractBlockRefs(blocks: BlockNoteBlock[]): BlockRef[] {
  const refs: BlockRef[] = [];
  walkBlocks(blocks, refs);
  return refs;
}

export function findBlockById(blocks: BlockNoteBlock[], blockId: string): BlockNoteBlock | null {
  for (const block of blocks) {
    if (block.id === blockId) return block;
    const found = findBlockById(block.children, blockId);
    if (found) return found;
  }
  return null;
}

export function extractFlashcardCandidates(blocks: BlockNoteBlock[]): { front: string; back: string; blockId: string }[] {
  const cards: { front: string; back: string; blockId: string }[] = [];

  for (const block of blocks) {
    const text = inlineContentToText(block.content);
    if (block.type === 'keyTerms') {
      for (const line of text.split('\n')) {
        const match = line.match(/^[-*]?\s*(.+?)\s*[—:-]\s*(.+)$/);
        if (match) {
          cards.push({ front: match[1].trim(), back: match[2].trim(), blockId: block.id });
        }
      }
    }
    if (block.type === 'studyQuestions') {
      for (const line of text.split('\n')) {
        const q = line.replace(/^[-*]\s*/, '').trim();
        if (q) cards.push({ front: q, back: 'Review your notes for the answer.', blockId: block.id });
      }
    }
    if (block.type === 'flashcardDeck') {
      for (const line of text.split('\n')) {
        const match = line.match(/^(.+?)\s*\|\s*(.+)$/);
        if (match) {
          cards.push({ front: match[1].trim(), back: match[2].trim(), blockId: block.id });
        }
      }
    }
    cards.push(...extractFlashcardCandidates(block.children));
  }

  return cards;
}

export function extractTaskCandidates(blocks: BlockNoteBlock[]): { title: string; blockId: string }[] {
  const tasks: { title: string; blockId: string }[] = [];

  for (const block of blocks) {
    const text = inlineContentToText(block.content);
    if (block.type === 'checklist' || block.type === 'nextActions') {
      for (const line of text.split('\n')) {
        const title = line.replace(/^[-*]\s*\[[ x]?\]\s*/i, '').trim();
        if (title) tasks.push({ title, blockId: block.id });
      }
    }
    tasks.push(...extractTaskCandidates(block.children));
  }

  return tasks;
}
