import { createBlockConfig, createBlockSpec, BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';

function createLabeledBlockSpec(type: string, label: string, className: string) {
  const config = createBlockConfig(() => ({
    type,
    propSchema: {
      label: { default: label },
      variant: { default: 'default' },
    },
    content: 'inline' as const,
  }));

  return createBlockSpec(config, {
    render: (block) => {
      const wrapper = document.createElement('div');
      wrapper.className = className;
      const badge = document.createElement('div');
      badge.className = 'text-xs font-semibold uppercase tracking-wide opacity-70 mb-1';
      badge.textContent = (block.props.label as string) || label;
      wrapper.appendChild(badge);
      const content = document.createElement('div');
      wrapper.appendChild(content);
      return { dom: wrapper, contentDOM: content };
    },
    toExternalHTML: (block) => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-block-type', type);
      const badge = document.createElement('strong');
      badge.textContent = `${(block.props.label as string) || label}: `;
      wrapper.appendChild(badge);
      const content = document.createElement('span');
      wrapper.appendChild(content);
      return { dom: wrapper, contentDOM: content };
    },
  });
}

const summary = createLabeledBlockSpec('summary', 'Summary', 'rounded-xl border border-border bg-muted/40 p-4 my-2');
const keyTerms = createLabeledBlockSpec('keyTerms', 'Key Terms', 'rounded-xl border border-border bg-blue-500/5 p-4 my-2');
const checklist = createLabeledBlockSpec('checklist', 'Checklist', 'rounded-xl border border-border bg-green-500/5 p-4 my-2');
const studyQuestions = createLabeledBlockSpec('studyQuestions', 'Study Questions', 'rounded-xl border border-border bg-purple-500/5 p-4 my-2');
const nextActions = createLabeledBlockSpec('nextActions', 'Next Actions', 'rounded-xl border border-border bg-amber-500/5 p-4 my-2');
const flashcardDeck = createLabeledBlockSpec('flashcardDeck', 'Flashcards', 'rounded-xl border border-dashed border-border p-4 my-2');

const calloutConfig = createBlockConfig(() => ({
  type: 'callout',
  propSchema: {
    label: { default: 'Note' },
    variant: { default: 'default', values: ['default', 'warning', 'quote'] as const },
  },
  content: 'inline' as const,
}));

const callout = createBlockSpec(calloutConfig, {
  render: (block) => {
    const variant = block.props.variant as string;
    const wrapper = document.createElement('div');
    wrapper.className =
      variant === 'warning'
        ? 'rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 my-2'
        : variant === 'quote'
          ? 'rounded-xl border-l-4 border-primary bg-muted/30 p-4 my-2 italic'
          : 'rounded-xl border border-border bg-muted/20 p-4 my-2';
    const badge = document.createElement('div');
    badge.className = 'text-xs font-semibold mb-1';
    badge.textContent = (block.props.label as string) || 'Note';
    wrapper.appendChild(badge);
    const content = document.createElement('div');
    wrapper.appendChild(content);
    return { dom: wrapper, contentDOM: content };
  },
});

const cornellRowConfig = createBlockConfig(() => ({
  type: 'cornellRow',
  propSchema: { cue: { default: '' }, label: { default: 'Cornell Row' } },
  content: 'inline' as const,
}));

const cornellRow = createBlockSpec(cornellRowConfig, {
  render: (block) => {
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-2 gap-3 rounded-xl border border-border p-3 my-2';
    const cue = document.createElement('div');
    cue.className = 'text-sm font-medium border-r border-border pr-3';
    cue.textContent = (block.props.cue as string) || 'Cue';
    const notes = document.createElement('div');
    notes.className = 'text-sm';
    grid.appendChild(cue);
    grid.appendChild(notes);
    return { dom: grid, contentDOM: notes };
  },
});

const noteEmbedConfig = createBlockConfig(() => ({
  type: 'noteEmbed',
  propSchema: {
    noteId: { default: '' },
    noteTitle: { default: 'Linked note' },
  },
  content: 'none' as const,
}));

const noteEmbed = createBlockSpec(noteEmbedConfig, {
  render: (block) => {
    const link = document.createElement('div');
    link.className = 'rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-sm text-primary';
    link.textContent = `📎 ${(block.props.noteTitle as string) || 'Linked note'}`;
    return { dom: link, contentDOM: undefined };
  },
});

const assignmentLinkConfig = createBlockConfig(() => ({
  type: 'assignmentLink',
  propSchema: {
    assignmentId: { default: '' },
    assignmentName: { default: 'Assignment' },
  },
  content: 'none' as const,
}));

const assignmentLink = createBlockSpec(assignmentLinkConfig, {
  render: (block) => {
    const el = document.createElement('div');
    el.className = 'rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm';
    el.textContent = `📋 ${(block.props.assignmentName as string) || 'Assignment'}`;
    return { dom: el, contentDOM: undefined };
  },
});

export const planevoBlockSpecs = {
  ...defaultBlockSpecs,
  summary: summary(),
  keyTerms: keyTerms(),
  checklist: checklist(),
  callout: callout(),
  studyQuestions: studyQuestions(),
  nextActions: nextActions(),
  flashcardDeck: flashcardDeck(),
  cornellRow: cornellRow(),
  noteEmbed: noteEmbed(),
  assignmentLink: assignmentLink(),
};

export const planevoSchema = BlockNoteSchema.create({
  blockSpecs: planevoBlockSpecs,
});

export type PlanevoBlockSchema = typeof planevoSchema.blockSchema;
