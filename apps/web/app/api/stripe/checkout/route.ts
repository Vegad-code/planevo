import { NextRequest, NextResponse } from 'next/server';
import { stripe, PRICE_IDS } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const interval: 'monthly' | 'annual' = body.interval || 'monthly';
    let priceId = interval === 'annual' ? PRICE_IDS.ANNUAL : PRICE_IDS.MONTHLY;

    if (interval === 'monthly' && user.email?.toLowerCase().endsWith('.edu')) {
      priceId = PRICE_IDS.STUDENT;
    }

    if (!priceId) {
      console.error(`[Stripe Checkout] Missing Stripe Price ID for interval: ${interval}`);
      return NextResponse.json({ error: 'Server configuration error: Missing Stripe Price ID' }, { status: 500 });
    }

    // Check if user already has a Stripe customer ID
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    let customerId = (profile as any)?.stripe_customer_id;

    // Create Stripe customer if none exists
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || (profile as any)?.email || undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID immediately so it's available for the webhook
      await (supabase
        .from('users')
        .update({ stripe_customer_id: customerId } as any) as any)
        .eq('id', user.id);
    }

    // Create Checkout Session with 14-day trial
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
        trial_period_days: 14,
        metadata: {
          supabase_user_id: user.id,
        },
      },
      allow_promotion_codes: true,
      success_url: `${req.nextUrl.origin}/dashboard?checkout=success`,
      cancel_url: `${req.nextUrl.origin}/onboarding?checkout=canceled`,
      metadata: {
        supabase_user_id: user.id,
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
