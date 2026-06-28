import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  APPEARANCE_STORAGE_KEYS,
  clearLegacyAppearanceStorage,
  readScopedAppearanceItem,
  scopedAppearanceKey,
  writeScopedAppearanceItem,
} from '@/lib/appearance/appearance-storage';

describe('appearance-storage', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem(key: string) {
        return store[key] ?? null;
      },
      setItem(key: string, value: string) {
        store[key] = value;
      },
      removeItem(key: string) {
        delete store[key];
      },
    });
    clearLegacyAppearanceStorage();
  });

  it('scopes keys per user id', () => {
    writeScopedAppearanceItem(APPEARANCE_STORAGE_KEYS.accent, 'user-a', 'ocean');
    writeScopedAppearanceItem(APPEARANCE_STORAGE_KEYS.accent, 'user-b', 'sage');

    expect(readScopedAppearanceItem(APPEARANCE_STORAGE_KEYS.accent, 'user-a')).toBe('ocean');
    expect(readScopedAppearanceItem(APPEARANCE_STORAGE_KEYS.accent, 'user-b')).toBe('sage');
    expect(scopedAppearanceKey(APPEARANCE_STORAGE_KEYS.accent, 'user-a')).toBe(
      'planevo-accent:user-a',
    );
  });

  it('migrates legacy global keys into the active user scope once', () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEYS.accent, 'plum');

    expect(readScopedAppearanceItem(APPEARANCE_STORAGE_KEYS.accent, 'user-a')).toBe('plum');
    expect(localStorage.getItem(APPEARANCE_STORAGE_KEYS.accent)).toBeNull();
    expect(readScopedAppearanceItem(APPEARANCE_STORAGE_KEYS.accent, 'user-b')).toBeNull();
  });

  it('does not read another user scoped values', () => {
    writeScopedAppearanceItem(APPEARANCE_STORAGE_KEYS.colorTheme, 'user-a', 'coastal-blue');

    expect(readScopedAppearanceItem(APPEARANCE_STORAGE_KEYS.colorTheme, 'user-b')).toBeNull();
  });
});
