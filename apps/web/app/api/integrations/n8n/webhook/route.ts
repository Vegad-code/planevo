import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkIpRateLimit } from '@/lib/auth/ip-rate-limit';

// Per-IP limit to blunt token-enumeration and DB-load abuse of this
// unauthenticated endpoint (auth is the opaque webhook token in the body).
const N8N_WEBHOOK_RATE_LIMIT = {
  bucket: 'integrations:n8n-webhook',
  maxAttempts: 60,
  windowSeconds: 60,
} as const;

const calendarEventDataSchema = z.object({
  title: z.string().trim().min(1).max(500),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  source: z.string().trim().min(1).max(100).optional().default('n8n'),
}).refine((event) => new Date(event.end_time).getTime() > new Date(event.start_time).getTime(), {
  message: 'end_time must be after start_time',
  path: ['end_time'],
});

const eventSchema = z.object({
  token: z.string().uuid(),
  type: z.literal('calendar_event'),
  data: calendarEventDataSchema,
});

export async function POST(req: NextRequest) {
  try {
    const rateLimit = await checkIpRateLimit(req, N8N_WEBHOOK_RATE_LIMIT);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: rateLimit.retryAfterSeconds
            ? { 'Retry-After': String(rateLimit.retryAfterSeconds) }
            : undefined,
        }
      );
    }

    const body = await req.json();
    const result = eventSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload structure' }, { status: 400 });
    }

    const { token, data } = result.data;

    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('n8n_webhook_token', token)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Signal Token' }, { status: 401 });
    }

    const { error: insertError } = await supabaseAdmin
      .from('calendar_events')
      .insert({
        user_id: userProfile.id,
        title: data.title,
        start_time: data.start_time,
        end_time: data.end_time,
        source: data.source,
      });

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, message: 'Signal received and logged.' });
  } catch (error: unknown) {
    console.error('N8N Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Signal Error' }, { status: 500 });
  }
}
