export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
};

type ModelPricing = {
  inputPerMillion: number;
  outputPerMillion: number;
};

export const MODEL_PRICING_USD: Record<string, ModelPricing> = {
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  'gpt-5.4-nano': { inputPerMillion: 0.2, outputPerMillion: 1.25 },
  'gpt-5.4-mini': { inputPerMillion: 0.75, outputPerMillion: 4.5 },
  'gpt-5.4': { inputPerMillion: 2.5, outputPerMillion: 15 },
  'gpt-5.5': { inputPerMillion: 5, outputPerMillion: 30 },
};

function resolvePricing(model: string): ModelPricing | null {
  const exact = MODEL_PRICING_USD[model];
  if (exact) return exact;
  // Dated snapshots (e.g. gpt-5.4-mini-2026-03-17) share base-model pricing;
  // prefer the longest matching prefix so gpt-5.4-mini wins over gpt-5.4.
  let best: ModelPricing | null = null;
  let bestLength = 0;
  for (const [key, pricing] of Object.entries(MODEL_PRICING_USD)) {
    if (model.startsWith(key) && key.length > bestLength) {
      best = pricing;
      bestLength = key.length;
    }
  }
  return best;
}

export function estimateModelCostCents(
  model: string,
  usage: TokenUsage
): number | null {
  const pricing = resolvePricing(model);
  if (!pricing) return null;

  const inputCost =
    (usage.inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost =
    (usage.outputTokens / 1_000_000) * pricing.outputPerMillion;

  return (inputCost + outputCost) * 100;
}
