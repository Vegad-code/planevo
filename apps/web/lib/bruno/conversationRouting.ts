import type { BrunoMode, BrunoRouteDecision } from './types';

const NOTES_STICKY_MODES: BrunoMode[] = ['notes', 'academic_tutoring'];

const REFINEMENT_PATTERN =
  /\b(more detailed|more detail|be more detailed|go deeper|expand|continue|keep going|finish|shorter|less detail|add (a )?section|add more|can you elaborate|elaborate on|what about)\b/i;

const CONTINUE_PATTERN = /^(continue|keep going|go on|finish it|finish the notes)[!.? ]*$/i;

export function isNotesRefinementMessage(message: string): boolean {
  const text = message.trim();
  if (!text) return false;
  return REFINEMENT_PATTERN.test(text) || CONTINUE_PATTERN.test(text);
}

export function buildStickyNotesDecision(
  rationale: string
): BrunoRouteDecision {
  return {
    mode: 'notes',
    confidence: 0.9,
    needsCalendarContext: false,
    needsTaskContext: false,
    needsCanvasContext: true,
    estimatedOutputSize: 'long',
    upgradeMoment: false,
    rationale,
  };
}

export async function getLastConversationMode(
  loadLastMode: () => Promise<BrunoMode | null>
): Promise<BrunoMode | null> {
  try {
    return await loadLastMode();
  } catch {
    return null;
  }
}

export function shouldStickToNotesMode(input: {
  message: string;
  lastMode: BrunoMode | null;
}): boolean {
  if (!input.lastMode || !NOTES_STICKY_MODES.includes(input.lastMode)) {
    return false;
  }
  return isNotesRefinementMessage(input.message);
}

export function detectNotesIntent(message: string): boolean {
  const text = message.trim().toLowerCase();
  if (!text) return false;

  if (
    /\b(make|write|create|generate|give me|need)\b.*\b(notes|note sheet|review sheet|cheat sheet|study sheet)\b/i.test(
      text
    )
  ) {
    return true;
  }

  if (
    /\b(handwriteable|handwritten|hand-writable)\b.*\b(notes|sheet)\b/i.test(
      text
    )
  ) {
    return true;
  }

  if (/\b(notes for|note for)\b/i.test(text)) {
    return true;
  }

  if (/\bunit \d+\b.*\bnotes\b/i.test(text)) {
    return true;
  }

  if (
    /\b(ap (macro|world|bio|biology|chem|chemistry|physics|ush|ushistory|stats|calc|lit|lang)|exam prep|test prep)\b/i.test(
      text
    ) &&
    /\b(notes|review|summarize|summary)\b/i.test(text)
  ) {
    return true;
  }

  return false;
}
