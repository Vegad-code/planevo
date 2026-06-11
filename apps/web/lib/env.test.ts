import { describe, expect, it } from 'vitest';
import { readRequiredEnv } from './env';

describe('readRequiredEnv', () => {
  it('returns a configured variable', () => {
    expect(readRequiredEnv({ FOO: 'bar' }, 'FOO')).toBe('bar');
  });

  it('throws for a missing variable', () => {
    expect(() => readRequiredEnv({}, 'FOO')).toThrow('Missing required environment variable: FOO');
  });

  it('throws for an empty variable', () => {
    expect(() => readRequiredEnv({ FOO: '   ' }, 'FOO')).toThrow('Missing required environment variable: FOO');
  });
});
