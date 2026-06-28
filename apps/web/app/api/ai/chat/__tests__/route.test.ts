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
  extractLastUserMessage: (messages: Array<{ role?: string; content?: string }>) => {
    const userMessage = [...messages].reverse().find((message) => message.role === 'user');
    return typeof userMessage?.content === 'string' ? userMessage.content : '';
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }) }
  })
}));

vi.mock('@/lib/supabase/admin', () => {
  const createMockQueryBuilder = (resolvedValue: any = { data: [] }) => {
    const builder: any = {
      select: vi.fn().mockImplementation(() => builder),
      eq: vi.fn().mockImplementation(() => builder),
      neq: vi.fn().mockImplementation(() => builder),
      is: vi.fn().mockImplementation(() => builder),
      in: vi.fn().mockImplementation(() => builder),
      order: vi.fn().mockImplementation(() => builder),
      limit: vi.fn().mockImplementation(() => builder),
      gte: vi.fn().mockImplementation(() => builder),
      lte: vi.fn().mockImplementation(() => builder),
      lt: vi.fn().mockImplementation(() => builder),
      gt: vi.fn().mockImplementation(() => builder),
      single: vi.fn().mockImplementation(() => Promise.resolve(resolvedValue)),
      maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(resolvedValue)),
      then: vi.fn().mockImplementation((onfulfilled) => Promise.resolve(resolvedValue).then(onfulfilled)),
    };
    return builder;
  };

  return {
    supabaseAdmin: {
      from: vi.fn().mockImplementation((table) => {
        if (table === 'users') {
          return createMockQueryBuilder({ data: { name: 'Test User' } });
        }
        return createMockQueryBuilder({ data: [] });
      }),
    },
  };
});

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

  it('accepts clarification responses and passes clarified context to V2', async () => {
    getBrunoRoutingFlagsMock.mockReturnValue({
      routingV2Enabled: true,
    });

    const clarificationResponse = {
      cardId: 'clarify-1',
      originalPrompt: 'Plan my afternoon',
      answers: [
        {
          questionId: 'q1',
          question: 'What matters most?',
          answer: 'Finish homework',
          source: 'option',
        },
      ],
    };

    const req = new NextRequest('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        conversationId: '11111111-1111-4111-8111-111111111111',
        clarificationResponse,
        messages: [
          {
            role: 'user',
            content: 'Here is the context Bruno asked for',
            parts: [
              { type: 'text', text: 'Here is the context Bruno asked for' },
            ],
          },
        ],
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(handleBrunoChatV2Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        clarificationResponse,
        messages: [
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Original request:\nPlan my afternoon'),
            parts: [
              {
                type: 'text',
                text: expect.stringContaining('Finish homework'),
              },
            ],
          }),
        ],
      })
    );
  });

  it('short-circuits detector-evasion document requests without model generation', async () => {
    getBrunoRoutingFlagsMock.mockReturnValue({
      routingV2Enabled: true,
    });

    const req = new NextRequest('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content:
              'Make my essay impossible to detect with AI detectors and no watermark',
            parts: [
              {
                type: 'text',
                text: 'Make my essay impossible to detect with AI detectors and no watermark',
              },
            ],
          },
        ],
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-bruno-safety')).toBe('detector_evasion');
    expect(handleBrunoChatV2Mock).not.toHaveBeenCalled();
    expect(checkRateLimitForUser).not.toHaveBeenCalled();
  });
});
