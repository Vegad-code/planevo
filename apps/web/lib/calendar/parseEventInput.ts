import {
  parseEventInput as parseEventInputCore,
  parseNaturalInput as parseNaturalInputCore,
  type ParsedNaturalInput,
} from '@planevo/nlp-core';

export type ParsedEventInput = ParsedNaturalInput;

export function parseNaturalInput(
  input: string,
  refDate: Date = new Date(),
  options?: { smartSchedulingEnabled?: boolean }
): ParsedNaturalInput {
  return parseNaturalInputCore(input, refDate, {
    refDate,
    intent: 'auto',
    smartSchedulingEnabled: options?.smartSchedulingEnabled,
  });
}

export function parseEventInput(
  input: string,
  refDate: Date = new Date()
): ParsedEventInput {
  return parseEventInputCore(input, refDate);
}

export type { ParsedNaturalInput };
