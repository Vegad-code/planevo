export const NOTE_KINDS = [
  'quick_capture',
  'class_note',
  'study_guide',
  'daily',
  'template_instance',
  'bruno_generated',
] as const;

export const NOTE_PRIVACY = ['private', 'class', 'shared'] as const;

export const NOTEBOOK_KINDS = ['inbox', 'personal', 'course', 'project'] as const;

export const CUSTOM_BLOCK_TYPES = [
  'summary',
  'keyTerms',
  'checklist',
  'callout',
  'studyQuestions',
  'nextActions',
  'flashcardDeck',
  'cornellRow',
  'assignmentLink',
  'noteEmbed',
] as const;

export const BRUNO_SECTION_MAP: Record<string, (typeof CUSTOM_BLOCK_TYPES)[number] | 'heading'> = {
  summary: 'summary',
  'key terms': 'keyTerms',
  'key terms & definitions': 'keyTerms',
  vocabulary: 'keyTerms',
  checklist: 'checklist',
  tasks: 'checklist',
  'study questions': 'studyQuestions',
  'practice questions': 'studyQuestions',
  'active recall': 'studyQuestions',
  'next actions': 'nextActions',
  'next steps': 'nextActions',
  callout: 'callout',
  'exam tips': 'callout',
  warning: 'callout',
};

export const DEFAULT_NOTEBOOKS = [
  { name: 'Inbox', kind: 'inbox' as const, icon: 'inbox', sort_order: 0 },
  { name: 'Personal', kind: 'personal' as const, icon: 'user', sort_order: 1 },
] as const;

export const SYSTEM_TEMPLATE_IDS = [
  'cornell',
  'lecture',
  'exam-prep',
  'reading-log',
  'quick-capture',
] as const;
