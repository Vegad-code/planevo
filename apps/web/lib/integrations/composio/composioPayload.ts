/**
 * Normalizes Composio tool payloads. Many tools return JSON in a `data` string.
 */
export function parseComposioPayload(
  data: Record<string, unknown>
): Record<string, unknown> | Record<string, unknown>[] {
  if (typeof data.data === 'string') {
    try {
      const parsed = JSON.parse(data.data) as unknown;
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // fall through to the raw object
    }
  }
  return data;
}

/**
 * Pulls record arrays out of varied Composio tool payloads.
 */
export function extractComposioRecords(
  data: Record<string, unknown>,
  candidateKeys: string[]
): Record<string, unknown>[] {
  const parsed = parseComposioPayload(data);
  if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];

  const root = parsed as Record<string, unknown>;

  const messages = root.messages;
  if (messages && typeof messages === 'object' && !Array.isArray(messages)) {
    const matches = (messages as Record<string, unknown>).matches;
    if (Array.isArray(matches)) return matches as Record<string, unknown>[];
  }

  for (const key of candidateKeys) {
    const value = root[key];
    if (Array.isArray(value)) return value as Record<string, unknown>[];
    if (value && typeof value === 'object') {
      const nested = extractComposioRecords(
        value as Record<string, unknown>,
        candidateKeys
      );
      if (nested.length > 0) return nested;
    }
  }

  return [];
}
