import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { computeIsPro } from '@/lib/integrations/summary';

export async function requireProComposioUser(request: NextRequest) {
  if (!isAllowedOriginOrBearer(request)) {
    return { error: NextResponse.json({ error: 'Forbidden: invalid origin' }, { status: 403 }) };
  }
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) {
    return { error: NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 }) };
  }
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('plan_type')
    .eq('id', user.id)
    .single();
  if (!computeIsPro(profile?.plan_type, user.email)) {
    return { error: NextResponse.json({ error: 'Pro plan required.' }, { status: 403 }) };
  }
  return { user };
}
