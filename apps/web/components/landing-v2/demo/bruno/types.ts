export type BrunoPersonaId = 'students' | 'creators' | 'leaders';

export type BrunoSkillKey =
  | 'daily_planning'
  | 'schedule_repair'
  | 'project_breakdown'
  | 'task_management'
  | 'emotional_recovery'
  | 'notes'
  | 'integrations';

export interface BrunoCalendarEvent {
  day: string;
  label: string;
  time: string;
}

export interface BrunoTaskRow {
  id: string;
  title: string;
  meta: string;
  priority?: 'urgent' | 'high' | 'normal';
}

export interface BrunoCanvasAssignment {
  title: string;
  course: string;
  due: string;
}

export interface BrunoPersonaScenario {
  trustMessage: string;
  trustEventTitle: string;
  trustEventMeta: string;
  trustDay: string;
  canvasMessage: string;
  canvasAssignment: BrunoCanvasAssignment;
  repairMessage: string;
  repairSteps: string[];
  reflectionMessage: string;
  breakdownTitle: string;
  breakdownTasks: BrunoTaskRow[];
  notesMessage: string;
  notesTitle: string;
  notesPreview: string;
  integrationMessage: string;
  integrationSource: string;
  integrationResult: string;
}
