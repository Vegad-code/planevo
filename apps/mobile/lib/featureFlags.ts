/**
 * Planevo mobile — feature flags (mirrors apps/web/lib/featureFlags.ts).
 *
 * Public Expo env vars (EXPO_PUBLIC_*) are inlined at build time. Flip a flag by
 * setting the env var to "true" and rebuilding.
 */
export const FEATURES = {
  PLANEVO_COMMAND: process.env.EXPO_PUBLIC_PLANEVO_COMMAND_ENABLED === 'true',
  COMMAND_VOICE: process.env.EXPO_PUBLIC_COMMAND_VOICE_ENABLED === 'true',
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isEnabled(key: FeatureKey): boolean {
  return FEATURES[key];
}
