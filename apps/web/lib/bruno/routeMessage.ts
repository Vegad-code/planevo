import { z } from 'zod';
import { detectAppAction } from './detectAppAction';
import { detectObviousMode } from './detectObviousMode';
import { BRUNO_MODELS } from './modelPolicy';
import { BRUNO_ROUTER_SYSTEM_PROMPT } from './routerPrompt';
import {
  BRUNO_ROUTE_JSON_SCHEMA,
  brunoRouteSchema,
} from './routerSchema';
import type {
  BrunoRouteDecision,
  BrunoRouteSource,
} from './types';

type Classifier = (message: string) => Promise<BrunoRouteDecision>;

const APP_ACTION_DECISION: BrunoRouteDecision = {
  mode: 'app_action',
  confidence: 0.95,
  needsCalendarContext: false,
  needsTaskContext: true,
  needsCanvasContext: false,
  estimatedOutputSize: 'short',
  upgradeMoment: false,
  rationale: 'obvious app action',
};

const openAIChatCompletionSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string(),
      }),
    })
  ).min(1),
});

export async function classifyBrunoRouteWithOpenAI(
  message: string,
  options: {
    apiKey?: string;
    fetcher?: typeof fetch;
  } = {}
) {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for Bruno routing');
  }

  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: BRUNO_MODELS.ROUTER,
      messages: [
        { role: 'system', content: BRUNO_ROUTER_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Classify this latest user message:\n\n${message}`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'bruno_route_decision',
          strict: true,
          schema: BRUNO_ROUTE_JSON_SCHEMA,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Bruno router failed with status ${response.status}`);
  }

  const completion = openAIChatCompletionSchema.parse(await response.json());
  return brunoRouteSchema.parse(
    JSON.parse(completion.choices[0].message.content)
  );
}

export async function routeBrunoMessage(
  input: { message: string },
  dependencies: { classify?: Classifier } = {}
): Promise<{
  decision: BrunoRouteDecision;
  routeSource: BrunoRouteSource;
  latencyMs: number;
}> {
  const startedAt = performance.now();

  if (detectAppAction(input.message)) {
    return {
      decision: APP_ACTION_DECISION,
      routeSource: 'deterministic',
      latencyMs: Math.round(performance.now() - startedAt),
    };
  }

  const obvious = detectObviousMode(input.message);
  if (obvious && obvious.confidence >= 0.78) {
    return {
      decision: obvious,
      routeSource: 'obvious_mode',
      latencyMs: Math.round(performance.now() - startedAt),
    };
  }

  try {
    const classify =
      dependencies.classify ?? classifyBrunoRouteWithOpenAI;
    const decision = await classify(input.message);
    return {
      decision,
      routeSource: 'llm_router',
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    console.error('[Bruno Router] Falling back to basic chat:', error);
    return {
      decision: {
        mode: 'basic_chat',
        confidence: 0.5,
        needsCalendarContext: false,
        needsTaskContext: false,
        needsCanvasContext: false,
        estimatedOutputSize: 'medium',
        upgradeMoment: false,
        rationale: 'router failure fallback',
      },
      routeSource: 'fallback',
      latencyMs: Math.round(performance.now() - startedAt),
    };
  }
}
