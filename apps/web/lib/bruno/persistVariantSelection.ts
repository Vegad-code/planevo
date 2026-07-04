import type { BrunoVariantInfo, HydratedBrunoMessage } from '@/lib/bruno/messageBranches';

const VARIANT_SKELETON_DELAY_MS = 120;

type PersistVariantSelectionInput = {
  conversationId: string;
  turnKey: string;
  variantIndex: number;
};

type PersistVariantSelectionResult = {
  messages: Array<HydratedBrunoMessage & { createdAt: string }>;
  variantInfoByMessageId: Record<string, BrunoVariantInfo>;
};

export async function persistVariantSelection(
  input: PersistVariantSelectionInput
): Promise<PersistVariantSelectionResult> {
  const response = await fetch('/api/ai/chat/select-variant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId: input.conversationId,
      turnKey: input.turnKey,
      variantIndex: input.variantIndex,
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const payload = (await response.json()) as PersistVariantSelectionResult;
  return payload;
}

export function scheduleVariantSkeleton(
  turnKey: string,
  onShow: (turnKey: string) => void
): () => void {
  const timer = window.setTimeout(() => {
    onShow(turnKey);
  }, VARIANT_SKELETON_DELAY_MS);

  return () => {
    window.clearTimeout(timer);
  };
}
