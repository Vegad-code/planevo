export type IntegrationCategory = 'Academic' | 'Professional' | 'Automation';

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'coming_soon';

export interface IntegrationDefinition {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  icon: string;
  status: IntegrationStatus;
  requiresConfig: boolean;
  premiumOnly: boolean;
}

export const INTEGRATION_REGISTRY: IntegrationDefinition[] = [
  {
    id: 'canvas',
    name: 'Canvas LMS',
    category: 'Academic',
    description: 'Sync courses, assignments, and deadlines automatically.',
    icon: 'GraduationCap',
    status: 'disconnected',
    requiresConfig: true,
    premiumOnly: false
  },
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    category: 'Academic',
    description: 'Sync your daily schedule, classes, and events via N8N Signal.',
    icon: 'CalendarBlank',
    status: 'disconnected',
    requiresConfig: true,
    premiumOnly: false
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'Professional',
    description: 'Sync your Notion databases, tasks, and notes.',
    icon: 'Notebook',
    status: 'coming_soon',
    requiresConfig: true,
    premiumOnly: true
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'Professional',
    description: 'Sync important messages and channel actions.',
    icon: 'Hash',
    status: 'coming_soon',
    requiresConfig: true,
    premiumOnly: true
  },
  {
    id: 'monday',
    name: 'Monday.com',
    category: 'Professional',
    description: 'Sync boards, tasks, and project deadlines.',
    icon: 'Kanban',
    status: 'coming_soon',
    requiresConfig: true,
    premiumOnly: true
  }
];
