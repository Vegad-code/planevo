import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { extractConnectionSlug } from '../slugs';
import { getOAuthOrigin, resolveComposioCallbackUrl } from '../oauth';

describe('extractConnectionSlug', () => {
  it('reads toolkit.slug first', () => {
    expect(extractConnectionSlug({ toolkit: { slug: 'notion' } })).toBe('notion');
  });

  it('falls back to appName and appUniqueId', () => {
    expect(extractConnectionSlug({ appName: 'slack' })).toBe('slack');
    expect(extractConnectionSlug({ appUniqueId: 'linear' })).toBe('linear');
  });

  it('ignores unsupported toolkits', () => {
    expect(extractConnectionSlug({ toolkit: { slug: 'gmail' } })).toBeNull();
  });
});

describe('oauth helpers', () => {
  it('prefers request origin over configured production URL', () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://planevo.co';

    const request = new NextRequest('http://localhost:3000/api/integrations/composio/connect', {
      headers: { origin: 'http://localhost:3000' },
    });

    expect(getOAuthOrigin(request)).toBe('http://localhost:3000');
    expect(resolveComposioCallbackUrl(request, null)).toBe(
      'http://localhost:3000/api/integrations/composio/callback'
    );

    process.env.NEXT_PUBLIC_APP_URL = previous;
  });

  it('accepts client-provided callback URLs on the same origin', () => {
    const request = new NextRequest('http://localhost:3000/api/integrations/composio/connect', {
      headers: { origin: 'http://localhost:3000' },
    });

    const callback = resolveComposioCallbackUrl(
      request,
      'http://localhost:3000/api/integrations/composio/callback?provider=notion'
    );

    expect(callback).toBe(
      'http://localhost:3000/api/integrations/composio/callback?provider=notion'
    );
  });
});
