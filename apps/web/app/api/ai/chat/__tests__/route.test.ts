import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { checkRateLimitForUser } from '@/lib/auth/rateLimit';

const { handleBrunoChatV2Mock, getBrunoRoutingFlagsMock } = vi.hoisted(
  () => ({
    handleBrunoChatV2Mock: vi.fn(),
    getBrunoRoutingFlagsMock: vi.fn(),
  })
);

vi.mock('@/lib/bruno/handleChatV2', () => ({
  handleBrunoChatV2: handleBrunoChatV2Mock,
}));

vi.mock('@/lib/bruno/runtime', () => ({
  getBrunoRoutingFlags: getBrunoRoutingFlagsMock,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }) }
  })
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { name: 'Test User' } })
          }),
          single: vi.fn().mockResolvedValue({ data: { name: 'Test User' } }),
          maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'Test User' } }),
          is: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue({ data: [] }),
              lt: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [] })
                })
              })
            }),
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [] })
            })
          })
        })
      })
    })
  }
}));

vi.mock('@/lib/auth/origin-guard', () => ({
  isAllowedOriginOrBearer: vi.fn().mockReturnValue(true)
}));

vi.mock('@/lib/auth/get-user', () => ({
  getAuthenticatedUser: vi.fn().mockResolvedValue({
    user: { id: 'test-user', email: 'test@example.com' },
    error: null,
    authMethod: 'cookie'
  })
}));

vi.mock('@/lib/auth/rateLimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  checkRateLimitForUser: vi.fn().mockResolvedValue({
    allowed: true,
    usageLogId: 'usage-1',
  }),
  validateHourlyRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  consumeHourlyRateLimit: vi.fn().mockResolvedValue({ allowed: true })
}));

describe('Chat API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBrunoRoutingFlagsMock.mockReturnValue({
      routingV2Enabled: false,
    });
    handleBrunoChatV2Mock.mockResolvedValue(
      new Response('v2 response', { status: 200 })
    );
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Mock chat response'
            }
          }
        ]
      })
    });
    process.env.OPENAI_API_KEY = 'test-key';
  });

  it('handles chat requests and returns stream', async () => {
    const req = new NextRequest('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello', parts: [{ type: 'text', text: 'Hello' }] }] })
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(checkRateLimitForUser).toHaveBeenCalledWith(
      'test-user',
      'bruno-chat',
      'test@example.com',
      expect.any(String)
    );
    // In Next.js App Router, the AI SDK returns a streaming response.
    // The specifics of reading it depend on the exact implementation, but 200 is a good baseline.
  });

  it('hands internal rollout traffic to the V2 handler', async () => {
    getBrunoRoutingFlagsMock.mockReturnValue({
      routingV2Enabled: true,
    });

    const req = new NextRequest('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        conversationId: '11111111-1111-4111-8111-111111111111',
        messages: [
          {
            role: 'user',
            content: 'Plan my afternoon',
            parts: [{ type: 'text', text: 'Plan my afternoon' }],
          },
        ],
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(handleBrunoChatV2Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: expect.any(String),
        usageLogId: 'usage-1',
        conversationId: '11111111-1111-4111-8111-111111111111',
      })
    );
  });
});
