/**
 * POST /api/command/voice — spoken responsibilities → transcript → preview (§20.3).
 *
 * Pipeline: validate upload → sum this period's voice seconds → enforce the
 * voice cap BEFORE transcription (§27, §36) → reserve one Command AI request
 * → transcribe → create intake run → extract → persist. Flag-gated behind
 * both `COMMAND_VOICE` and `PLANEVO_COMMAND` (§32) — 404 when either is off,
 * same posture as the rest of Command's surface.
 *
 * No raw audio is ever written to disk or a table (§29): the uploaded file is
 * read into memory, handed to `transcribeAudio`, and discarded when this
 * request completes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { getUserPlanById } from '@/lib/auth/subscription';
import { commandDb } from '@/lib/command/db';
import { FEATURES } from '@/lib/featureFlags';
import { limitPolicyForPlan } from '@/lib/command/usage';
import { COMMAND_USAGE_FEATURES } from '@/lib/command/models';
import { estimateTextCostUsd, estimateVoiceCostUsd } from '@/lib/command/costs';
import { createIntakeRun, updateIntakeRun } from '@/lib/command/persist';
import {
  runVoiceIntake,
  validateVoiceUpload,
  type CommandVoiceResponse,
} from '@/lib/command/voice';

/** Rolling window matching the existing Command monthly-quota convention (§27). */
const VOICE_PERIOD_DAYS = 30;

/** Sum `ai_usage_logs.audio_seconds` for this user's completed voice transcriptions this period. */
async function getAudioSecondsUsedThisPeriod(userId: string): Promise<number> {
  const since = new Date(Date.now() - VOICE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();
  // `audio_seconds` post-dates the generated Database type (see lib/command/db.ts),
  // so this reads through the same permissive client Command persistence uses.
  const { data, error } = await commandDb()
    .from('ai_usage_logs')
    .select('audio_seconds')
    .eq('user_id', userId)
    .eq('feature', COMMAND_USAGE_FEATURES.voiceTranscription)
    .eq('status', 'completed')
    .gte('created_at', since);
  if (error) throw error;
  return (data as { audio_seconds: number | null }[] | null ?? []).reduce(
    (sum, row) => sum + (row.audio_seconds ?? 0),
    0,
  );
}

/** Mark the reserved ai_usage_logs row completed with the actual model/seconds/cost (§16.7). */
async function completeVoiceUsageLog(
  usageLogId: string | undefined,
  patch: { model: string; audioSeconds: number; estimatedCostUsd: number },
): Promise<void> {
  if (!usageLogId) return;
  const { error } = await commandDb()
    .from('ai_usage_logs')
    .update({
      model: patch.model,
      audio_seconds: patch.audioSeconds,
      estimated_cost_cents: patch.estimatedCostUsd * 100,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', usageLogId);
  if (error) console.error('[Command voice] failed to complete usage log:', error);
}

export async function POST(req: NextRequest) {
  if (!FEATURES.COMMAND_VOICE || !FEATURES.PLANEVO_COMMAND) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!isAllowedOriginOrBearer(req)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const audioFile = form?.get('audio');
  if (!form || !(audioFile instanceof Blob)) {
    return NextResponse.json({ error: 'Audio is required.' }, { status: 400 });
  }

  const timezone = typeof form.get('timezone') === 'string' ? String(form.get('timezone')) : 'UTC';
  const clientNowRaw = form.get('clientNow');
  const clientNow =
    typeof clientNowRaw === 'string' && !Number.isNaN(Date.parse(clientNowRaw))
      ? clientNowRaw
      : new Date().toISOString();
  const durationRaw = form.get('durationSeconds');
  const durationSeconds =
    typeof durationRaw === 'string' && Number.isFinite(Number(durationRaw)) ? Number(durationRaw) : 0;

  // 1) Validate file size and duration BEFORE touching usage or the provider (§20.3, §36).
  const validation = validateVoiceUpload({ sizeBytes: audioFile.size, durationSeconds });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { plan } = await getUserPlanById(user.id, user.email);
  const capLimit = limitPolicyForPlan(plan).voiceSecondsPerMonth;

  // 2) Enforce the voice cap BEFORE transcription — sum this period's usage first.
  let audioSecondsUsedThisPeriod: number;
  try {
    audioSecondsUsedThisPeriod = await getAudioSecondsUsedThisPeriod(user.id);
  } catch (err) {
    console.error('[Command voice] usage lookup failed:', err);
    return NextResponse.json(
      { error: 'usage_unavailable', message: 'Voice usage checks are temporarily unavailable. Try again shortly.' },
      { status: 503 },
    );
  }

  const audioBuffer = new Uint8Array(await audioFile.arrayBuffer());

  const result = await runVoiceIntake({
    userId: user.id,
    email: user.email,
    plan,
    audioSecondsUsedThisPeriod,
    requestedAudioSeconds: validation.durationSeconds,
    audio: audioBuffer,
    timezone,
    clientNow,
  });

  if (!result.ok) {
    const remaining = result.remainingSecondsBeforeThisRequest ?? Math.max(0, capLimit - audioSecondsUsedThisPeriod);
    if (result.stage === 'cap' || result.stage === 'rate_limit') {
      return NextResponse.json(
        { error: 'limit_reached', message: result.message, resetAt: result.resetAt, remainingSeconds: remaining },
        { status: 429 },
      );
    }
    // Transcription failure (§36): transcript-less error, nothing to preview.
    return NextResponse.json({ error: 'transcription_failed', message: result.message }, { status: 502 });
  }

  // 3) Create the intake run now that we have a transcript, then extract.
  const intakeRunId = await createIntakeRun(commandDb(), {
    userId: user.id,
    inputMode: 'voice',
    rawText: null,
    transcriptText: result.transcript,
  });

  const voiceCostUsd = estimateVoiceCostUsd(result.transcribeModel, result.audioSeconds);
  const extractCostUsd = estimateTextCostUsd(result.extraction.model, result.extraction.usage);

  try {
    await updateIntakeRun(commandDb(), user.id, intakeRunId, {
      status: result.extraction.fallback ? 'failed' : 'previewed',
      extractionModel: result.extraction.model,
      inputTokens: result.extraction.usage.inputTokens,
      outputTokens: result.extraction.usage.outputTokens,
      audioSeconds: result.audioSeconds,
      estimatedCostUsd: voiceCostUsd + extractCostUsd,
      confidence: result.extraction.extraction.confidence,
      errorMessage: result.extraction.fallback ? 'extraction fell back to raw unsorted item' : null,
    });
  } catch (err) {
    console.error('[Command voice] failed to update intake run:', err);
  }

  await completeVoiceUsageLog(result.usageLogId, {
    model: result.transcribeModel,
    audioSeconds: result.audioSeconds,
    estimatedCostUsd: voiceCostUsd,
  });

  const newTotalUsed = audioSecondsUsedThisPeriod + result.audioSeconds;
  const response: CommandVoiceResponse = {
    transcript: result.transcript,
    intakeRunId,
    previewItems: result.extraction.extraction.items,
    usage: {
      audioSecondsUsedThisPeriod: newTotalUsed,
      audioSecondsRemainingThisPeriod: Math.max(0, capLimit - newTotalUsed),
      model: result.transcribeModel,
    },
  };
  return NextResponse.json(response);
}
