import { describe, expect, it, vi } from 'vitest';
import {
  applyClarificationResponseToMessages,
  brunoClarificationCardSchema,
  brunoClarificationResponseSchema,
  buildClarifiedUserText,
  generateBrunoClarificationCard,
  shouldRequestClarification,
} from '@/lib/bruno/clarification';
import type { BrunoRouteDecision } from '@/lib/bruno/types';

function decision(
  mode: BrunoRouteDecision['mode'],
  confidence = 0.82
): BrunoRouteDecision {
  return {
    mode,
    confidence,
    needsCalendarContext: false,
    needsTaskContext: false,
    needsCanvasContext: false,
    estimatedOutputSize: 'medium',
    upgradeMoment: false,
    rationale: 'test',
  };
}

const clarificationResponse = {
  cardId: 'clarify-1',
  originalPrompt: 'Plan my afternoon',
  answers: [
    {
      questionId: 'q1',
      question: 'What matters most?',
      answer: 'Finish homework',
      source: 'option' as const,
    },
  ],
};

describe('Bruno clarification schemas', () => {
  it('validates the streamed card shape and response shape', () => {
    expect(() =>
      brunoClarificationCardSchema.parse({
        type: 'bruno_clarification_card',
        id: 'clarify-1',
        intro: 'A couple quick questions first.',
        originalPrompt: 'Plan my afternoon',
        questions: [
          {
            id: 'q1',
            question: 'What outcome would make this feel successful?',
            options: [
              { id: 'q1-o1', label: 'Finish homework' },
              { id: 'q1-o2', label: 'Recover energy' },
            ],
            allowOther: true,
          },
        ],
      })
    ).not.toThrow();

    expect(brunoClarificationResponseSchema.parse(clarificationResponse)).toEqual(
      clarificationResponse
    );
  });
});

describe('shouldRequestClarification', () => {
  it.each([
    ['hi', decision('basic_chat')],
    ['continue', decision('daily_planning')],
    ['looks good', decision('project_breakdown')],
    ['Add a task called study biology', decision('app_action')],
    ['How many Deep Bruno requests do I have?', decision('account_or_billing')],
    ['What is mitochondria?', decision('academic_tutoring')],
  ])('does not ask for guarded prompt: %s', (message, routeDecision) => {
    expect(
      shouldRequestClarification({ message, decision: routeDecision })
    ).toBe(false);
  });

  it.each([
    ['Plan my afternoon', decision('daily_planning')],
    ['Help me plan my week', decision('basic_chat', 0.5)],
    ["I'm overwhelmed, help me prioritize", decision('emotional_recovery')],
    ['Plan my day', decision('daily_planning')],
    ['Help me study for biology', decision('academic_tutoring')],
    ['Break down this project', decision('project_breakdown')],
    ['I got behind, fix my day', decision('schedule_repair')],
    ['Can you help me organize this?', decision('basic_chat', 0.62)],
  ])('asks often for broad prompt: %s', (message, routeDecision) => {
    expect(
      shouldRequestClarification({ message, decision: routeDecision })
    ).toBe(true);
  });

  it('respects the feature flag and prior clarification response', () => {
    expect(
      shouldRequestClarification({
        message: 'Plan my afternoon',
        decision: decision('daily_planning'),
        env: { BRUNO_CLARIFICATION_CARDS_ENABLED: 'false' },
      })
    ).toBe(false);

    expect(
      shouldRequestClarification({
        message: 'Plan my afternoon',
        decision: decision('daily_planning'),
        clarificationResponse,
      })
    ).toBe(false);
  });
});

describe('generateBrunoClarificationCard', () => {
  it('falls back to deterministic questions if structured generation fails', async () => {
    const onGenerationError = vi.fn();

    const result = await generateBrunoClarificationCard(
      {
        message: 'Help me plan my week',
        routeMode: 'daily_planning',
      },
      {
        idFactory: () => 'test-id',
        generate: async () => {
          throw new Error('model unavailable');
        },
        onGenerationError,
      }
    );

    expect(onGenerationError).toHaveBeenCalledOnce();
    expect(result.card).toMatchObject({
      id: 'clarify-test-id',
      originalPrompt: 'Help me plan my week',
      type: 'bruno_clarification_card',
    });
    expect(result.card.questions.length).toBeGreaterThanOrEqual(2);
    expect(result.card.questions[0].allowOther).toBe(true);
  });
});

describe('buildClarifiedUserText', () => {
  it('combines the original prompt with answers for final generation', () => {
    expect(buildClarifiedUserText(clarificationResponse)).toContain(
      'Original request:\nPlan my afternoon'
    );
    expect(buildClarifiedUserText(clarificationResponse)).toContain(
      '- What matters most?: Finish homework'
    );
  });

  it('replaces the latest user message with clarified text', () => {
    const messages = applyClarificationResponseToMessages(
      [
        { role: 'assistant' as const, content: 'A couple questions?' },
        { role: 'user' as const, content: 'Here are answers' },
      ],
      clarificationResponse
    );

    expect(messages[1].content).toContain('Original request:');
    expect(
      (messages[1] as { parts?: Array<{ type: string; text: string }> }).parts
    ).toEqual([
      {
        type: 'text',
        text: expect.stringContaining('Finish homework'),
      },
    ]);
  });
});
