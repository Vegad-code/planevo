import type { NoteTemplateDefinition } from '../types';
import {
  createCustomBlock,
  createHeadingBlock,
  createParagraphBlock,
  emptyDocument,
} from '../converters/markdownToBlocks';

export const cornellTemplate: NoteTemplateDefinition = {
  id: 'cornell',
  name: 'Cornell Notes',
  description: 'Cue column, notes, and summary for lecture capture.',
  noteKind: 'class_note',
  blocks: [
    createHeadingBlock('Cornell Notes', 1),
    createCustomBlock('cornellRow', 'Cue | Notes', 'Take notes here during lecture.', {
      cue: 'Key concept',
    }),
    createCustomBlock('cornellRow', 'Cue | Notes', '', { cue: '' }),
    createCustomBlock('summary', 'Summary', 'Write a summary after class.'),
  ],
};

export const lectureTemplate: NoteTemplateDefinition = {
  id: 'lecture',
  name: 'Lecture Notes',
  description: 'Structured capture for class lectures.',
  noteKind: 'class_note',
  blocks: [
    createHeadingBlock('Lecture Notes', 1),
    createCustomBlock('summary', 'Summary', ''),
    createCustomBlock('keyTerms', 'Key Terms', '- Term — definition'),
    createCustomBlock('checklist', 'Follow-ups', '- Review slides\n- Complete reading'),
    createCustomBlock('studyQuestions', 'Study Questions', '- '),
  ],
};

export const examPrepTemplate: NoteTemplateDefinition = {
  id: 'exam-prep',
  name: 'Exam Prep',
  description: 'Review sheet with weak spots and practice.',
  noteKind: 'study_guide',
  blocks: [
    createHeadingBlock('Exam Prep', 1),
    createCustomBlock('summary', 'Topics to Review', ''),
    createCustomBlock('keyTerms', 'Must-Know Terms', ''),
    createCustomBlock('callout', 'Exam Tips', 'Common traps and what to watch for.', {
      variant: 'warning',
    }),
    createCustomBlock('studyQuestions', 'Practice Questions', '- '),
    createCustomBlock('nextActions', 'Study Plan', '- '),
  ],
};

export const readingLogTemplate: NoteTemplateDefinition = {
  id: 'reading-log',
  name: 'Reading Log',
  description: 'Capture readings with key ideas and quotes.',
  noteKind: 'class_note',
  blocks: [
    createHeadingBlock('Reading Log', 1),
    createParagraphBlock('Source: '),
    createCustomBlock('summary', 'Main Ideas', ''),
    createCustomBlock('keyTerms', 'Key Terms', ''),
    createCustomBlock('callout', 'Quote Worth Knowing', '', { variant: 'quote' }),
    createCustomBlock('studyQuestions', 'Discussion Questions', '- '),
  ],
};

export const quickCaptureTemplate: NoteTemplateDefinition = {
  id: 'quick-capture',
  name: 'Quick Note',
  description: 'Start typing immediately — organize later.',
  noteKind: 'quick_capture',
  blocks: emptyDocument(),
};

export const SYSTEM_TEMPLATES: Record<string, NoteTemplateDefinition> = {
  cornell: cornellTemplate,
  lecture: lectureTemplate,
  'exam-prep': examPrepTemplate,
  'reading-log': readingLogTemplate,
  'quick-capture': quickCaptureTemplate,
};

export function getTemplateBlocks(templateId: string) {
  return SYSTEM_TEMPLATES[templateId]?.blocks ?? emptyDocument();
}

export function listSystemTemplates(): NoteTemplateDefinition[] {
  return Object.values(SYSTEM_TEMPLATES);
}
