/**
 * Planevo Command — voice transcription (§12.4, §20.3, §29).
 *
 * Model selection follows plan tier (§12.4): free/canceled get the cheaper
 * mini model, every paid tier gets the higher-quality model. Uses the AI
 * SDK's `experimental_transcribe` (backed by `@ai-sdk/openai`'s transcription
 * model) rather than a raw `fetch` — the SDK is already the first-class
 * dependency for Command AI calls (see extract.ts) and gives typed
 * duration/segment metadata for free instead of hand-parsing a multipart
 * response.
 *
 * Privacy (§29): the audio buffer passed in here is held only in memory for
 * the duration of the provider call. This module never writes it to disk, a
 * table, or storage — callers must not persist `input.audio` either.
 */

import { openai } from '@ai-sdk/openai';
import { experimental_transcribe as transcribe } from 'ai';
import type { PlanType } from '@/lib/auth/subscription';
import { COMMAND_MODELS } from './models';

/** Free-like plans get the cheaper transcription model (§12.4). */
function isFreeLikePlan(plan: PlanType): boolean {
  return plan === 'free' || plan === 'canceled';
}

/** Accepted in-memory audio representations (never a file path or URL). */
export type TranscribeAudioInput = ArrayBuffer | Uint8Array | Buffer;

export interface TranscribeInput {
  audio: TranscribeAudioInput;
  plan: PlanType;
  /** Force a specific model, bypassing plan-based selection (tests / overrides). */
  model?: string;
  /**
   * Client-reported recording length in seconds, used only as a fallback when
   * the provider does not return `durationInSeconds` (it is documented as
   * possibly undefined). Cap enforcement in the route always runs against
   * this same client estimate BEFORE this function is ever called.
   */
  fallbackAudioSeconds?: number;
}

export interface TranscribeOutput {
  transcript: string;
  model: string;
  audioSeconds: number;
}

/** Free/canceled use the cheap mini model; every paid tier gets the Pro model (§12.4). */
export function pickTranscribeModel(plan: PlanType): string {
  return isFreeLikePlan(plan) ? COMMAND_MODELS.transcribeFree : COMMAND_MODELS.transcribePro;
}

/**
 * Transcribe an in-memory audio buffer via OpenAI. Throws on missing config
 * or provider failure — callers (the voice route/orchestrator) are
 * responsible for turning that into the §36 transcript-less error response
 * rather than persisting a half-finished run.
 */
export async function transcribeAudio(input: TranscribeInput): Promise<TranscribeOutput> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const model = input.model ?? pickTranscribeModel(input.plan);
  const result = await transcribe({
    model: openai.transcription(model),
    audio: input.audio,
  });

  return {
    transcript: result.text,
    model,
    audioSeconds: result.durationInSeconds ?? input.fallbackAudioSeconds ?? 0,
  };
}
