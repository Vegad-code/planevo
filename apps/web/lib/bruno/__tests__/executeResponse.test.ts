import { describe, expect, it, vi } from 'vitest';
import { readBrunoExecuteActionResponse } from '@/lib/bruno/executeResponse';

describe('readBrunoExecuteActionResponse', () => {
  it('returns a structured error for an empty response body', async () => {
    const result = await readBrunoExecuteActionResponse({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: vi.fn().mockResolvedValue(''),
    });

    expect(result).toEqual({
      success: false,
      error: 'Internal Server Error',
    });
  });

  it('returns a structured error for invalid JSON', async () => {
    const result = await readBrunoExecuteActionResponse({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      text: vi.fn().mockResolvedValue('<html>nope</html>'),
    });

    expect(result).toEqual({
      success: false,
      error: 'Bad Gateway',
    });
  });

  it('parses successful JSON responses', async () => {
    const result = await readBrunoExecuteActionResponse({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: vi.fn().mockResolvedValue('{"success":true,"eventId":"event-1"}'),
    });

    expect(result).toEqual({
      success: true,
      eventId: 'event-1',
    });
  });
});
