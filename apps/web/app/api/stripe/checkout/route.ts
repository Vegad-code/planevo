import { NextRequest, NextResponse } from 'next/server';
import { stripe, PRICE_IDS } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

type CheckoutBody = {
  interval?: 'monthly' | 'annual';
  source?: string;
  returnPath?: string;
};

type BillingProfile = {
  email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  trial_end: string | null;
};

function sanitizeReturnPath(returnPath: unknown) {
  if (typeof returnPath !== 'string' || !returnPath.startsWith('/') || returnPath.startsWith('//')) {
    return '/dashboard/settings/membership';
  }
  return returnPath;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as CheckoutBody;
    const interval = body.interval === 'annual' ? 'annual' : 'monthly';
    const returnPath = sanitizeReturnPath(body.returnPath);
    let priceId = interval === 'annual' ? PRICE_IDS.ANNUAL : PRICE_IDS.MONTHLY;

    if (interval === 'monthly' && user.email?.toLowerCase().endsWith('.edu')) {
      priceId = PRICE_IDS.STUDENT;
    }

    if (!priceId) {
      console.error(`[Stripe Checkout] Missing Stripe Price ID for interval: ${interval}`);
      return NextResponse.json({ error: 'Server configuration error: Missing Stripe Price ID' }, { status: 500 });
    }

    const { data } = await supabase
      .from('users')
      .select('email, stripe_customer_id, stripe_subscription_id, subscription_status, trial_end')
      .eq('id', user.id)
      .single();

    const profile = data as BillingProfile | null;
    let customerId = profile?.stripe_customer_id;

    // Create Stripe customer if none exists
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || profile?.email || undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID immediately so it's available for the webhook
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const activeStatuses = new Set(['active', 'trialing', 'past_due', 'incomplete']);
    if (profile?.stripe_subscription_id && profile.subscription_status && activeStatuses.has(profile.subscription_status)) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${req.nextUrl.origin}/dashboard/settings/membership`,
      });

      return NextResponse.json({ url: portalSession.url });
    }

    const hasUsedTrial = Boolean(profile?.trial_end);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_collection: 'always', // Card required for trial
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        ...(hasUsedTrial ? {} : { trial_period_days: 14 }),
        metadata: {
          supabase_user_id: user.id,
          source: body.source || 'unknown',
        },
      },
      allow_promotion_codes: true,
      success_url: `${req.nextUrl.origin}${returnPath}?checkout=success`,
      cancel_url: `${req.nextUrl.origin}${returnPath}?checkout=canceled`,
      metadata: {
        supabase_user_id: user.id,
        source: body.source || 'unknown',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[Stripe Checkout] Error:', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
