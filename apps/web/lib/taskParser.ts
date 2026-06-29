import type { TaskPriority } from '@/types/tasks';
import {
  mapToTaskDraft,
  parseNaturalInput,
  parseTaskInput as parseTaskInputCore,
  type ParsedTask as CoreParsedTask,
} from '@planevo/nlp-core';

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
  confidence?: number;
  chips?: string[];
}

function toWebParsedTask(core: CoreParsedTask): ParsedTask {
  return {
    title: core.title,
    priority: core.priority as TaskPriority | undefined,
    estimatedMinutes: core.estimatedMinutes,
    dueDate: core.dueDate,
    dueDateOnly: core.dueDateOnly,
    source: core.source,
    isRecurring: core.isRecurring,
    recurrencePattern: core.recurrencePattern,
    isBacklog: core.isBacklog,
    confidence: core.confidence,
    chips: core.chips,
  };
}

/**
 * NLP parser for task inputs. Delegates to shared @planevo/nlp-core pipeline.
 */
export function parseTaskInput(
  input: string,
  refDate: Date = new Date(),
  options?: { smartSchedulingEnabled?: boolean }
): ParsedTask {
  return toWebParsedTask(parseTaskInputCore(input, refDate, options));
}

export function mapTaskFromNaturalInput(
  input: string,
  refDate: Date = new Date(),
  options?: { smartSchedulingEnabled?: boolean }
): ParsedTask {
  const parsed = parseNaturalInput(input, refDate, {
    refDate,
    intent: 'task',
    smartSchedulingEnabled: options?.smartSchedulingEnabled,
  });
  return toWebParsedTask(mapToTaskDraft(parsed));
}
