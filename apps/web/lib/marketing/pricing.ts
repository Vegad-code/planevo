export const TRIAL_DAYS = 14;

export const PRO_MONTHLY_PRICE = 9.99;
export const PRO_ANNUAL_PRICE = 79.99;
export const STUDENT_MONTHLY_PRICE = 4.99;

const ANNUAL_SAVINGS_PERCENT = Math.round(
  (1 - PRO_ANNUAL_PRICE / (PRO_MONTHLY_PRICE * 12)) * 100
);

export const ANNUAL_SAVINGS_LABEL = `Save ${ANNUAL_SAVINGS_PERCENT}%`;

export function formatProPrice(annual: boolean): string {
  const amount = annual ? PRO_ANNUAL_PRICE / 12 : PRO_MONTHLY_PRICE;
  return `$${amount.toFixed(2)}`;
}

export function formatStudentPrice(_annual: boolean): string {
  return `$${STUDENT_MONTHLY_PRICE.toFixed(2)}`;
}

export function proAnnualBilledNote(): string {
  return `Billed annually at $${PRO_ANNUAL_PRICE.toFixed(2)}`;
}

export const PRICING_COPY = {
  heroEyebrow: `${TRIAL_DAYS}-day free trial · Pro when you're ready`,
  heroSubhead:
    'Every new account starts with 14 days of Pro. After that, subscribe to keep the limits lifted — or stay on Free.',
  freeTierLabel: 'Free (after trial)',
  freeTierSubtitle:
    "Stay on Free if you don't subscribe — core product with daily limits.",
  freeTierPriceSuffix: '/ after trial',
  freeTierCta: 'Sign up free',
  freeTierCtaNote: 'No card to sign up · Card required to start Pro trial',
  proTrialCta: `Start ${TRIAL_DAYS}-day free trial`,
  annualToggleLabel: `Annual · ${ANNUAL_SAVINGS_LABEL}`,
  pageDescription:
    'Start with a 14-day Pro trial. Then $9.99/mo, or stay on Free with limits lifted only when you need them.',
  landingHeadline: 'Try Pro free. Stay on Free if you need to.',
  landingSubhead:
    'Every new account gets 14 days of Pro. After that, subscribe to keep the limits lifted — or continue on Free.',
} as const;

export function proTrialFootnote(monthlyPrice: string): string {
  return `${TRIAL_DAYS}-day free trial, then ${monthlyPrice}/mo · Cancel any time`;
}

export function proTrialFootnoteWithBilling(annual: boolean): string {
  const monthlyPrice = formatProPrice(annual);
  if (annual) {
    return `${TRIAL_DAYS}-day free trial, then ${monthlyPrice}/mo (${proAnnualBilledNote()}) · Cancel any time`;
  }
  return proTrialFootnote(monthlyPrice);
}

export const FREE_PERKS = [
  'The whole product — capture, calm board, plan my day',
  'Tasks, calendar, and notes',
  'Canvas + Google Calendar sync',
  'Adaptive rollover when the day changes',
  'Bruno, your AI companion — 5 asks a day',
];

export const PRO_PERKS = [
  'Everything in Free, with the limits lifted',
  'Unlimited Bruno — including deep thinking',
  'Unlimited plan-my-day + priority replanning',
  'Connected apps: Notion, Slack, Linear',
  'Priority support',
];

export interface ComparisonRow {
  feature: string;
  free: string | boolean;
  pro: string | boolean;
}

export interface ComparisonGroup {
  title: string;
  rows: ComparisonRow[];
}

export const COMPARISON_GROUPS: ComparisonGroup[] = [
  {
    title: 'Core product',
    rows: [
      { feature: 'Command capture & calm board', free: true, pro: true },
      { feature: 'Plan my day', free: 'Limited', pro: 'Unlimited' },
      { feature: 'Tasks, calendar, notes', free: true, pro: true },
      { feature: 'Canvas + Google Calendar', free: true, pro: true },
    ],
  },
  {
    title: 'Bruno',
    rows: [
      { feature: 'Daily asks', free: '5 / day', pro: 'Unlimited' },
      { feature: 'Deep thinking mode', free: false, pro: true },
      { feature: 'Propose & approve actions', free: true, pro: true },
    ],
  },
  {
    title: 'Integrations',
    rows: [
      { feature: 'Canvas LMS', free: true, pro: true },
      { feature: 'Google Calendar', free: 'Read sync', pro: 'Read sync' },
      { feature: 'Notion, Slack, Linear', free: false, pro: true },
    ],
  },
  {
    title: 'Support & platforms',
    rows: [
      { feature: 'Web, iOS, Android', free: true, pro: true },
      { feature: 'Customer support', free: 'Standard', pro: 'Priority' },
    ],
  },
];
