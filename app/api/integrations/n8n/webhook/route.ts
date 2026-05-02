import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const eventSchema = z.object({
  token: z.string().uuid(),
  type: z.enum(['calendar_event', 'github_pr', 'jira_task']),
  data: z.any()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = eventSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload structure' }, { status: 400 });
    }

    const { token, type, data } = result.data;
    const supabase = await createClient();

    // Verify token and find user
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('n8n_webhook_token', token)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Signal Token' }, { status: 401 });
    }

    if (type === 'calendar_event') {
      const { title, start_time, end_time, source = 'google_calendar' } = data;
      
      const { error: insertError } = await supabase
        .from('calendar_events')
        .insert({
          user_id: userProfile.id,
          title,
          start_time,
          end_time,
          source
        });

      if (insertError) throw insertError;
    }

    // Future: Handle github_pr, jira_task

    return NextResponse.json({ success: true, message: 'Signal received and logged.' });
  } catch (error: any) {
    console.error('N8N Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Signal Error' }, { status: 500 });
  }
}
