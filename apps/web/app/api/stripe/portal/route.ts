import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAuthenticatedSupabaseClient } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { emptyStrictBodySchema, parseJsonBody } from '@/lib/api/schemas';
import { logSecurityAudit } from '@/lib/security-audit';

type PortalProfile = {
  stripe_customer_id: string | null;
};

export async function POST(req: NextRequest) {
  try {
    if (!isAllowedOriginOrBearer(req)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const auth = await createAuthenticatedSupabaseClient(req);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { supabase, user } = auth;

    const body = await req.json().catch(() => ({}));
    const parsed = parseJsonBody(emptyStrictBodySchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    // Look up the user's Stripe customer ID
    const { data } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    const profile = data as PortalProfile | null;

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No subscription found. Please subscribe first.' },
        { status: 400 }
      );
    }

    // Generate a Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${req.nextUrl.origin}/dashboard/settings/membership`,
    });

    await logSecurityAudit({
      actorUserId: user.id,
      action: 'stripe.portal_open',
      resourceType: 'stripe_customer',
      resourceId: profile.stripe_customer_id,
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[Stripe Portal] Error:', err);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
