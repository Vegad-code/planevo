import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockList, mockDelete } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('@composio/core', () => ({
  Composio: class MockComposio {
    connectedAccounts = {
      list: mockList,
      delete: mockDelete,
    };
  },
}));

describe('prepareConnectionForLink', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.COMPOSIO_API_KEY = 'test-key';
  });

  it('returns ready when no active connections exist', async () => {
    mockList.mockResolvedValue({ items: [] });
    const { prepareConnectionForLink } = await import('../client');
    await expect(
      prepareConnectionForLink('user-1', 'ac_test')
    ).resolves.toBe('ready');
  });

  it('returns already_connected when one active connection exists', async () => {
    mockList.mockResolvedValue({
      items: [{ id: 'ca_1', status: 'ACTIVE' }],
    });
    const { prepareConnectionForLink } = await import('../client');
    await expect(
      prepareConnectionForLink('user-1', 'ac_test')
    ).resolves.toBe('already_connected');
  });

  it('dedupes multiple active connections and reports already_connected', async () => {
    mockList.mockResolvedValue({
      items: [
        { id: 'ca_old', status: 'ACTIVE', updatedAt: '2026-01-01T00:00:00Z' },
        { id: 'ca_new', status: 'ACTIVE', updatedAt: '2026-06-01T00:00:00Z' },
      ],
    });
    const { prepareConnectionForLink } = await import('../client');
    await expect(
      prepareConnectionForLink('user-1', 'ac_test')
    ).resolves.toBe('already_connected');
    expect(mockDelete).toHaveBeenCalledWith('ca_old');
    expect(mockDelete).not.toHaveBeenCalledWith('ca_new');
  });

  it('deletes active connections in reconnect mode', async () => {
    mockList.mockResolvedValue({
      items: [{ id: 'ca_1', status: 'ACTIVE' }],
    });
    const { prepareConnectionForLink } = await import('../client');
    await expect(
      prepareConnectionForLink('user-1', 'ac_test', 'reconnect')
    ).resolves.toBe('ready');
    expect(mockDelete).toHaveBeenCalledWith('ca_1');
  });
});
