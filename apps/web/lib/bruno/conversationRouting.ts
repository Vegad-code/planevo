import type { BrunoMode, BrunoRouteDecision } from './types';

const NOTES_STICKY_MODES: BrunoMode[] = ['notes', 'academic_tutoring'];
const DOCUMENT_STICKY_MODES: BrunoMode[] = ['document_writing'];

const REFINEMENT_PATTERN =
  /\b(more detailed|more detail|be more detailed|go deeper|expand|continue|keep going|finish|shorter|less detail|add (a )?section|add more|can you elaborate|elaborate on|what about)\b/i;

const CONTINUE_PATTERN = /^(continue|keep going|go on|finish it|finish the notes)[!.? ]*$/i;

const DOCUMENT_REFINEMENT_PATTERN =
  /\b(rewrite|revise|polish|make (it|this) (shorter|longer|clearer|stronger|sound better|more natural)|add (an? )?(intro|introduction|conclusion|paragraph|section)|finish (it|this|the draft)|continue|keep going|make it flow|improve the wording)\b/i;

export const BRUNO_DETECTOR_EVASION_RESPONSE =
  "I can't help make writing undetectable by AI detectors, bypass watermarking, or hide authorship. I can still help write or revise it so it is clear, original, specific to your prompt, and in a natural voice.";

export function isNotesRefinementMessage(message: string): boolean {
  const text = message.trim();
  if (!text) return false;
  return REFINEMENT_PATTERN.test(text) || CONTINUE_PATTERN.test(text);
}

export function isDocumentRefinementMessage(message: string): boolean {
  const text = message.trim();
  if (!text) return false;
  return (
    REFINEMENT_PATTERN.test(text) ||
    CONTINUE_PATTERN.test(text) ||
    DOCUMENT_REFINEMENT_PATTERN.test(text)
  );
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

export function buildStickyDocumentDecision(
  rationale: string
): BrunoRouteDecision {
  return {
    mode: 'document_writing',
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

export function shouldStickToDocumentMode(input: {
  message: string;
  lastMode: BrunoMode | null;
}): boolean {
  if (!input.lastMode || !DOCUMENT_STICKY_MODES.includes(input.lastMode)) {
    return false;
  }
  return isDocumentRefinementMessage(input.message);
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

export function hasDetectorEvasionRequest(message: string): boolean {
  const text = message.trim().toLowerCase();
  if (!text) return false;

  return (
    /\b(ai detector|ai detectors|gptzero|turnitin|originality\.ai|zerogpt|copyleaks)\b/i.test(
      text
    ) &&
      /\b(undetectable|bypass|avoid|evade|beat|pass|not get detected|humanize|no watermark|watermark)\b/i.test(
        text
      )
  ) ||
    /\b(make|rewrite|humanize)\b.*\b(undetectable|not detectable|not get detected|bypass ai)\b/i.test(
      text
    ) ||
    /\b(remove|avoid|no)\b.*\b(ai watermark|watermark)\b/i.test(text);
}

export function detectDocumentWritingIntent(message: string): boolean {
  const text = message.trim().toLowerCase();
  if (!text) return false;
  if (detectNotesIntent(text)) return false;

  const documentNoun =
    /\b(essay|paper|research paper|report|letter|cover letter|email|application response|personal statement|statement of purpose|paragraph|intro|introduction|conclusion|thesis statement|document|word doc|word document|discussion post|speech|draft)\b/i;
  const writingVerb =
    /\b(write|draft|compose|rewrite|revise|polish|edit|improve|make|create|generate|help me write|help write)\b/i;

  if (hasDetectorEvasionRequest(text) && documentNoun.test(text)) {
    return true;
  }

  if (writingVerb.test(text) && documentNoun.test(text)) {
    return true;
  }

  if (
    /\b(write|draft|compose)\b.*\b(for|about|on)\b/i.test(text) &&
    /\b(school|class|college|application|assignment)\b/i.test(text)
  ) {
    return true;
  }

  if (
    /\b(make this sound better|polish this|rewrite this|revise this)\b/i.test(
      text
    ) &&
    /\b(paragraph|essay|paper|email|letter|draft|response)\b/i.test(text)
  ) {
    return true;
  }

  return false;
}
