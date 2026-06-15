import { BRUNO_PRO_MONTHLY_DEEP_LIMIT } from './modelPolicy';
import type { BrunoEntitlement } from './types';

export type BrunoCreditType =
  | 'onboarding_deep'
  | 'earned_deep'
  | 'pro_monthly_deep'
  | 'manual_adjustment';

export type BrunoCreditLedgerEntry = {
  creditType: BrunoCreditType;
  delta: number;
  createdAt: string;
};

function isSameUtcMonth(date: Date, now: Date) {
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth()
  );
}

function sumCredits(
  ledger: BrunoCreditLedgerEntry[],
  type: BrunoCreditType,
  predicate: (entry: BrunoCreditLedgerEntry) => boolean = () => true
) {
  return ledger
    .filter((entry) => entry.creditType === type && predicate(entry))
    .reduce((total, entry) => total + entry.delta, 0);
}

export function buildBrunoEntitlement(input: {
  isPro: boolean;
  ledger: BrunoCreditLedgerEntry[];
  now?: Date;
  monthlyAiBudgetCentsRemaining?: number | null;
  abuseScore?: number;
}): BrunoEntitlement {
  const now = input.now ?? new Date();
  const monthlyProBalance = sumCredits(
    input.ledger,
    'pro_monthly_deep',
    (entry) => isSameUtcMonth(new Date(entry.createdAt), now)
  );
  const monthlyProUsed = Math.max(0, -monthlyProBalance);

  return {
    isPro: input.isPro,
    onboardingDeepCreditsRemaining: Math.max(
      0,
      sumCredits(input.ledger, 'onboarding_deep')
    ),
    earnedDeepCreditsRemaining: Math.max(
      0,
      sumCredits(input.ledger, 'earned_deep')
    ),
    monthlyDeepRequestsRemaining: input.isPro
      ? Math.max(0, BRUNO_PRO_MONTHLY_DEEP_LIMIT - monthlyProUsed)
      : 0,
    monthlyAiBudgetCentsRemaining:
      input.monthlyAiBudgetCentsRemaining ?? null,
    abuseScore: input.abuseScore ?? 0,
  };
}
