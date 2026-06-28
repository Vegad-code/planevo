import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, checkRateLimitForUser } from '@/lib/auth/rateLimit';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { dailyPlanBodySchema, parseJsonBody } from '@/lib/api/schemas';
import { generateDailyPlan } from '@/lib/ai/generate-daily-plan';
import * as Sentry from '@sentry/nextjs';
import { normalizePlanType } from '@/lib/auth/plan-types';

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedOriginOrBearer(request)) {
      return NextResponse.json({ error: 'Forbidden: invalid origin' }, { status: 403 });
    }

    const { user: authUser, error: authError, authMethod } = await getAuthenticatedUser(request);

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('plan_type')
      .eq('id', authUser.id)
      .single();

    Sentry.setUser({ id: authUser.id, email: authUser.email || undefined });
    Sentry.setTag('route', '/api/ai/daily-plan');
    Sentry.setTag('feature', 'daily-plan');
    Sentry.setTag('plan_type', normalizePlanType(profile?.plan_type));
    Sentry.setTag('auth_method', authMethod || 'unknown');

    const rateLimitResult =
      authMethod === 'bearer'
        ? await checkRateLimitForUser(authUser.id, 'daily-plan', authUser.email)
        : await checkRateLimit('daily-plan');

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: rateLimitResult.error,
          message:
            (rateLimitResult as { message?: string }).message ||
            'You have reached your daily AI limit.',
        },
        { status: rateLimitResult.error === 'Unauthorized' ? 401 : 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = parseJsonBody(dailyPlanBodySchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { energyLevel, localTime, timezone, todayStart, todayEnd, force } = parsed.data;

    const result = await generateDailyPlan({
      userId: authUser.id,
      energyLevel,
      localTime,
      timezone,
      todayStart,
      todayEnd,
      force,
      trigger: 'manual',
    });

    if (result.skipped) {
      return NextResponse.json({
        plan: [],
        schedule: [],
        message: result.message,
        skipped: true,
      });
    }

    return NextResponse.json({
      schedule: result.plan,
      plan: result.plan,
      message: result.message,
      summary: result.summary,
      overflow: result.overflow,
      energyLevel: result.energyLevel,
      focus_score: result.focusScore,
      vibe: result.vibe,
    });
  } catch (error) {
    console.error('Daily Plan Error:', error);
    Sentry.captureException(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Daily plan failed' },
      { status: 500 }
    );
  }
}
