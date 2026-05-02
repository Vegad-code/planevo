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
    id: 'github',
    name: 'GitHub',
    category: 'Professional',
    description: 'Sync PRs, issues, and daily commit activity via N8N Signal.',
    icon: 'GithubLogo',
    status: 'disconnected',
    requiresConfig: true,
    premiumOnly: true
  },
  {
    id: 'jira',
    name: 'Jira',
    category: 'Professional',
    description: 'Sync sprint tasks and issue assignments via N8N Signal.',
    icon: 'Kanban',
    status: 'disconnected',
    requiresConfig: true,
    premiumOnly: true
  },
  {
    id: 'n8n',
    name: 'N8N Signal Link',
    category: 'Automation',
    description: 'Generate your tactical token to pipe external data into Ollie.',
    icon: 'Lightning',
    status: 'connected',
    requiresConfig: true,
    premiumOnly: true
  }
];
