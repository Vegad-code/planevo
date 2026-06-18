import { describe, expect, it } from 'vitest';
import {
  COMPOSIO_TOOLKIT_VERSIONS,
  getComposioClientOptions,
} from '../config';

describe('composio config', () => {
  it('pins toolkit versions for manual tool execution', () => {
    expect(COMPOSIO_TOOLKIT_VERSIONS).toMatchObject({
      notion: '20260512_00',
      slack: '20260512_00',
      linear: '20260512_00',
    });
  });

  it('passes toolkit versions into the Composio client', () => {
    expect(getComposioClientOptions('test-key')).toEqual({
      apiKey: 'test-key',
      toolkitVersions: COMPOSIO_TOOLKIT_VERSIONS,
    });
  });
});
