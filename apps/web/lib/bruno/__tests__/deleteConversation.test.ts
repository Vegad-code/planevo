import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { deleteConversation } from '@/lib/bruno/deleteConversation';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const CONV_ID = '22222222-2222-2222-2222-222222222222';

function chainMock(resolver: () => unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'single', 'update', 'delete'];
  for (const method of methods) {
    chain[method] = vi.fn(() => chain);
  }
  chain.then = undefined;
  Object.defineProperty(chain, 'single', {
    value: vi.fn(resolver),
  });
  Object.defineProperty(chain, 'select', {
    value: vi.fn(() => {
      const selectChain = { ...chain };
      selectChain.select = vi.fn(() => selectChain);
      selectChain.eq = vi.fn(() => selectChain);
      selectChain.delete = vi.fn(() => selectChain);
      selectChain.update = vi.fn(() => selectChain);
      selectChain.then = (onFulfilled: (value: unknown) => unknown) =>
        Promise.resolve(resolver()).then(onFulfilled);
      return selectChain;
    }),
  });
  return chain;
}

describe('deleteConversation', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('returns 404 when conversation is not owned by user', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'chat_conversations') {
        return chainMock(() => Promise.resolve({ data: null, error: { message: 'not found' } }));
      }
      throw new Error(`unexpected table ${table}`);
    });

    const result = await deleteConversation(USER_ID, CONV_ID);
    expect(result).toEqual({
      ok: false,
      status: 404,
      error: 'Conversation not found or unauthorized',
    });
  });

  it('hard-deletes conversation after anonymizing route events', async () => {
    const calls: string[] = [];

    mockFrom.mockImplementation((table: string) => {
      calls.push(table);

      if (table === 'chat_conversations') {
        let step = 0;
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => {
                  step += 1;
                  if (step === 1) {
                    return { data: { id: CONV_ID }, error: null };
                  }
                  return { data: null, error: null };
                }),
              })),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(async () => ({
                  data: [{ id: CONV_ID }],
                  error: null,
                })),
              })),
            })),
          })),
        };
      }

      if (table === 'bruno_route_events') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(async () => ({ error: null })),
            })),
          })),
        };
      }

      throw new Error(`unexpected table ${table}`);
    });

    const result = await deleteConversation(USER_ID, CONV_ID);
    expect(result).toEqual({ ok: true, id: CONV_ID });
    expect(calls).toContain('chat_conversations');
    expect(calls).toContain('bruno_route_events');
  });
});
