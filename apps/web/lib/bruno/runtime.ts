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

function enabledByDefault(value: string | undefined) {
  return value?.toLowerCase() !== 'false';
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
    // V2 (persisted proposals + tool loop) and the LLM router are the default
    // paths; env vars remain as explicit kill switches.
    routingV2Enabled:
      enabledByDefault(env.BRUNO_ROUTING_V2_ENABLED) ||
      (userId ? internalUsers.has(userId) : false),
    llmRouterEnabled: enabledByDefault(env.BRUNO_LLM_ROUTER_ENABLED),
    // Native approval loop (Phase B). Requires the client to opt in per
    // request (`agentLoop: true` in the chat body); this env var is the
    // global kill switch.
    agentLoopEnabled: enabledByDefault(env.BRUNO_AGENT_LOOP_ENABLED),
    upgradeCardsEnabled: enabled(env.BRUNO_UPGRADE_CARDS_ENABLED),
    deepCreditsEnabled: enabled(env.BRUNO_DEEP_CREDITS_ENABLED),
    clarificationCardsEnabled:
      env.BRUNO_CLARIFICATION_CARDS_ENABLED?.toLowerCase() !== 'false',
  };
}

export function getModelCallSettings(model: string, temperature: number) {
  return model.startsWith('gpt-5') ? {} : { temperature };
}
