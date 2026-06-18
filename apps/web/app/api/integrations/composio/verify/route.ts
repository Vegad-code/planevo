import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { computeIsPro } from '@/lib/integrations/summary';
import { getActiveProProviders } from '@/lib/integrations/composio/client';
import { verifyComposioProviderAccess } from '@/lib/integrations/composio/syncEngine';
import type { ProIntegrationProvider } from '@/lib/integrations/types';

const PRO_PROVIDERS = new Set<string>(['notion', 'slack', 'linear']);

function parseProvider(value: string | null): ProIntegrationProvider | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  return PRO_PROVIDERS.has(lower) ? (lower as ProIntegrationProvider) : null;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAllowedOriginOrBearer(request)) {
      return NextResponse.json({ error: 'Forbidden: invalid origin' }, { status: 403 });
    }

    const { user, error } = await getAuthenticatedUser(request);
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('plan_type')
      .eq('id', user.id)
      .single();

    if (!computeIsPro(profile?.plan_type, user.email)) {
      return NextResponse.json({ error: 'Pro plan required.' }, { status: 403 });
    }

    const provider = parseProvider(new URL(request.url).searchParams.get('provider'));
    if (!provider) {
      return NextResponse.json({ error: 'Missing or invalid provider' }, { status: 400 });
    }

    const active = await getActiveProProviders(user.id);
    if (!active.includes(provider)) {
      return NextResponse.json(
        { ok: false, error: `${provider} is not connected` },
        { status: 400 }
      );
    }

    const verification = await verifyComposioProviderAccess(user.id, provider);
    return NextResponse.json({
      provider,
      ...verification,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Verification failed' },
      { status: 500 }
    );
  }
}
