export type BrunoExecuteActionClientResult = {
  success: boolean;
  error?: string;
  [key: string]: unknown;
};

export async function readBrunoExecuteActionResponse(
  response: Pick<Response, 'ok' | 'status' | 'statusText' | 'text'>
): Promise<BrunoExecuteActionClientResult> {
  let raw = '';
  try {
    raw = await response.text();
  } catch {
    return {
      success: false,
      error: response.ok
        ? 'Bruno returned an unreadable action response.'
        : `Could not execute action (${response.status}).`,
    };
  }

  if (!raw.trim()) {
    return {
      success: false,
      error: response.ok
        ? 'Bruno returned an empty action response.'
        : response.statusText || `Could not execute action (${response.status}).`,
    };
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as BrunoExecuteActionClientResult;
    }
  } catch {
    return {
      success: false,
      error: response.ok
        ? 'Bruno returned an invalid action response.'
        : response.statusText || `Could not execute action (${response.status}).`,
    };
  }

  return {
    success: false,
    error: 'Bruno returned an invalid action response.',
  };
}
