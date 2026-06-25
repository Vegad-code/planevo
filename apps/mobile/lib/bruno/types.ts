import type { UIMessage } from 'ai';
import type { BrunoProgressPayload } from './bruno-progress';
import type { PlanType } from '@/lib/plan-types';

export type BrunoRateLimitLimitType = 'daily' | 'hourly';

export type BrunoRateLimitPayload = {
  error: 'rate_limit_reached';
  limitType: BrunoRateLimitLimitType;
  message: string;
  used: number;
  limit: number;
  plan: PlanType;
  resetAt: string;
};

export type BrunoDataParts = {
  'bruno-progress': BrunoProgressPayload;
};

export type BrunoUIMessage = UIMessage<unknown, BrunoDataParts>;
