import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    // Optional: secure this endpoint by adding a webhook secret in your Supabase Webhook configuration
    // e.g. add a header "X-Webhook-Secret" and verify it against process.env.SUPABASE_WEBHOOK_SECRET
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = req.headers.get('X-Webhook-Secret');
      if (authHeader !== webhookSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const payload = await req.json();

    // We only care about DELETE events from the users table
    if (payload.type === 'DELETE' && payload.table === 'users') {
      const oldRecord = payload.old_record;
      const stripeCustomerId = oldRecord?.stripe_customer_id;

      if (stripeCustomerId) {
        try {
          // Cancel any active subscriptions to ensure customer deletion succeeds
          const subscriptions = await stripe.subscriptions.list({
            customer: stripeCustomerId,
            status: 'all',
          });

          for (const sub of subscriptions.data) {
            if (sub.status !== 'canceled') {
              await stripe.subscriptions.cancel(sub.id);
            }
          }

          // Delete the customer
          await stripe.customers.del(stripeCustomerId);
          console.log(`[Supabase Webhook] Successfully deleted Stripe customer ${stripeCustomerId}`);
        } catch (stripeError) {
          console.warn(`[Supabase Webhook] Stripe customer deletion failed for ${stripeCustomerId}:`, stripeError);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Supabase Webhook] Error processing request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
