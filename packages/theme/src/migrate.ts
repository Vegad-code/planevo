import type { ColorThemeId } from './types';
import { COLOR_THEME_IDS } from './types';

const LEGACY_ACCENT_MAP: Record<string, ColorThemeId> = {
  honey: 'classic',
  warm: 'classic',
  terracotta: 'aurora',
  'earth-garden': 'aurora',
  amber: 'ember',
  sage: 'forest-olive',
  ocean: 'coastal-blue',
  plum: 'soft-coral',
  rosewood: 'soft-coral',
};

export function migrateAccentToColorTheme(value: string | null | undefined): ColorThemeId {
  if (!value) return 'daylight';
  if ((COLOR_THEME_IDS as readonly string[]).includes(value)) {
    return value as ColorThemeId;
  }
  return LEGACY_ACCENT_MAP[value] ?? 'daylight';
}

export function isColorThemeId(value: string | null | undefined): value is ColorThemeId {
  return !!value && (COLOR_THEME_IDS as readonly string[]).includes(value);
}
