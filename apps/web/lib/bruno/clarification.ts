import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { detectAppAction } from './detectAppAction';
import { BRUNO_MODELS } from './modelPolicy';
import type {
  BrunoClarificationCard,
  BrunoClarificationResponse,
  BrunoMode,
  BrunoRouteDecision,
} from './types';

type ChatMessage = {
  role: 'user' | 'assistant' | 'tool';
  content?: string | unknown[] | null;
  parts?: unknown[];
};

export const brunoClarificationOptionSchema = z.object({
  id: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(90),
  description: z.string().trim().max(140).optional(),
});

export const brunoClarificationQuestionSchema = z.object({
  id: z.string().trim().min(1).max(40),
  question: z.string().trim().min(8).max(160),
  options: z.array(brunoClarificationOptionSchema).min(2).max(4),
  allowOther: z.literal(true),
});

export const brunoClarificationCardSchema = z.object({
  type: z.literal('bruno_clarification_card'),
  id: z.string().trim().min(1).max(80),
  intro: z.string().trim().min(8).max(260),
  originalPrompt: z.string().trim().min(1).max(6000),
  questions: z.array(brunoClarificationQuestionSchema).min(1).max(4),
});

export const brunoClarificationAnswerSchema = z.object({
  questionId: z.string().trim().min(1).max(40),
  question: z.string().trim().min(1).max(200),
  answer: z.string().trim().min(1).max(500),
  source: z.enum(['option', 'other', 'skip']),
});

export const brunoClarificationResponseSchema = z.object({
  cardId: z.string().trim().min(1).max(80),
  originalPrompt: z.string().trim().min(1).max(6000),
  answers: z.array(brunoClarificationAnswerSchema).min(1).max(4),
});

const generatedClarificationSchema = z.object({
  intro: z.string().trim().min(8).max(220),
  questions: z.array(
    z.object({
      question: z.string().trim().min(8).max(150),
      options: z.array(
        z.object({
          label: z.string().trim().min(1).max(80),
          description: z.string().trim().max(120).optional(),
        })
      ).min(2).max(4),
    })
  ).min(2).max(4),
});

type ClarificationDraft = z.infer<typeof generatedClarificationSchema>;

type TokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
};

type GenerateClarificationInput = {
  message: string;
  routeMode: BrunoMode;
  userName?: string | null;
  pageLabel?: string | null;
  localTime?: string;
  timeZone?: string;
};

type GenerateClarificationDependencies = {
  generate?: (input: GenerateClarificationInput) => Promise<{
    draft: ClarificationDraft;
    usage?: TokenUsage;
  }>;
  idFactory?: () => string;
  onGenerationError?: (error: unknown) => void;
};

type ShouldRequestClarificationInput = {
  message: string;
  decision: Pick<BrunoRouteDecision, 'mode' | 'confidence'>;
  clarificationResponse?: BrunoClarificationResponse | null;
  env?: Record<string, string | undefined>;
};

const CLARIFIABLE_MODES = new Set<BrunoMode>([
  'basic_chat',
  'task_management',
  'daily_planning',
  'schedule_repair',
  'deadline_rescue',
  'academic_tutoring',
  'notes',
  'document_writing',
  'project_breakdown',
  'coding_help',
  'emotional_recovery',
]);

const NEVER_CLARIFY_MODES = new Set<BrunoMode>([
  'app_action',
  'account_or_billing',
  'unsafe',
]);

const BROAD_REQUEST_PATTERNS = [
  /\b(help|plan|organize|prioritize|schedule|fix|improve|prepare|study|learn|teach|explain|review|break\s*down|outline|write|draft|make|create|build)\b/i,
  /\b(what should i do|where do i start|best way|how should i|can you help|i need help)\b/i,
  /\b(my day|my week|this project|this assignment|this essay|this exam|my schedule|my tasks|my notes)\b/i,
];

const SPECIFIC_DETAIL_PATTERNS = [
  /\b\d{1,2}(:\d{2})?\s?(am|pm)\b/i,
  /\b\d+\s?(minutes?|mins?|hours?|hrs?|days?|weeks?)\b/i,
  /\b(today|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\b(AP|SAT|ACT|exam|quiz|test|essay|paper|project|homework|assignment)\b/i,
  /"[^"]{3,}"/,
];

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function isFeatureEnabled(env: Record<string, string | undefined> = process.env) {
  return env.BRUNO_CLARIFICATION_CARDS_ENABLED?.toLowerCase() !== 'false';
}

function isGreetingOrThanks(text: string) {
  return /^(hi|hey|hello|yo|thanks|thank you|thx|what can you do)[!?. ]*$/i.test(
    text.trim()
  );
}

function isExplicitFollowUp(text: string) {
  return /^(continue|go on|keep going|yes|yeah|yep|ok|okay|sounds good|looks good|do it|confirm|approved?|skip|answer with assumptions)[!?. ]*$/i.test(
    text.trim()
  );
}

function isNarrowFactQuestion(text: string) {
  const trimmed = text.trim();
  if (wordCount(trimmed) > 16) return false;
  return /^(what is|what are|who is|who are|when is|where is|define)\b/i.test(
    trimmed
  );
}

export function shouldRequestClarification({
  message,
  decision,
  clarificationResponse,
  env,
}: ShouldRequestClarificationInput) {
  const text = message.trim();
  if (!isFeatureEnabled(env)) return false;
  if (clarificationResponse) return false;
  if (!text) return false;
  if (NEVER_CLARIFY_MODES.has(decision.mode)) return false;
  if (!CLARIFIABLE_MODES.has(decision.mode)) return false;
  if (isGreetingOrThanks(text)) return false;
  if (isExplicitFollowUp(text)) return false;
  if (isNarrowFactQuestion(text)) return false;
  if (detectAppAction(text)) return false;

  const words = wordCount(text);
  const broad = BROAD_REQUEST_PATTERNS.some((pattern) => pattern.test(text));
  const hasSpecificDetail = SPECIFIC_DETAIL_PATTERNS.some((pattern) =>
    pattern.test(text)
  );

  if (decision.mode !== 'basic_chat' && words <= 32) return true;
  if (broad && words <= 48) return true;
  if (broad && !hasSpecificDetail && decision.confidence < 0.9) return true;
  return false;
}

function normalizeClarificationDraft(input: {
  draft: ClarificationDraft;
  originalPrompt: string;
  idFactory: () => string;
}): BrunoClarificationCard {
  const cardId = `clarify-${input.idFactory()}`;
  const questions = input.draft.questions.slice(0, 4).map((question, qIndex) => ({
    id: `q${qIndex + 1}`,
    question: question.question,
    options: question.options.slice(0, 4).map((option, optionIndex) => ({
      id: `q${qIndex + 1}-o${optionIndex + 1}`,
      label: option.label,
      ...(option.description ? { description: option.description } : {}),
    })),
    allowOther: true as const,
  }));

  return brunoClarificationCardSchema.parse({
    type: 'bruno_clarification_card',
    id: cardId,
    intro: input.draft.intro,
    originalPrompt: input.originalPrompt,
    questions,
  });
}

function readTokenUsage(value: unknown): TokenUsage {
  if (!value || typeof value !== 'object') return {};
  const record = value as Record<string, unknown>;
  const inputTokens =
    typeof record.inputTokens === 'number'
      ? record.inputTokens
      : typeof record.promptTokens === 'number'
        ? record.promptTokens
        : undefined;
  const outputTokens =
    typeof record.outputTokens === 'number'
      ? record.outputTokens
      : typeof record.completionTokens === 'number'
        ? record.completionTokens
        : undefined;
  return { inputTokens, outputTokens };
}

async function defaultGenerateClarification({
  message,
  routeMode,
  userName,
  pageLabel,
  localTime,
  timeZone,
}: GenerateClarificationInput): Promise<{
  draft: ClarificationDraft;
  usage: TokenUsage;
}> {
  // AI SDK + nested Zod schemas can exceed TS recursion limits during inference.
  const generateClarificationObject = generateObject as (options: {
    model: ReturnType<typeof openai>;
    schema: z.ZodTypeAny;
    prompt: string;
  }) => Promise<{ object: unknown; usage?: unknown; totalUsage?: unknown }>;

  const result = await generateClarificationObject({
    model: openai(BRUNO_MODELS.STANDARD),
    schema: generatedClarificationSchema,
    prompt: `
You are Bruno inside Planevo. The user gave a broad or underspecified request.

Create 2-4 high-impact clarifying questions before Bruno gives the final answer.
Each question must have 2-4 concise multiple-choice options and must also allow a freeform Other answer in the UI.

User: ${userName || 'User'}
Page: ${pageLabel || 'Unknown'}
Local time: ${localTime || 'Unknown'} (${timeZone || 'Unknown'})
Detected Bruno mode: ${routeMode}

Original request:
${message}

Rules:
- Ask only what materially changes the final answer.
- Make the options concrete and easy to tap.
- Do not ask for information already present in the request.
- Keep the intro brief and in Bruno's calm, useful voice.
- Do not answer the request yet.
`,
  });

  return {
    draft: generatedClarificationSchema.parse(result.object),
    usage: readTokenUsage(
      (result as unknown as { usage?: unknown; totalUsage?: unknown }).usage ??
        (result as unknown as { totalUsage?: unknown }).totalUsage
    ),
  };
}

function fallbackClarificationDraft({
  routeMode,
}: GenerateClarificationInput): ClarificationDraft {
  const sharedOpening = {
    intro: 'A couple quick questions first so I can make this actually useful.',
    questions: [
      {
        question: 'What outcome would make this response feel successful?',
        options: [
          { label: 'A clear step-by-step plan' },
          { label: 'Help choosing what matters first' },
          { label: 'A polished draft or answer' },
          { label: 'A quick explanation' },
        ],
      },
      {
        question: 'How much detail do you want right now?',
        options: [
          { label: 'Short and direct' },
          { label: 'Detailed but still practical' },
          { label: 'Break it into phases' },
          { label: 'Give me options to choose from' },
        ],
      },
    ],
  } satisfies ClarificationDraft;

  if (
    routeMode === 'daily_planning' ||
    routeMode === 'schedule_repair' ||
    routeMode === 'deadline_rescue' ||
    routeMode === 'task_management'
  ) {
    return {
      intro: "Let me narrow this before I build the plan.",
      questions: [
        {
          question: 'What should Bruno optimize for first?',
          options: [
            { label: 'Hit the most urgent deadline' },
            { label: 'Protect my energy' },
            { label: 'Make steady progress' },
            { label: 'Reduce overwhelm fast' },
          ],
        },
        {
          question: 'What kind of plan would help most?',
          options: [
            { label: 'Time-blocked schedule' },
            { label: 'Prioritized task list' },
            { label: 'Recovery plan for being behind' },
            { label: 'Simple next 3 actions' },
          ],
        },
        {
          question: 'How much effort do you have available?',
          options: [
            { label: 'Low effort, keep it light' },
            { label: 'Medium effort, focused blocks' },
            { label: 'High effort, deep work' },
            { label: 'Not sure yet' },
          ],
        },
      ],
    };
  }

  if (routeMode === 'academic_tutoring' || routeMode === 'notes') {
    return {
      intro: 'A little context first so I can tune the study help.',
      questions: [
        {
          question: 'What kind of study help do you want?',
          options: [
            { label: 'Explain the concept' },
            { label: 'Quiz me' },
            { label: 'Make study notes' },
            { label: 'Help with an assignment' },
          ],
        },
        {
          question: 'What level should I aim for?',
          options: [
            { label: 'Beginner-friendly' },
            { label: 'Class-ready detail' },
            { label: 'Exam prep depth' },
            { label: 'Just the key points' },
          ],
        },
      ],
    };
  }

  if (routeMode === 'document_writing') {
    return {
      intro: 'A little context first so I can write the document in the right shape.',
      questions: [
        {
          question: 'What should Bruno produce?',
          options: [
            { label: 'A full draft' },
            { label: 'An outline first' },
            { label: 'A stronger revision' },
            { label: 'A short section' },
          ],
        },
        {
          question: 'What voice should it use?',
          options: [
            { label: 'Clear and student-like' },
            { label: 'Formal academic' },
            { label: 'Warm and personal' },
            { label: 'Direct and concise' },
          ],
        },
      ],
    };
  }

  if (routeMode === 'project_breakdown' || routeMode === 'coding_help') {
    return {
      intro: 'Before I break this down, I need the shape of the outcome.',
      questions: [
        {
          question: 'What stage are you in?',
          options: [
            { label: 'Starting from scratch' },
            { label: 'Stuck on a specific part' },
            { label: 'Need to improve what exists' },
            { label: 'Need a final checklist' },
          ],
        },
        {
          question: 'What should the response focus on?',
          options: [
            { label: 'Concrete next steps' },
            { label: 'Architecture or structure' },
            { label: 'Risks and tradeoffs' },
            { label: 'A finished draft' },
          ],
        },
      ],
    };
  }

  if (routeMode === 'emotional_recovery') {
    return {
      intro: 'I can help better if I know what kind of support you need first.',
      questions: [
        {
          question: 'What would help most right now?',
          options: [
            { label: 'Calm me down and simplify' },
            { label: 'Pick one tiny next step' },
            { label: 'Rebuild the rest of my day' },
            { label: 'Help me think clearly' },
          ],
        },
        {
          question: 'How much capacity do you have?',
          options: [
            { label: 'Almost none' },
            { label: 'A little' },
            { label: 'Enough for one focused block' },
            { label: 'I can push today' },
          ],
        },
      ],
    };
  }

  return sharedOpening;
}

export async function generateBrunoClarificationCard(
  input: GenerateClarificationInput,
  dependencies: GenerateClarificationDependencies = {}
) {
  const idFactory = dependencies.idFactory ?? crypto.randomUUID;
  let generated: {
    draft: ClarificationDraft;
    usage?: TokenUsage;
  };

  try {
    generated = await (dependencies.generate ?? defaultGenerateClarification)(
      input
    );
  } catch (error) {
    dependencies.onGenerationError?.(error);
    generated = {
      draft: fallbackClarificationDraft(input),
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  return {
    card: normalizeClarificationDraft({
      draft: generated.draft,
      originalPrompt: input.message,
      idFactory,
    }),
    usage: generated.usage ?? {},
    model: BRUNO_MODELS.STANDARD,
  };
}

export function buildClarifiedUserText(
  response: BrunoClarificationResponse
): string {
  const parsed = brunoClarificationResponseSchema.parse(response);
  const answerLines = parsed.answers.map((answer) => {
    if (answer.source === 'skip') {
      return `- ${answer.question}: Answer with reasonable assumptions.`;
    }
    return `- ${answer.question}: ${answer.answer}`;
  });

  return [
    'Original request:',
    parsed.originalPrompt,
    '',
    'Clarifying context from the user:',
    answerLines.join('\n'),
    '',
    'Use this context to answer the original request. If any answer says to use assumptions, state the assumption briefly before acting on it.',
  ].join('\n');
}

export function applyClarificationResponseToMessages<T extends ChatMessage>(
  messages: T[],
  clarificationResponse?: BrunoClarificationResponse | null
): T[] {
  if (!clarificationResponse) return messages;
  const clarifiedText = buildClarifiedUserText(clarificationResponse);
  const lastUserIndex = [...messages]
    .reverse()
    .findIndex((message) => message.role === 'user');
  if (lastUserIndex === -1) return messages;

  const index = messages.length - 1 - lastUserIndex;
  return messages.map((message, messageIndex) => {
    if (messageIndex !== index) return message;
    return {
      ...message,
      content: clarifiedText,
      parts: [{ type: 'text', text: clarifiedText }],
    };
  });
}

export function isClarificationSkip(
  response: BrunoClarificationResponse
): boolean {
  return response.answers.every((answer) => answer.source === 'skip');
}
