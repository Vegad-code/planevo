/**
 * Planevo Command — voice intake orchestration (§20.3, §27, §36).
 *
 * This module is deliberately DB-free so it is unit-testable by mocking only
 * `./transcribe`, `./usage`, and `./extract`. The voice-seconds cap (§27,
 * §14.3) is computed by the caller (the route, which sums
 * `ai_usage_logs.audio_seconds` for the current rolling period) and passed in
 * as `audioSecondsUsedThisPeriod` — this keeps the cap decision itself pure
 * and guarantees, by construction, that `transcribeAudio` is never reached
 * when the user is over cap (§36: enforce BEFORE the provider call).
 */

import { limitPolicyForPlan, reserveCommandAiRequest } from './usage';
import { COMMAND_USAGE_FEATURES } from './models';
import { transcribeAudio, type TranscribeAudioInput } from './transcribe';
import { extractResponsibilities, type ExtractOutput } from './extract';
import type { PlanType } from '@/lib/auth/subscription';
import type { ExtractedResponsibility } from './types';

/**
 * §20.3 response contract. Not added to `./types` (which is a reused,
 * do-not-modify module for this build) — this is the one new API-contract
 * type voice intake needs.
 */
export interface CommandVoiceResponse {
  transcript: string;
  intakeRunId?: string;
  previewItems?: ExtractedResponsibility[];
  usage: {
    audioSecondsUsedThisPeriod: number;
    audioSecondsRemainingThisPeriod: number;
    model: string;
  };
}

/** §38 copy — do not reword without checking the copy bank. */
export const VOICE_CAP_MESSAGE = 'Voice capture resets next week. Typing still works.';
export const VOICE_TRANSCRIBE_FAILURE_MESSAGE =
  'Planevo could not hear that. Try again, or type it instead.';

/** ~25MB (§20.3 "validate file size"). */
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
/** Per-recording sanity cap independent of plan (§36 "audio too long"). */
export const MAX_AUDIO_SECONDS_PER_REQUEST = 600;

export type AudioUploadValidation =
  | { ok: true; durationSeconds: number }
  | { ok: false; error: string };

/** Validate file size and duration BEFORE any cap check or provider call (§20.3, §36). */
export function validateVoiceUpload(input: {
  sizeBytes: number;
  durationSeconds: number;
}): AudioUploadValidation {
  if (input.sizeBytes <= 0 || input.durationSeconds <= 0) {
    return { ok: false, error: 'No audio was recorded. Try again, or type it instead.' };
  }
  if (input.sizeBytes > MAX_AUDIO_BYTES) {
    return { ok: false, error: 'That recording is too large. Try a shorter one, or type it instead.' };
  }
  if (input.durationSeconds > MAX_AUDIO_SECONDS_PER_REQUEST) {
    return {
      ok: false,
      error: 'That recording is too long — keep it under 10 minutes, or type it instead.',
    };
  }
  return { ok: true, durationSeconds: input.durationSeconds };
}

export interface VoiceCapDecision {
  allowed: boolean;
  message?: string;
  remainingSeconds: number;
}

/** Pure cap check (§27) — never calls the provider. */
export function checkVoiceCap(
  plan: PlanType,
  audioSecondsUsedThisPeriod: number,
  requestedAudioSeconds: number,
): VoiceCapDecision {
  const limit = limitPolicyForPlan(plan).voiceSecondsPerMonth;
  const remainingSeconds = Math.max(0, limit - audioSecondsUsedThisPeriod);
  if (requestedAudioSeconds > remainingSeconds) {
    return { allowed: false, message: VOICE_CAP_MESSAGE, remainingSeconds };
  }
  return { allowed: true, remainingSeconds };
}

export type VoiceIntakeResult =
  | {
      ok: true;
      transcript: string;
      transcribeModel: string;
      audioSeconds: number;
      extraction: ExtractOutput;
      usageLogId?: string;
      remainingSecondsBeforeThisRequest: number;
    }
  | {
      ok: false;
      stage: 'cap' | 'rate_limit' | 'transcribe';
      message: string;
      resetAt?: string;
      remainingSecondsBeforeThisRequest?: number;
    };

export interface RunVoiceIntakeInput {
  userId: string;
  email?: string | null;
  plan: PlanType;
  /** Sum of `ai_usage_logs.audio_seconds` for this user in the current period. */
  audioSecondsUsedThisPeriod: number;
  /** Client-reported (or otherwise estimated) length of this recording, in seconds. */
  requestedAudioSeconds: number;
  audio: TranscribeAudioInput;
  timezone: string;
  clientNow: string;
  requestId?: string;
}

/**
 * Enforce the voice cap, reserve one Command AI request, transcribe, then
 * extract responsibilities from the transcript. Returns a discriminated
 * result — never throws for expected failure modes (cap, rate limit,
 * transcription failure); the caller (route.ts) maps each `stage` to the
 * appropriate HTTP response and persistence.
 */
export async function runVoiceIntake(input: RunVoiceIntakeInput): Promise<VoiceIntakeResult> {
  const cap = checkVoiceCap(input.plan, input.audioSecondsUsedThisPeriod, input.requestedAudioSeconds);
  if (!cap.allowed) {
    return {
      ok: false,
      stage: 'cap',
      message: cap.message ?? VOICE_CAP_MESSAGE,
      remainingSecondsBeforeThisRequest: cap.remainingSeconds,
    };
  }

  const reservation = await reserveCommandAiRequest(
    input.userId,
    COMMAND_USAGE_FEATURES.voiceTranscription,
    input.email,
    input.requestId,
  );
  if (!reservation.allowed) {
    return {
      ok: false,
      stage: 'rate_limit',
      message: reservation.message,
      resetAt: reservation.resetAt,
      remainingSecondsBeforeThisRequest: cap.remainingSeconds,
    };
  }

  let transcribed;
  try {
    transcribed = await transcribeAudio({
      audio: input.audio,
      plan: input.plan,
      fallbackAudioSeconds: input.requestedAudioSeconds,
    });
  } catch (err) {
    console.error('[Command voice] transcription error:', err);
    return { ok: false, stage: 'transcribe', message: VOICE_TRANSCRIBE_FAILURE_MESSAGE };
  }

  const extraction = await extractResponsibilities({
    text: transcribed.transcript,
    timezone: input.timezone,
    clientNow: input.clientNow,
    inputMode: 'voice',
  });

  return {
    ok: true,
    transcript: transcribed.transcript,
    transcribeModel: transcribed.model,
    audioSeconds: transcribed.audioSeconds,
    extraction,
    usageLogId: reservation.usageLogId,
    remainingSecondsBeforeThisRequest: cap.remainingSeconds,
  };
}
