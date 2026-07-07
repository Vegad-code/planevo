export type IntegrationAppKey = 'notion' | 'slack' | 'linear';

export interface IntegrationDemoScenario {
  app: IntegrationAppKey;
  label: string;
  userMessage: string;
  resultTitle: string;
  resultMeta: string;
  proposalIntro: string;
  approveLabel: string;
}

const INTEGRATION_APPS: IntegrationAppKey[] = ['notion', 'slack', 'linear'];

export const INTEGRATION_DEMOS: IntegrationDemoScenario[] = [
  {
    app: 'notion',
    label: 'Notion',
    userMessage: 'Find my group project brief in Notion',
    resultTitle: 'Group project brief',
    resultMeta: 'Notion · due Jul 12',
    proposalIntro: 'Found it in Notion — turn this into a task?',
    approveLabel: 'Add task',
  },
  {
    app: 'notion',
    label: 'Notion',
    userMessage: 'Search Notion for sponsor deliverables',
    resultTitle: 'Sponsor deliverables — Q3',
    resultMeta: 'Notion · checklist page',
    proposalIntro: 'This page looks right — want it on your board?',
    approveLabel: 'Add task',
  },
  {
    app: 'notion',
    label: 'Notion',
    userMessage: 'Pull up my lecture notes doc from last Tuesday',
    resultTitle: 'Bio lecture notes — Jul 1',
    resultMeta: 'Notion · 4 pages',
    proposalIntro: 'Got the doc — save a link to your tasks?',
    approveLabel: 'Save link',
  },
  {
    app: 'slack',
    label: 'Slack',
    userMessage: 'Find the hiring thread in Slack and make it a task',
    resultTitle: '#hiring — senior eng thread',
    resultMeta: 'Slack · 12 replies',
    proposalIntro: 'Found the thread — turn the ask into a task?',
    approveLabel: 'Add task',
  },
  {
    app: 'slack',
    label: 'Slack',
    userMessage: 'What did the team decide in #launch about the ship date?',
    resultTitle: '#launch — ship Friday, pending QA',
    resultMeta: 'Slack · decision Jul 5',
    proposalIntro: 'Here\u2019s the call — block time to follow up?',
    approveLabel: 'Block time',
  },
  {
    app: 'slack',
    label: 'Slack',
    userMessage: 'Summarize yesterday\u2019s standup in #team-updates',
    resultTitle: '#team-updates — standup recap',
    resultMeta: 'Slack · 8 messages',
    proposalIntro: 'Short recap ready — add the action items?',
    approveLabel: 'Add tasks',
  },
  {
    app: 'linear',
    label: 'Linear',
    userMessage: 'What\u2019s blocking the onboarding epic?',
    resultTitle: 'ENG-284 · Onboarding',
    resultMeta: 'Linear · blocked on design review',
    proposalIntro: 'This issue is blocked — ping design or reschedule?',
    approveLabel: 'Create follow-up',
  },
  {
    app: 'linear',
    label: 'Linear',
    userMessage: 'Show open bugs assigned to me in Linear',
    resultTitle: 'PLN-92 · Calendar sync drops events',
    resultMeta: 'Linear · high priority',
    proposalIntro: 'Top bug on your list — slot time to fix it?',
    approveLabel: 'Schedule fix',
  },
  {
    app: 'linear',
    label: 'Linear',
    userMessage: 'Find high-priority issues for this sprint',
    resultTitle: 'ENG-301 · Sprint carryover (3)',
    resultMeta: 'Linear · sprint 24',
    proposalIntro: 'Three urgent issues — add them to today\u2019s plan?',
    approveLabel: 'Add to plan',
  },
];

const DEMOS_BY_APP: Record<IntegrationAppKey, IntegrationDemoScenario[]> = {
  notion: INTEGRATION_DEMOS.filter((demo) => demo.app === 'notion'),
  slack: INTEGRATION_DEMOS.filter((demo) => demo.app === 'slack'),
  linear: INTEGRATION_DEMOS.filter((demo) => demo.app === 'linear'),
};

function shuffleApps(): IntegrationAppKey[] {
  const apps = [...INTEGRATION_APPS];
  for (let i = apps.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [apps[i], apps[j]] = [apps[j]!, apps[i]!];
  }
  return apps;
}

function pickScenarioForApp(
  app: IntegrationAppKey,
  lastMessage: string | null,
): IntegrationDemoScenario {
  const candidates = DEMOS_BY_APP[app];
  const withoutRepeat =
    lastMessage && candidates.length > 1
      ? candidates.filter((demo) => demo.userMessage !== lastMessage)
      : candidates;

  const pool = withoutRepeat.length > 0 ? withoutRepeat : candidates;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

/** Cycles Notion → Slack → Linear (shuffled each round) so every replay hits a different app. */
export function createIntegrationDemoPicker() {
  let bag: IntegrationAppKey[] = [];
  let lastMessage: string | null = null;

  return function pickIntegrationDemo(): IntegrationDemoScenario {
    if (bag.length === 0) {
      bag = shuffleApps();
    }

    const app = bag.pop()!;
    const scenario = pickScenarioForApp(app, lastMessage);
    lastMessage = scenario.userMessage;
    return scenario;
  };
}
