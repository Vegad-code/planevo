import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { getBrunoMasterContext } from '@/lib/ai/orchestrator';
import * as Sentry from '@sentry/nextjs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizePlanType } from '@/lib/auth/plan-types';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { checkRateLimitForUser } from '@/lib/auth/rateLimit';

export async function GET(request: NextRequest) {
  try {
    if (!isAllowedOriginOrBearer(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const { user, error, authMethod } = await getAuthenticatedUser(request);
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitResult = await checkRateLimitForUser(user.id, 'dashboard-insight', user.email);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { insight: "You've reached your AI limit for now. Try again later." },
        { status: 429 }
      );
    }

    // Set Sentry user and tags
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('plan_type')
      .eq('id', user.id)
      .single();
    Sentry.setUser({ id: user.id, email: user.email || undefined });
    Sentry.setTag('route', '/api/ai/insight');
    Sentry.setTag('feature', 'dashboard-insight');
    Sentry.setTag('plan_type', normalizePlanType(profile?.plan_type));
    Sentry.setTag('auth_method', authMethod || 'unknown');

    const worldState = await getBrunoMasterContext(user.id);
    
    // Very quick LLM call for a single insight sentence
    const prompt = `You are Bruno, a friendly planning assistant (a bear). 
The user is viewing their dashboard.
Generate ONE short, encouraging, and highly specific insight based on their tasks and calendar. 
Do not greet them. Do not use emojis except maybe a bear 🐻. Keep it under 20 words.
Example: "You have 3 high priority tasks due today. Let's knock out 'Math Homework' first."

Tasks: ${JSON.stringify(worldState.tasks.slice(0, 5).map((t: {title: string}) => t.title))}
Events: ${worldState.calendarEvents.length} upcoming events.
`;

    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) {
      return NextResponse.json({ insight: "You've got some open tasks. Let's get to work! 🐻" });
    }

    const aiApiResponse = await Sentry.startSpan(
      { name: 'OpenAI Dashboard Insight completion', op: 'ai.completion' },
      async () => {
        return await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'system', content: prompt }],
            max_tokens: 50,
          }),
        });
      }
    );

    if (!aiApiResponse.ok) throw new Error('AI API failure');

    const rawData = await aiApiResponse.json();
    const insight = rawData.choices[0].message.content.trim();

    return NextResponse.json({ insight });
  } catch (err: unknown) {
    console.error('[AI Insight Error]', err);
    Sentry.captureException(err);
    return NextResponse.json(
      { insight: "Ready to get things done today? 🐻", fallback: true },
      { status: 200 }
    );
  }
}
