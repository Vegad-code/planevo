/**
 * Planevo Command — model configuration.
 *
 * Source of truth: docs/superpowers/plans/comprehensive.md §12.1.
 * Env-overridable so model choices are never hard-coded across the pipeline.
 * Do NOT route action-capable tiers back to pre-GPT-5 models.
 */

export const COMMAND_MODELS = {
  /** Default text extraction — cheap, JSON-only (§12.2). */
  extract: process.env.COMMAND_EXTRACT_MODEL ?? 'gpt-5.4-nano',
  /** Escalation when nano is unsure / fails schema / mixed domains (§12.2). */
  extractEscalation: process.env.COMMAND_EXTRACT_ESCALATION_MODEL ?? 'gpt-5.4-mini',
  /** Standard Bruno inside Command (§12.3). */
  bruno: process.env.COMMAND_BRUNO_MODEL ?? 'gpt-5.4-mini',
  /** Deep Bruno — credit-metered via the existing ledger (§12.3). */
  deep: process.env.COMMAND_DEEP_MODEL ?? 'gpt-5.4',
  /** Voice transcription (§12.4). */
  transcribeFree: process.env.COMMAND_TRANSCRIBE_FREE_MODEL ?? 'gpt-4o-mini-transcribe',
  transcribePro: process.env.COMMAND_TRANSCRIBE_PRO_MODEL ?? 'gpt-4o-transcribe',
  realtimeVoice: process.env.COMMAND_REALTIME_VOICE_MODEL ?? 'gpt-realtime-whisper',
} as const;

export type CommandModelKey = keyof typeof COMMAND_MODELS;

/** `ai_usage_logs.feature` values written by Command (§16.7). */
export const COMMAND_USAGE_FEATURES = {
  textExtract: 'command_text_extract',
  textEscalation: 'command_text_escalation',
  voiceTranscription: 'command_voice_transcription',
  brunoStandard: 'command_bruno_standard',
  brunoDeep: 'command_bruno_deep',
  sourceRefresh: 'command_source_refresh',
  eval: 'command_eval',
} as const;

export type CommandUsageFeature =
  (typeof COMMAND_USAGE_FEATURES)[keyof typeof COMMAND_USAGE_FEATURES];
