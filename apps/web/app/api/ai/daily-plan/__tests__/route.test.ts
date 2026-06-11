import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
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
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ data: [] })
              })
            })
          }),
          is: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue({ data: [] })
            })
          }),
          single: vi.fn().mockResolvedValue({ data: null })
        })
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ error: null })
              })
            })
          })
        })
      }),
      insert: vi.fn().mockResolvedValue({ error: null })
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
  checkRateLimitForUser: vi.fn().mockResolvedValue({ allowed: true })
}));

vi.mock('@/lib/ai/orchestrator', () => ({
  getBrunoMasterContext: vi.fn().mockResolvedValue({
    tasks: [{ id: 'task-1', title: 'Test task', estimated_minutes: 30 }],
    memory: {},
    calendarEvents: [],
    memoryContext: 'Test memory context'
  })
}));

describe('Daily Plan API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                schedule: [
                  {
                    id: 'task-1',
                    title: 'Test task',
                    suggested_start: new Date(Date.now() + 3600000).toISOString(),
                    suggested_end: new Date(Date.now() + 7200000).toISOString()
                  }
                ],
                message: 'Here is your plan'
              })
            }
          }
        ]
      })
    });
    process.env.OPENAI_API_KEY = 'test-key';
  });

  it('generates a daily plan successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/ai/daily-plan', {
      method: 'POST',
      body: JSON.stringify({ energyLevel: 'medium' })
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.schedule).toBeDefined();
    expect(data.schedule.length).toBe(1);
    expect(data.schedule[0].title).toBe('Test task');
  });

  it('handles OpenAI API failures gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    const req = new NextRequest('http://localhost:3000/api/ai/daily-plan', {
      method: 'POST',
      body: JSON.stringify({ energyLevel: 'medium' })
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('AI API failure');
  });
});
