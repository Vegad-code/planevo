import { z } from 'zod';

const moderationResponseSchema = z.object({
  results: z
    .array(
      z.object({
        flagged: z.boolean(),
        categories: z.record(z.boolean()),
      })
    )
    .min(1),
});

export type BrunoModerationResult =
  | { status: 'clear'; categories: string[] }
  | { status: 'unsafe'; categories: string[] };

export async function moderateBrunoMessage(
  message: string,
  options: {
    apiKey?: string;
    fetcher?: typeof fetch;
  } = {}
): Promise<BrunoModerationResult> {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for Bruno moderation');
  }

  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'omni-moderation-latest',
      input: message,
    }),
  });

  if (!response.ok) {
    throw new Error(`Bruno moderation failed with status ${response.status}`);
  }

  const result = moderationResponseSchema.parse(await response.json()).results[0];
  const categories = Object.entries(result.categories)
    .filter(([, flagged]) => flagged)
    .map(([category]) => category);

  return result.flagged
    ? { status: 'unsafe', categories }
    : { status: 'clear', categories: [] };
}
