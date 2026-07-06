/**
 * Planevo Command — input validation (§19, §36).
 */

export const MAX_INTAKE_TEXT_LENGTH = 8000;
export const MIN_INTAKE_TEXT_LENGTH = 1;

export type IntakeTextValidation =
  | { ok: true; text: string }
  | { ok: false; error: string };

/** Validate + trim raw capture text. Empty input is rejected (§36). */
export function validateIntakeText(raw: unknown): IntakeTextValidation {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'Text is required.' };
  }
  const text = raw.trim();
  if (text.length < MIN_INTAKE_TEXT_LENGTH) {
    return { ok: false, error: 'Type or say what is on your plate.' };
  }
  if (text.length > MAX_INTAKE_TEXT_LENGTH) {
    return {
      ok: false,
      error: `That is a lot at once — keep it under ${MAX_INTAKE_TEXT_LENGTH} characters.`,
    };
  }
  return { ok: true, text };
}
