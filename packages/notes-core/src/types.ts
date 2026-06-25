import type { NOTE_KINDS, NOTE_PRIVACY, NOTEBOOK_KINDS, CUSTOM_BLOCK_TYPES } from './constants';

export type NoteKind = (typeof NOTE_KINDS)[number];
export type NotePrivacy = (typeof NOTE_PRIVACY)[number];
export type NotebookKind = (typeof NOTEBOOK_KINDS)[number];
export type CustomBlockType = (typeof CUSTOM_BLOCK_TYPES)[number];

export interface InlineContent {
  type: 'text' | 'link';
  text: string;
  styles?: Record<string, boolean | string>;
  href?: string;
}

export interface BlockNoteBlock {
  id: string;
  type: string;
  props: Record<string, unknown>;
  content: InlineContent[] | undefined;
  children: BlockNoteBlock[];
}

export interface BlockRef {
  blockId: string;
  blockType: string;
  textPreview: string;
}

export interface NoteTemplateDefinition {
  id: string;
  name: string;
  description: string;
  noteKind: NoteKind;
  blocks: BlockNoteBlock[];
}

export interface FlashcardReviewResult {
  interval: number;
  ease: number;
  nextReviewAt: Date;
}
