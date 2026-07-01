import { describe, expect, it, vi, afterEach } from 'vitest';

describe('featureFlags', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('core features are always enabled', async () => {
    const { FEATURES, isEnabled } = await import('@/lib/featureFlags');
    expect(FEATURES.DAILY_PLAN).toBe(true);
    expect(FEATURES.BRUNO_CHAT).toBe(true);
    expect(FEATURES.WEEKLY_REVIEW).toBe(true);
    expect(FEATURES.CANVAS_SYNC).toBe(true);
    expect(FEATURES.GOOGLE_CAL_SYNC).toBe(true);
    expect(FEATURES.AI_PLAN_DRAFT).toBe(true);
    expect(isEnabled('DAILY_PLAN')).toBe(true);
    expect(isEnabled('BRUNO_CHAT')).toBe(true);
  });

  it('vitamin features are disabled by default', async () => {
    const { FEATURES } = await import('@/lib/featureFlags');
    expect(FEATURES.HABITS).toBe(false);
    expect(FEATURES.PROJECTS).toBe(false);
    expect(FEATURES.FOCUS_MODE).toBe(false);
    expect(FEATURES.GARDEN_OF_DONE).toBe(false);
    expect(FEATURES.COMMAND_CENTER).toBe(false);
    expect(FEATURES.OMNIBOX).toBe(false);
  });

  it('advanced AI features are disabled by default', async () => {
    const { FEATURES } = await import('@/lib/featureFlags');
    expect(FEATURES.AI_PRIORITIZE).toBe(false);
    expect(FEATURES.AI_BREAKDOWN).toBe(false);
    expect(FEATURES.AI_DECOMPOSE).toBe(false);
    expect(FEATURES.AI_ARCHITECT).toBe(false);
    expect(FEATURES.BRUNO_BRAIN_UI).toBe(false);
    expect(FEATURES.AI_SUGGESTIONS).toBe(false);
  });

  it('enables a vitamin feature when its env var is set to "true"', async () => {
    process.env.NEXT_PUBLIC_ENABLE_HABITS = 'true';
    const { FEATURES, isEnabled } = await import('@/lib/featureFlags');
    expect(FEATURES.HABITS).toBe(true);
    expect(isEnabled('HABITS')).toBe(true);
  });

  it('keeps vitamin feature disabled for non-"true" env values', async () => {
    process.env.NEXT_PUBLIC_ENABLE_HABITS = 'false';
    const { FEATURES } = await import('@/lib/featureFlags');
    expect(FEATURES.HABITS).toBe(false);
  });

  it('isEnabled returns false for a disabled feature', async () => {
    const { isEnabled } = await import('@/lib/featureFlags');
    expect(isEnabled('FOCUS_MODE')).toBe(false);
  });

  it('integration features can be enabled via env vars', async () => {
    process.env.NEXT_PUBLIC_ENABLE_NOTION = 'true';
    process.env.NEXT_PUBLIC_ENABLE_SLACK = 'true';
    process.env.NEXT_PUBLIC_ENABLE_LINEAR = 'true';
    const { FEATURES } = await import('@/lib/featureFlags');
    expect(FEATURES.NOTION_INTEGRATION).toBe(true);
    expect(FEATURES.SLACK_INTEGRATION).toBe(true);
    expect(FEATURES.LINEAR_INTEGRATION).toBe(true);
  });
});
