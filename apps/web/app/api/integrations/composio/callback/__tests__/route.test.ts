import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/integrations/composio/callback/route';

describe('composio callback route', () => {
  it('posts oauth_result back to the opener and reports success', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/integrations/composio/callback?provider=notion&status=success'
    );
    const response = await GET(request);
    const html = await response.text();

    expect(html).toContain('oauth_result');
    expect(html).toContain('provider: "notion"');
    expect(html).toContain('error: null');
    expect(html).toContain('http://localhost:3000');
  });

  it('surfaces oauth failures to the opener', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/integrations/composio/callback?provider=slack&status=failed&error=access_denied'
    );
    const response = await GET(request);
    const html = await response.text();

    expect(html).toContain('provider: "slack"');
    expect(html).toContain('access_denied');
  });
});
