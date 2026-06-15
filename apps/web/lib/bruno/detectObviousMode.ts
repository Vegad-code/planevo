import { detectAppAction } from './detectAppAction';
import type { BrunoMode, BrunoRouteDecision } from './types';

type RouteOptions = Omit<
  BrunoRouteDecision,
  'mode' | 'confidence' | 'rationale'
>;

function decision(
  mode: BrunoMode,
  confidence: number,
  rationale: string,
  options: RouteOptions
): BrunoRouteDecision {
  return { mode, confidence, rationale, ...options };
}

const SHORT_NO_CONTEXT: RouteOptions = {
  needsCalendarContext: false,
  needsTaskContext: false,
  needsCanvasContext: false,
  estimatedOutputSize: 'short',
  upgradeMoment: false,
};

export function detectObviousMode(
  message: string
): BrunoRouteDecision | null {
  const text = message.trim().toLowerCase();

  if (detectAppAction(text)) {
    return decision('app_action', 0.95, 'obvious app action', {
      ...SHORT_NO_CONTEXT,
      needsTaskContext: true,
    });
  }

  if (
    /\b(kill myself|suicide|end my life|hurt myself|self[- ]harm)\b/i.test(text)
  ) {
    return decision('unsafe', 0.99, 'crisis language', SHORT_NO_CONTEXT);
  }

  if (
    /\b(subscription|billing|upgrade|deep credits?|usage limit|requests? remaining|deep bruno requests?)\b/i.test(
      text
    )
  ) {
    return decision(
      'account_or_billing',
      0.88,
      'account or billing request',
      SHORT_NO_CONTEXT
    );
  }

  if (
    /\b(wasted (the whole|the|my) day|hate myself|feel like (a )?failure|can'?t start|cannot start|overwhelmed|giving up)\b/i.test(
      text
    )
  ) {
    return decision(
      'emotional_recovery',
      0.84,
      'emotional recovery signal',
      {
        needsCalendarContext: true,
        needsTaskContext: true,
        needsCanvasContext: false,
        estimatedOutputSize: 'medium',
        upgradeMoment: false,
      }
    );
  }

  if (
    /\b(got behind|missed my (morning|tasks?)|fix the rest of (my|the) day|only have \w+ hours? now|recover my schedule)\b/i.test(
      text
    )
  ) {
    return decision('schedule_repair', 0.86, 'same-day schedule repair', {
      needsCalendarContext: true,
      needsTaskContext: true,
      needsCanvasContext: false,
      estimatedOutputSize: 'medium',
      upgradeMoment: false,
    });
  }

  if (
    /\b(missing assignments?|overdue|due tomorrow|fix my week|rescue me|catch[- ]?up|three missing|multiple deadlines?)\b/i.test(
      text
    )
  ) {
    return decision(
      'deadline_rescue',
      0.86,
      'deadline or multi-day catch-up rescue',
      {
        needsCalendarContext: true,
        needsTaskContext: true,
        needsCanvasContext: true,
        estimatedOutputSize: 'long',
        upgradeMoment: true,
      }
    );
  }

  if (
    /\b(teach me|explain|quiz me|practice questions?|study guide|ap (macro|world|bio|chem|physics)|exam prep|test prep)\b/i.test(
      text
    )
  ) {
    return decision(
      'academic_tutoring',
      0.86,
      'academic tutoring request',
      {
        needsCalendarContext: false,
        needsTaskContext: false,
        needsCanvasContext: false,
        estimatedOutputSize: 'medium',
        upgradeMoment: true,
      }
    );
  }

  if (
    /\b(next\.?js|react|typescript|supabase|vercel|api route|backend|frontend|database|migration|github|repo|debug|codebase|source code|programming|coding)\b/i.test(
      text
    )
  ) {
    return decision('coding_help', 0.88, 'coding implementation request', {
      needsCalendarContext: false,
      needsTaskContext: false,
      needsCanvasContext: false,
      estimatedOutputSize: 'long',
      upgradeMoment: true,
    });
  }

  if (
    /\b(break down|breakdown|project plan|research paper|video project|app feature)\b/i.test(
      text
    ) &&
    /\b(steps?|weeks?|phases?|finish|build)\b/i.test(text)
  ) {
    return decision(
      'project_breakdown',
      0.83,
      'multi-step project breakdown',
      {
        needsCalendarContext: true,
        needsTaskContext: true,
        needsCanvasContext: true,
        estimatedOutputSize: 'long',
        upgradeMoment: true,
      }
    );
  }

  if (
    /\b(plan my (day|afternoon|night|evening)|plan today|daily plan|schedule my day|what should i do today)\b/i.test(
      text
    )
  ) {
    return decision('daily_planning', 0.86, 'daily planning request', {
      needsCalendarContext: true,
      needsTaskContext: true,
      needsCanvasContext: false,
      estimatedOutputSize: 'medium',
      upgradeMoment: false,
    });
  }

  if (
    /\b(chores?|grocery list|cleaning|organize (these|my)|which task|what should i do first|task list)\b/i.test(
      text
    )
  ) {
    return decision('task_management', 0.8, 'basic task management', {
      needsCalendarContext: false,
      needsTaskContext: true,
      needsCanvasContext: false,
      estimatedOutputSize: 'medium',
      upgradeMoment: false,
    });
  }

  if (/^(hi|hey|hello|thanks|thank you|what can you do)[!?. ]*$/i.test(text)) {
    return decision('basic_chat', 0.9, 'basic conversation', SHORT_NO_CONTEXT);
  }

  return null;
}
