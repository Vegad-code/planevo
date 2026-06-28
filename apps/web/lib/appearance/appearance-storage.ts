export const APPEARANCE_STORAGE_KEYS = {
  accent: 'planevo-accent',
  colorTheme: 'planevo-color-theme',
  fontSize: 'planevo-font-size',
  motion: 'planevo-motion',
  sidebarStyle: 'planevo-sidebar-style',
} as const;

export type AppearanceStorageKey =
  (typeof APPEARANCE_STORAGE_KEYS)[keyof typeof APPEARANCE_STORAGE_KEYS];

export function scopedAppearanceKey(baseKey: AppearanceStorageKey, userId: string): string {
  return `${baseKey}:${userId}`;
}

export function readScopedAppearanceItem(
  baseKey: AppearanceStorageKey,
  userId: string | null | undefined,
): string | null {
  if (!userId || typeof localStorage === 'undefined') return null;
  const scoped = localStorage.getItem(scopedAppearanceKey(baseKey, userId));
  if (scoped !== null) return scoped;
  // One-time migration from legacy global keys for the signed-in user.
  const legacy = localStorage.getItem(baseKey);
  if (legacy !== null) {
    localStorage.setItem(scopedAppearanceKey(baseKey, userId), legacy);
    localStorage.removeItem(baseKey);
    return legacy;
  }
  return null;
}

export function writeScopedAppearanceItem(
  baseKey: AppearanceStorageKey,
  userId: string,
  value: string,
): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(scopedAppearanceKey(baseKey, userId), value);
  localStorage.removeItem(baseKey);
}

export function clearLegacyAppearanceStorage(): void {
  if (typeof localStorage === 'undefined') return;
  for (const key of Object.values(APPEARANCE_STORAGE_KEYS)) {
    localStorage.removeItem(key);
  }
}
