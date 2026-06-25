export type ResilientFetchOptions = RequestInit & {
  /** Max retry attempts on 429/5xx (default 3). */
  maxRetries?: number;
  /** Never retry POST/PUT/PATCH/DELETE unless explicitly allowed. */
  allowRetryOnMutation?: boolean;
};

type CircuitState = {
  failures: number;
  openedAt: number | null;
};

const circuits = new Map<string, CircuitState>();

const FAILURE_THRESHOLD = 5;
const CIRCUIT_WINDOW_MS = 60_000;
const CIRCUIT_OPEN_MS = 30_000;

function hostKey(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function isCircuitOpen(host: string): boolean {
  const state = circuits.get(host);
  if (!state?.openedAt) return false;
  if (Date.now() - state.openedAt > CIRCUIT_OPEN_MS) {
    state.openedAt = null;
    state.failures = 0;
    return false;
  }
  return true;
}

function recordFailure(host: string) {
  const state = circuits.get(host) ?? { failures: 0, openedAt: null };
  const now = Date.now();
  if (state.openedAt && now - state.openedAt > CIRCUIT_WINDOW_MS) {
    state.failures = 0;
    state.openedAt = null;
  }
  state.failures += 1;
  if (state.failures >= FAILURE_THRESHOLD) {
    state.openedAt = now;
  }
  circuits.set(host, state);
}

function recordSuccess(host: string) {
  circuits.set(host, { failures: 0, openedAt: null });
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

function backoffMs(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 8000);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * fetch with exponential backoff (429/5xx) and per-host in-process circuit breaker.
 * Does not retry ambiguous mutations unless allowRetryOnMutation is set (trade routes: never).
 */
export async function resilientFetch(
  input: string | URL,
  options: ResilientFetchOptions = {}
): Promise<Response> {
  const url = typeof input === 'string' ? input : input.toString();
  const host = hostKey(url);
  const method = (options.method ?? 'GET').toUpperCase();
  const maxRetries = options.maxRetries ?? 3;
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  if (isCircuitOpen(host)) {
    throw new Error(`Circuit open for ${host}`);
  }

  if (isMutation && !options.allowRetryOnMutation) {
    const response = await fetch(url, options);
    if (!response.ok && isRetryableStatus(response.status)) {
      recordFailure(host);
    } else if (response.ok) {
      recordSuccess(host);
    }
    return response;
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        recordSuccess(host);
        return response;
      }
      if (!isRetryableStatus(response.status) || attempt === maxRetries) {
        recordFailure(host);
        return response;
      }
      const retryAfter = response.headers.get('retry-after');
      const waitMs = retryAfter ? Number(retryAfter) * 1000 : backoffMs(attempt);
      await sleep(Number.isFinite(waitMs) ? waitMs : backoffMs(attempt));
    } catch (err) {
      lastError = err;
      recordFailure(host);
      if (attempt === maxRetries) throw err;
      await sleep(backoffMs(attempt));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('resilientFetch failed');
}
