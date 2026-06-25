import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

function createRequest(pathname: string) {
  return new NextRequest(`http://localhost:3000${pathname}`);
}

describe('updateSession public routes', () => {
  it('allows unauthenticated access to reset-password', async () => {
    const response = await updateSession(createRequest('/reset-password'));
    expect(response.status).not.toBe(307);
    expect(response.headers.get('location')).toBeNull();
  });

  it('allows unauthenticated access to legal pages', async () => {
    for (const path of ['/privacy', '/terms', '/cookies']) {
      const response = await updateSession(createRequest(path));
      expect(response.status).not.toBe(307);
      expect(response.headers.get('location')).toBeNull();
    }
  });

  it('redirects unauthenticated dashboard access to login', async () => {
    const response = await updateSession(createRequest('/dashboard'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
  });
});
