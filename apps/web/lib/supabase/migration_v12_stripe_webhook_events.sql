-- Migration v12: Stripe Webhook Idempotency

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- No policies are needed because this table is only accessed by the service role key.
