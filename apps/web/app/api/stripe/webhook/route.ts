import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe, subscriptionStatusToPlanType } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { posthogServer } from '@/lib/posthog-server';
import { buildEmailIdempotencyKey, sendSubscriptionReceiptEmail, sendPaymentFailedEmail } from '@/lib/email';
import { canSendNotification, type NotificationPreferences } from '@/lib/notifications/preferences';
import { sendExpoPushNotification } from '@/lib/notifications/expo';
import {
  hasNotificationDelivery,
  recordNotificationDelivery,
} from '@/lib/notifications/delivery';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

type BillingNotificationUser = {
  id: string;
  email: string | null;
  name: string | null;
  expo_push_token: string | null;
  notification_preferences: Partial<NotificationPreferences> | null;
};

type InvoiceLineWithLegacyPrice = Stripe.InvoiceLineItem & {
  price?: { nickname?: string | null } | null;
};

// Disable body parsing — Stripe needs the raw body for signature verification
export const runtime = 'nodejs';

function getSubscriptionTimestamp(subscription: Stripe.Subscription, key: 'current_period_start' | 'current_period_end') {
  return (subscription as Stripe.Subscription & Partial<Record<typeof key, number>>)[key];
}

async function hasProcessedStripeEvent(eventId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from('stripe_webhook_events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function markStripeEventProcessed(event: Stripe.Event) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabaseAdmin as any)
    .from('stripe_webhook_events')
    .insert({ id: event.id, event_type: event.type });

  if (error && error.code !== '23505') {
    throw error;
  }
}

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
      throw new Error(`No user found for Stripe customer ${customerId}`);
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
  const currentPeriodEnd = getSubscriptionTimestamp(subscription, 'current_period_end');

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId ?? null,
      stripe_current_period_end: currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000).toISOString()
        : null,
      subscription_status: subscription.status,
      plan_type: planType,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      onboarding_complete: true,
    })
    .eq('id', userId);

  if (error) {
    console.error('[Stripe Webhook] DB update failed:', error);
    throw error;
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
    if (await hasProcessedStripeEvent(event.id)) {
      console.log(`[Stripe Webhook] Event ${event.id} already processed. Skipping.`);
      return NextResponse.json({ received: true });
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

        // Find user by customer ID and reset to free. Keep stripe_customer_id
        // and trial_end for billing history and trial eligibility checks.
        const { error } = await supabaseAdmin
          .from('users')
          .update({
            plan_type: 'free',
            subscription_status: 'canceled',
            stripe_subscription_id: null,
            stripe_price_id: null,
            stripe_current_period_end: null,
          })
          .eq('stripe_customer_id', customerId);

        if (error) {
          console.error('[Stripe Webhook] Cancellation DB update failed:', error);
          throw error;
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id;

        if (customerId && invoice.amount_paid > 0) {
          const { data: user } = await supabaseAdmin
            .from('users')
            .select('id, email, name, expo_push_token, notification_preferences ( master_toggle, channels, types, quiet_hours )')
            .eq('stripe_customer_id', customerId)
            .single();

          const billingUser = user as BillingNotificationUser | null;
          const dedupeKey = invoice.id || event.id;

          if (
            billingUser?.email &&
            canSendNotification(billingUser.notification_preferences, 'email', 'billing') &&
            !(await hasNotificationDelivery(supabaseAdmin, billingUser.id, 'billing_receipt', 'email', dedupeKey))
          ) {
            const amount = (invoice.amount_paid / 100).toFixed(2);
            const planName = (invoice.lines?.data[0] as InvoiceLineWithLegacyPrice | undefined)?.price?.nickname || 'Planevo Premium';

            await sendSubscriptionReceiptEmail(billingUser.email, billingUser.name || 'Pilot', amount, planName, {
              idempotencyKey: buildEmailIdempotencyKey('billing_receipt', 'email', billingUser.id, dedupeKey),
            }).then((providerMessageId) => recordNotificationDelivery(
              supabaseAdmin,
              billingUser.id,
              'billing_receipt',
              'email',
              dedupeKey,
              {
                provider: 'resend',
                provider_message_id: providerMessageId ?? null,
                stripe_invoice_id: invoice.id ?? null,
                amount,
                plan_name: planName,
              }
            )).catch(err => {
              console.error('[Stripe Webhook] Failed to send receipt email:', err);
            });
          }

          if (
            billingUser?.expo_push_token &&
            canSendNotification(billingUser.notification_preferences, 'push', 'billing') &&
            !(await hasNotificationDelivery(supabaseAdmin, billingUser.id, 'billing_receipt', 'push', dedupeKey))
          ) {
            const pushResult = await sendExpoPushNotification({
              to: billingUser.expo_push_token,
              title: 'Payment received',
              body: 'Your Planevo subscription payment was received. Thank you.',
              data: { screen: 'settings', section: 'membership' },
            });
            if (!pushResult.ok && pushResult.deviceNotRegistered) {
              await supabaseAdmin.from('users').update({ expo_push_token: null }).eq('id', billingUser.id);
            } else if (pushResult.ok) {
              await recordNotificationDelivery(
                supabaseAdmin,
                billingUser.id,
                'billing_receipt',
                'push',
                dedupeKey,
                { provider: 'expo', ticket_id: pushResult.ticketId ?? null, stripe_invoice_id: invoice.id ?? null }
              );
            }
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id;

        if (customerId) {
          console.log(`[Stripe Webhook] Payment failed for customer ${customerId}. Marking subscription past_due.`);
          const { data: user, error } = await supabaseAdmin
            .from('users')
            .update({
              subscription_status: 'past_due'
            })
            .eq('stripe_customer_id', customerId)
            .select('id, email, name, expo_push_token, notification_preferences ( master_toggle, channels, types, quiet_hours )')
            .single();

          const billingUser = user as BillingNotificationUser | null;
          const dedupeKey = invoice.id || event.id;

          if (error) {
            console.error('[Stripe Webhook] Payment failed DB update failed:', error);
            throw error;
          } else if (
            billingUser?.email &&
            canSendNotification(billingUser.notification_preferences, 'email', 'billing') &&
            !(await hasNotificationDelivery(supabaseAdmin, billingUser.id, 'billing_payment_failed', 'email', dedupeKey))
          ) {
            await sendPaymentFailedEmail(billingUser.email, billingUser.name || 'Pilot', {
              idempotencyKey: buildEmailIdempotencyKey('billing_payment_failed', 'email', billingUser.id, dedupeKey),
            }).then((providerMessageId) => recordNotificationDelivery(
              supabaseAdmin,
              billingUser.id,
              'billing_payment_failed',
              'email',
              dedupeKey,
              {
                provider: 'resend',
                provider_message_id: providerMessageId ?? null,
                stripe_invoice_id: invoice.id ?? null,
              }
            )).catch(err => {
              console.error('[Stripe Webhook] Failed to send payment failed email:', err);
            });
          }

          if (
            billingUser?.expo_push_token &&
            canSendNotification(billingUser.notification_preferences, 'push', 'billing') &&
            !(await hasNotificationDelivery(supabaseAdmin, billingUser.id, 'billing_payment_failed', 'push', dedupeKey))
          ) {
            const pushResult = await sendExpoPushNotification({
              to: billingUser.expo_push_token,
              title: 'Payment needs attention',
              body: 'We could not process your Planevo subscription payment. Open settings to review it.',
              data: { screen: 'settings', section: 'membership' },
            });
            if (!pushResult.ok && pushResult.deviceNotRegistered) {
              await supabaseAdmin.from('users').update({ expo_push_token: null }).eq('id', billingUser.id);
            } else if (pushResult.ok) {
              await recordNotificationDelivery(
                supabaseAdmin,
                billingUser.id,
                'billing_payment_failed',
                'push',
                dedupeKey,
                { provider: 'expo', ticket_id: pushResult.ticketId ?? null, stripe_invoice_id: invoice.id ?? null }
              );
            }
          }
        }
        break;
      }

      default:
        // Unhandled event type — log but don't fail
        console.log(`[Stripe Webhook] Unhandled event: ${event.type}`);
    }

    await markStripeEventProcessed(event);
  } catch (err) {
    console.error('[Stripe Webhook] Event processing error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  // Always return 200 to acknbearedge receipt — even for unhandled events
  return NextResponse.json({ received: true });
}
