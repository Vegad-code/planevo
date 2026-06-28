type RuntimeMessage = {
  role?: unknown;
  content?: unknown;
  parts?: unknown;
};

type RuntimeEnv = Record<string, string | undefined>;

function isTextPart(value: unknown): value is { type: 'text'; text: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'text' &&
    'text' in value &&
    typeof value.text === 'string'
  );
}

export function extractLastUserMessage(messages: RuntimeMessage[]) {
  const userMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'user');

  if (!userMessage) return '';
  if (typeof userMessage.content === 'string') return userMessage.content.trim();

  if (Array.isArray(userMessage.parts)) {
    return userMessage.parts
      .filter(isTextPart)
      .map((part) => part.text)
      .join('\n')
      .trim();
  }

  if (Array.isArray(userMessage.content)) {
    return userMessage.content
      .filter(isTextPart)
      .map((part) => part.text)
      .join('\n')
      .trim();
  }

  return '';
}

function enabled(value: string | undefined) {
  return value?.toLowerCase() === 'true';
}

export function getBrunoRoutingFlags(
  env: RuntimeEnv = process.env,
  userId?: string
) {
  const internalUsers = new Set(
    (env.BRUNO_ROUTING_INTERNAL_USER_IDS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );

  return {
    routingV2Enabled:
      enabled(env.BRUNO_ROUTING_V2_ENABLED) ||
      (userId ? internalUsers.has(userId) : false),
    llmRouterEnabled: enabled(env.BRUNO_LLM_ROUTER_ENABLED),
    upgradeCardsEnabled: enabled(env.BRUNO_UPGRADE_CARDS_ENABLED),
    deepCreditsEnabled: enabled(env.BRUNO_DEEP_CREDITS_ENABLED),
    clarificationCardsEnabled:
      env.BRUNO_CLARIFICATION_CARDS_ENABLED?.toLowerCase() !== 'false',
  };
}

export function getModelCallSettings(model: string, temperature: number) {
  return model.startsWith('gpt-5') ? {} : { temperature };
}
