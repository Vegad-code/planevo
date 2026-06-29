export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TextSpan {
  start: number;
  end: number;
}

export type EntityKind =
  | 'datetime'
  | 'duration'
  | 'priority'
  | 'tag'
  | 'recurrence'
  | 'dueCue'
  | 'backlog';

export interface ParsedEntity {
  kind: EntityKind;
  span: TextSpan;
  confidence: number;
  value: unknown;
}

export interface DurationMatch {
  minutes: number;
  span: TextSpan;
  confidence: number;
}

export interface RecurrenceMatch {
  rrule: string;
  label: string;
  span: TextSpan;
  confidence: number;
}

export interface ParseContext {
  refDate: Date;
  intent?: 'event' | 'task' | 'auto';
  smartSchedulingEnabled?: boolean;
}
