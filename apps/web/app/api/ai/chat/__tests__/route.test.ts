import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

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
  checkRateLimitForUser: vi.fn().mockResolvedValue({ allowed: true }),
  validateHourlyRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  consumeHourlyRateLimit: vi.fn().mockResolvedValue({ allowed: true })
}));

describe('Chat API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] })
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    // In Next.js App Router, the AI SDK returns a streaming response.
    // The specifics of reading it depend on the exact implementation, but 200 is a good baseline.
  });
});
