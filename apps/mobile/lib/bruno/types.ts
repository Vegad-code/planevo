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

export type BrunoAssistantMode = 'general' | 'planning';

export type BrunoClarificationOption = {
  id: string;
  label: string;
  description?: string;
};

export type BrunoClarificationQuestion = {
  id: string;
  question: string;
  options: BrunoClarificationOption[];
  allowOther: true;
};

export type BrunoClarificationCard = {
  type: 'bruno_clarification_card';
  id: string;
  intro: string;
  originalPrompt: string;
  questions: BrunoClarificationQuestion[];
};

export type BrunoClarificationAnswer = {
  questionId: string;
  question: string;
  answer: string;
  source: 'option' | 'other' | 'skip';
};

export type BrunoClarificationResponse = {
  cardId: string;
  originalPrompt: string;
  answers: BrunoClarificationAnswer[];
};

export type BrunoDataParts = {
  'bruno-progress': BrunoProgressPayload;
  'bruno-clarification-card': BrunoClarificationCard;
};

export type BrunoUIMessage = UIMessage<unknown, BrunoDataParts>;
