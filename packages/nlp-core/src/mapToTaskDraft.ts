import { format } from 'date-fns';
import { parseNaturalInput, type ParsedNaturalInput } from './parseNaturalInput';
import type { TaskPriority } from './types';

export interface ParsedTask {
  title: string;
  priority?: TaskPriority;
  estimatedMinutes?: number;
  dueDate?: string;
  dueDateOnly?: boolean;
  source?: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
  isBacklog?: boolean;
  confidence: number;
  chips: string[];
}

function toDateOnlyString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function mapToTaskDraft(parsed: ParsedNaturalInput): ParsedTask {
  let dueDate: string | undefined;

  if (!parsed.isBacklog && parsed.startAt) {
    if (parsed.dateOnly || parsed.hasDueCue) {
      dueDate = toDateOnlyString(parsed.startAt);
    } else {
      dueDate = parsed.startAt.toISOString();
    }
  }

  return {
    title: parsed.title,
    priority: parsed.priority,
    estimatedMinutes: parsed.estimatedMinutes,
    dueDate,
    dueDateOnly: parsed.dateOnly,
    source: parsed.source,
    isRecurring: Boolean(parsed.recurrencePattern),
    recurrencePattern: parsed.recurrencePattern,
    isBacklog: parsed.isBacklog,
    confidence: parsed.confidence,
    chips: parsed.chips,
  };
}

export function parseTaskInput(
  input: string,
  refDate: Date = new Date(),
  options?: { smartSchedulingEnabled?: boolean }
): ParsedTask {
  const parsed = parseNaturalInput(input, refDate, {
    refDate,
    intent: 'task',
    smartSchedulingEnabled: options?.smartSchedulingEnabled,
  });
  return mapToTaskDraft(parsed);
}
