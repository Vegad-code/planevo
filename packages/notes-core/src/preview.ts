export const NOTE_ACCENT_KEYS = ['yellow', 'coral', 'sky', 'green', 'cream'] as const;

export type NoteAccentKey = (typeof NOTE_ACCENT_KEYS)[number];

export const NOTE_ACCENT_HEX: Record<NoteAccentKey, string> = {
  yellow: '#F7D44C',
  coral: '#EB7A53',
  sky: '#98B7DB',
  green: '#A8D672',
  cream: '#F6ECC9',
};

export type NoteAccentOptions = {
  noteKind?: string;
  isPinned?: boolean;
  isDaily?: boolean;
  notebookKind?: string;
};

export function stripMarkdownPreview(text: string | null | undefined, maxLength = 120): string {
  if (!text?.trim()) return '';

  const stripped = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  if (stripped.length <= maxLength) return stripped;
  return `${stripped.slice(0, maxLength - 1).trimEnd()}…`;
}

function hashString(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getNoteAccent(noteId: string, options?: NoteAccentOptions): NoteAccentKey {
  if (options?.isPinned) return 'coral';
  if (options?.isDaily || options?.noteKind === 'daily') return 'yellow';
  if (options?.notebookKind === 'course') return 'sky';
  if (options?.noteKind === 'study_guide') return 'green';
  if (options?.noteKind === 'class_note') return 'sky';

  const idx = hashString(noteId) % NOTE_ACCENT_KEYS.length;
  return NOTE_ACCENT_KEYS[idx] ?? 'cream';
}

export function getNoteAccentHex(noteId: string, options?: NoteAccentOptions): string {
  return NOTE_ACCENT_HEX[getNoteAccent(noteId, options)];
}
