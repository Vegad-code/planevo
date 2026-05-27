import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe, subscriptionStatusToPlanType } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { posthogServer } from '@/lib/posthog-server';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

// Disable body parsing — Stripe needs the raw body for signature verification
export const runtime = 'nodejs';

async function syncSubscriptionToDatabase(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.supabase_user_id;
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  if (!userId) {
    console.error('[Stripe Webhook] Missing supabase_user_id in subscription metadata');
    // Fallback: look up user by stripe_customer_id
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (!user) {
      console.error('[Stripe Webhook] No user found for customer:', customerId);
      return;
    }

    await updateUser(user.id, subscription, customerId);
    return;
  }

  await updateUser(userId, subscription, customerId);
}

async function updateUser(
  userId: string,
  subscription: Stripe.Subscription,
  customerId: string
) {
  const priceId = subscription.items.data[0]?.price?.id;
  const planType = subscriptionStatusToPlanType(subscription.status, priceId);

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      plan_type: planType,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
    })
    .eq('id', userId);

  if (error) {
    console.error('[Stripe Webhook] DB update failed:', error);
  } else {
    console.log(`[Stripe Webhook] User ${userId} → plan_type=${planType}, status=${subscription.status}`);

    // Track subscription activation in PostHog
    if (['active', 'trialing'].includes(subscription.status)) {
      posthogServer.capture({
        distinctId: userId,
        event: 'subscription_active',
        properties: {
          plan_type: planType,
          status: subscription.status,
          stripe_subscription_id: subscription.id,
        },
      });
    }
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe Webhook] Signature verification failed:', message);
    return NextResponse.json({ error: `Webhook signature failed: ${message}` }, { status: 400 });
  }

  try {
    // Idempotency check: insert event into stripe_webhook_events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabaseAdmin as any)
      .from('stripe_webhook_events')
      .insert({ id: event.id, event_type: event.type });

    if (insertError) {
      if (insertError.code === '23505') { // Unique violation
        console.log(`[Stripe Webhook] Event ${event.id} already processed. Skipping.`);
        return NextResponse.json({ received: true });
      }
      console.error('[Stripe Webhook] Error logging event for idempotency:', insertError);
      // We proceed even if logging fails, but it could also be a 500 error.
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Link the Stripe customer to the Supabase user if not already linked
        if (session.subscription && session.metadata?.supabase_user_id) {
          const subscriptionId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscriptionToDatabase(subscription);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionToDatabase(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;

        // Find user by customer ID and reset to free
        const { error } = await supabaseAdmin
          .from('users')
          .update({
            plan_type: 'canceled',
            subscription_status: 'canceled',
            stripe_subscription_id: null,
          })
          .eq('stripe_customer_id', customerId);

        if (error) {
          console.error('[Stripe Webhook] Cancellation DB update failed:', error);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id;
          
        if (customerId) {
          console.log(`[Stripe Webhook] Payment failed for customer ${customerId}. Downgrading to free/canceled.`);
          // Downgrade user immediately upon payment failure to restrict access
          const { error } = await supabaseAdmin
            .from('users')
            .update({
              plan_type: 'canceled',
              subscription_status: 'past_due' // Mark as past_due
            })
            .eq('stripe_customer_id', customerId);

          if (error) {
            console.error('[Stripe Webhook] Payment failed DB update failed:', error);
          }
        }
        break;
      }

      default:
        // Unhandled event type — log but don't fail
        console.log(`[Stripe Webhook] Unhandled event: ${event.type}`);
    }
  } catch (err) {
    console.error('[Stripe Webhook] Event processing error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  // Always return 200 to acknbearedge receipt — even for unhandled events
  return NextResponse.json({ received: true });
}
