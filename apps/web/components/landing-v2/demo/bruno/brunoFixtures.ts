import type { BrunoPersonaId, BrunoPersonaScenario, BrunoSkillKey } from './types';

export const BRUNO_PERSONAS: Array<{ id: BrunoPersonaId; label: string; headline: string; body: string }> = [
  {
    id: 'students',
    label: 'Students',
    headline: 'For students whose weeks never stay still',
    body: 'Capture class work, practices, and life in one breath. Planevo sorts it onto a calm board and plans it into the gaps you actually have.',
  },
  {
    id: 'creators',
    label: 'Creators',
    headline: 'For creators juggling a hundred threads',
    body: 'Dump ideas, deadlines, and follow-ups without losing the thread. Bruno helps you turn chaos into a board you can actually work from.',
  },
  {
    id: 'leaders',
    label: 'Leaders',
    headline: 'For leaders who need the team aligned',
    body: 'See what is on your plate, what moved, and what needs a decision — without another status meeting.',
  },
];

const SCENARIOS: Record<BrunoPersonaId, BrunoPersonaScenario> = {
  students: {
    trustMessage: 'Add my dentist appointment Thursday at 2pm to my calendar',
    trustEventTitle: 'Dentist appointment',
    trustEventMeta: 'Thu · 2:00–3:00 PM',
    trustDay: 'Thu',
    canvasMessage: 'Move my chem lab prep to tomorrow — I have office hours today',
    canvasAssignment: { title: 'Chem lab prep', course: 'CHEM 101', due: 'Today' },
    repairMessage: "I'm behind — fix my afternoon",
    repairSteps: ['Move bio block to 4pm gap', 'Shorten English reading to 25m', 'Keep soccer at 4'],
    reflectionMessage:
      'I keep falling behind and then I just shut down. I don\u2019t even know where to start.',
    breakdownTitle: 'Research paper',
    breakdownTasks: [
      { id: '1', title: 'Pick thesis angle', meta: '30m', priority: 'high' },
      { id: '2', title: 'Find 5 sources', meta: '45m', priority: 'high' },
      { id: '3', title: 'Outline intro + body', meta: '40m', priority: 'normal' },
      { id: '4', title: 'Draft first section', meta: '60m', priority: 'normal' },
    ],
    notesMessage: 'Turn my bio lecture into study notes',
    notesTitle: 'Enzyme activity — lecture notes',
    notesPreview:
      'Summary: enzyme rate increases with temperature until denaturation. Key terms: substrate, active site, activation energy.',
    integrationMessage: 'Find my group project brief in Notion',
    integrationSource: 'Notion',
    integrationResult: 'Group project brief — due Jul 12',
  },
  creators: {
    trustMessage: 'Block 90 minutes for client call prep Friday morning',
    trustEventTitle: 'Client call prep',
    trustEventMeta: 'Fri · 9:00–10:30 AM',
    trustDay: 'Fri',
    canvasMessage: 'Push newsletter draft to tomorrow morning',
    canvasAssignment: { title: 'Newsletter draft', course: 'Content', due: 'Today' },
    repairMessage: 'My shoot moved — reshuffle today around the new time',
    repairSteps: ['Move editing block to evening', 'Push admin email to tomorrow', 'Keep publish window'],
    reflectionMessage: 'Creative block again. Too many threads and I can\u2019t pick one.',
    breakdownTitle: 'Content series launch',
    breakdownTasks: [
      { id: '1', title: 'Script episode 1', meta: '2h', priority: 'urgent' },
      { id: '2', title: 'Batch B-roll list', meta: '45m', priority: 'high' },
      { id: '3', title: 'Thumbnail concepts', meta: '30m', priority: 'normal' },
    ],
    notesMessage: 'Draft this week\u2019s newsletter intro',
    notesTitle: 'Newsletter — week 24 intro',
    notesPreview:
      'Hook: what changed in your workflow this month. Three bullets on the launch, one honest lesson learned.',
    integrationMessage: 'Search Notion for sponsor deliverables',
    integrationSource: 'Notion',
    integrationResult: 'Sponsor deliverables — Q3 checklist',
  },
  leaders: {
    trustMessage: 'Move team sync to Wednesday at 3pm',
    trustEventTitle: 'Team sync',
    trustEventMeta: 'Wed · 3:00–3:45 PM',
    trustDay: 'Wed',
    canvasMessage: 'Reschedule Q1 review prep to Thursday',
    canvasAssignment: { title: 'Q1 review prep', course: 'Ops', due: 'Today' },
    repairMessage: 'Back-to-back meetings blew up my afternoon — fix it',
    repairSteps: ['Defer 1:1 notes to 5pm', 'Protect 30m decision block', 'Move slide review to tomorrow'],
    reflectionMessage: 'Decision fatigue — too many open loops and no clear next move.',
    breakdownTitle: 'Q1 planning review',
    breakdownTasks: [
      { id: '1', title: 'Pull metrics snapshot', meta: '20m', priority: 'urgent' },
      { id: '2', title: 'Draft talking points', meta: '35m', priority: 'high' },
      { id: '3', title: 'Flag risks for team', meta: '25m', priority: 'normal' },
    ],
    notesMessage: 'Summarize yesterday\u2019s standup for the team doc',
    notesTitle: 'Standup summary — Jul 6',
    notesPreview:
      'Shipped onboarding fix. Blocked on design review. Needs decision on pricing experiment by Friday.',
    integrationMessage: 'Find the hiring thread in Slack and make it a task',
    integrationSource: 'Slack',
    integrationResult: '#hiring — senior eng thread',
  },
};

export function getBrunoScenario(persona: BrunoPersonaId): BrunoPersonaScenario {
  return SCENARIOS[persona];
}

export const BRUNO_SKILLS: Array<{
  key: BrunoSkillKey;
  label: string;
  description: string;
  pro?: boolean;
}> = [
  {
    key: 'daily_planning' as const,
    label: 'Plan your day',
    description: 'Finds real gaps in your calendar and blocks focus time',
  },
  {
    key: 'schedule_repair' as const,
    label: 'Fix a messy week',
    description: 'Re-reads your calendar when plans fall apart',
  },
  {
    key: 'project_breakdown' as const,
    label: 'Break down big work',
    description: 'Turns assignments into schedulable steps',
  },
  {
    key: 'task_management' as const,
    label: 'Manage tasks',
    description: 'Create, move, and prioritize without leaving chat',
  },
  {
    key: 'emotional_recovery' as const,
    label: 'Reflect & recenter',
    description: 'Grounded support when you\u2019re overwhelmed \u2014 no lecture',
  },
  {
    key: 'notes' as const,
    label: 'Notes & writing',
    description: 'Capture ideas and draft what you\u2019ve been putting off',
  },
  {
    key: 'integrations' as const,
    label: 'Connected apps',
    description: 'Search Notion, Slack, and Linear from chat',
    pro: true,
  },
];
