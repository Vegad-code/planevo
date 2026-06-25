import { TaskPriority } from '@/types/tasks';
import { parseEventInput } from '@/lib/calendar/parseEventInput';

export interface ParsedTask {
  title: string;
  priority?: TaskPriority;
  estimatedMinutes?: number;
  dueDate?: string;
  source?: string;
}

/**
 * NLP parser for task inputs. Delegates date/time to chrono via parseEventInput.
 */
export function parseTaskInput(
  input: string,
  refDate: Date = new Date()
): ParsedTask {
  const parsed = parseEventInput(input, refDate);

  return {
    title: parsed.title,
    priority: parsed.priority,
    estimatedMinutes: parsed.estimatedMinutes,
    dueDate: parsed.startAt?.toISOString(),
    source: parsed.source,
  };
}
