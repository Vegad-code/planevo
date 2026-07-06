/**
 * POST /api/command/intake — messy text → structured preview (§20.1).
 *
 * Pipeline: fast path (zero AI) → usage reservation → intake run → extract →
 * normalize → return PREVIEW (not persisted items). Free users over their cap are
 * rejected BEFORE any provider call.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { commandDb } from '@/lib/command/db';
import { FEATURES } from '@/lib/featureFlags';
import { validateIntakeText } from '@/lib/command/validate';
import { tryFastPath } from '@/lib/command/fastpath';
import { reserveCommandAiRequest } from '@/lib/command/usage';
import { COMMAND_USAGE_FEATURES } from '@/lib/command/models';
import { extractResponsibilities } from '@/lib/command/extract';
import { estimateTextCostUsd } from '@/lib/command/costs';
import { createIntakeRun, updateIntakeRun } from '@/lib/command/persist';
import type { CommandIntakeResponse } from '@/lib/command/types';

export async function POST(req: NextRequest) {
  if (!FEATURES.PLANEVO_COMMAND) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!isAllowedOriginOrBearer(req)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const validation = validateIntakeText(body?.text);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const inputMode: 'text' | 'paste' | 'source_import' =
    body?.inputMode === 'paste' || body?.inputMode === 'source_import' ? body.inputMode : 'text';
  const timezone: string = typeof body?.timezone === 'string' ? body.timezone : 'UTC';
  const clientNow: string =
    typeof body?.clientNow === 'string' && !Number.isNaN(Date.parse(body.clientNow))
      ? body.clientNow
      : new Date().toISOString();
  const refDate = new Date(clientNow);

  // 1) Deterministic fast path — zero AI, zero quota (§12.2).
  const fast = tryFastPath(validation.text, refDate);
  if (fast) {
    const intakeRunId = await createIntakeRun(commandDb(), {
      userId: user.id,
      inputMode,
      rawText: validation.text,
    });
    await updateIntakeRun(commandDb(), user.id, intakeRunId, {
      status: 'previewed',
      confidence: fast.confidence,
    });
    const response: CommandIntakeResponse = {
      intakeRunId,
      summary: fast.summary,
      previewItems: fast.items,
      clarificationQuestions: [],
      usage: { planType: 'n/a', remainingToday: -1, estimatedCostUsd: 0 },
    };
    return NextResponse.json(response);
  }

  // 2) Reserve one AI request against the shared cap BEFORE calling the model.
  const reservation = await reserveCommandAiRequest(
    user.id,
    COMMAND_USAGE_FEATURES.textExtract,
    user.email,
  );
  if (!reservation.allowed) {
    return NextResponse.json(
      {
        error: 'limit_reached',
        message: reservation.message,
        resetAt: reservation.resetAt,
        remainingToday: 0,
      },
      { status: 429 },
    );
  }

  // 3) Intake run + extraction.
  const intakeRunId = await createIntakeRun(commandDb(), {
    userId: user.id,
    inputMode,
    rawText: validation.text,
  });

  try {
    const result = await extractResponsibilities({
      text: validation.text,
      timezone,
      clientNow,
      inputMode,
    });

    const estimatedCostUsd = estimateTextCostUsd(result.model, result.usage);
    await updateIntakeRun(commandDb(), user.id, intakeRunId, {
      status: result.fallback ? 'failed' : 'previewed',
      extractionModel: result.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      estimatedCostUsd,
      confidence: result.extraction.confidence,
      errorMessage: result.fallback ? 'extraction fell back to raw unsorted item' : null,
    });

    const response: CommandIntakeResponse = {
      intakeRunId,
      summary: result.extraction.summary,
      previewItems: result.extraction.items,
      clarificationQuestions: result.extraction.clarificationQuestions,
      usage: {
        planType: reservation.plan ?? 'unknown',
        // The atomic reservation does not surface a remaining count; -1 = unknown.
        remainingToday: -1,
        estimatedCostUsd,
      },
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error('[Command intake] extraction error:', err);
    await updateIntakeRun(commandDb(), user.id, intakeRunId, {
      status: 'failed',
      errorMessage: err instanceof Error ? err.message : 'unknown error',
    });
    return NextResponse.json(
      { error: 'extraction_failed', message: 'Planevo could not read that. Try again or type it manually.' },
      { status: 502 },
    );
  }
}
