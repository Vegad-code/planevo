/**
 * Planevo — v1 Feature Flags
 *
 * Per STRATEGY.md §5, v1 ships with a deliberately small surface area.
 * Vitamin features are flagged off by default and can be re-enabled per
 * environment via env vars without code changes.
 *
 * Flip a flag by setting the env var to "true" in your .env.local
 * (or in Vercel project settings) and redeploying.
 *
 * NOTE: These are PUBLIC env vars (prefixed NEXT_PUBLIC_) so they are
 * available in both client and server code. Never put secrets here.
 */

export const FEATURES = {
  // --- v1 CORE (always on) ---
  DAILY_PLAN: true,
  BRUNO_CHAT: true,
  WEEKLY_REVIEW: true,
  CANVAS_SYNC: true,
  GOOGLE_CAL_SYNC: true,
  AI_PLAN_DRAFT: true, // Gated by plan_type on backend (premium-only tools)

  // --- v1 VITAMINS (flagged off until 20 paying users ask) ---
  HABITS: process.env.NEXT_PUBLIC_ENABLE_HABITS === 'true',
  PROJECTS: process.env.NEXT_PUBLIC_ENABLE_PROJECTS === 'true',
  FOCUS_MODE: process.env.NEXT_PUBLIC_ENABLE_FOCUS === 'true',
  ACADEMIC_SEARCH: process.env.NEXT_PUBLIC_ENABLE_ACADEMIC_SEARCH === 'true',
  GARDEN_OF_DONE: process.env.NEXT_PUBLIC_ENABLE_GARDEN_OF_DONE === 'true',
  ARCHIVES_PANEL: process.env.NEXT_PUBLIC_ENABLE_ARCHIVES === 'true',
  COMMAND_CENTER: process.env.NEXT_PUBLIC_ENABLE_COMMAND_CENTER === 'true',
  OMNIBOX: process.env.NEXT_PUBLIC_ENABLE_OMNIBOX === 'true',
  N8N_INTEGRATION: process.env.NEXT_PUBLIC_ENABLE_N8N === 'true',
  NOTION_INTEGRATION: process.env.NEXT_PUBLIC_ENABLE_NOTION === 'true',
  SLACK_INTEGRATION: process.env.NEXT_PUBLIC_ENABLE_SLACK === 'true',
  LINEAR_INTEGRATION: process.env.NEXT_PUBLIC_ENABLE_LINEAR === 'true',

  // --- v1 ADVANCED AI (flagged off; archived endpoints) ---
  AI_PRIORITIZE: process.env.NEXT_PUBLIC_ENABLE_AI_PRIORITIZE === 'true',
  AI_BREAKDOWN: process.env.NEXT_PUBLIC_ENABLE_AI_BREAKDOWN === 'true',
  AI_DECOMPOSE: process.env.NEXT_PUBLIC_ENABLE_AI_DECOMPOSE === 'true',
  AI_ARCHITECT: process.env.NEXT_PUBLIC_ENABLE_AI_ARCHITECT === 'true',
  BRUNO_BRAIN_UI: process.env.NEXT_PUBLIC_ENABLE_BRUNO_BRAIN === 'true',
  AI_SUGGESTIONS: process.env.NEXT_PUBLIC_ENABLE_AI_SUGGESTIONS === 'true',
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isEnabled(key: FeatureKey): boolean {
  return FEATURES[key];
}
