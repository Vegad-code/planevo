import type {
  BrunoMode,
  BrunoProCapNotice,
  BrunoProWarningNotice,
  BrunoUpgradeCard,
} from './types';

export function getBrunoUpgradeCard(
  mode: BrunoMode
): BrunoUpgradeCard | null {
  if (
    ![
      'academic_tutoring',
      'deadline_rescue',
      'project_breakdown',
    ].includes(mode)
  ) {
    return null;
  }

  if (mode === 'academic_tutoring') {
    return {
      type: 'bruno_upgrade_card',
      mode,
      title: 'Unlock Deep Bruno for full tutoring',
      body: 'Deep Bruno can turn this into a complete guided study session.',
      bullets: [
        'Step-by-step explanation',
        'Practice questions',
        'Mistake traps',
        'Personalized revision',
      ],
      ctaText: 'Upgrade to Pro',
      ctaHref: '/settings/billing',
    };
  }

  if (mode === 'deadline_rescue') {
    return {
      type: 'bruno_upgrade_card',
      mode,
      title: 'Unlock Deep Bruno for a full rescue plan',
      body: 'Deep Bruno can rebuild your week around deadlines and available time.',
      bullets: [
        'Multi-day catch-up plan',
        'Calendar-aware schedule',
        'Deadline triage',
        'No-shame rollover strategy',
      ],
      ctaText: 'Upgrade to Pro',
      ctaHref: '/settings/billing',
    };
  }

  return {
    type: 'bruno_upgrade_card',
    mode,
    title: 'Unlock Deep Bruno',
    body: 'Deep Bruno provides longer, more personalized help for complex requests.',
    bullets: ['Deeper reasoning', 'Longer plans', 'More context', 'Better revisions'],
    ctaText: 'Upgrade to Pro',
    ctaHref: '/settings/billing',
  };
}

export function getBrunoProWarning(
  remaining: number
): BrunoProWarningNotice {
  return {
    type: 'bruno_pro_warning',
    title: 'Deep Bruno monthly usage',
    body: `You have ${remaining} Deep Bruno requests left this month. Standard Bruno remains available after the limit.`,
    remaining,
  };
}

export function getBrunoProCapNotice(): BrunoProCapNotice {
  return {
    type: 'bruno_pro_cap',
    title: 'Deep Bruno monthly limit reached',
    body: 'This response uses Standard Bruno. App actions and everyday planning remain available.',
  };
}
