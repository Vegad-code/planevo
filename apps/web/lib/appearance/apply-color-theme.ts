import {
  getThemeTokens,
  TOKEN_CSS_VAR_MAP,
  type ColorThemeId,
  type ThemeTokens,
} from '@planevo/theme';

export function applyColorThemeToDocument(theme: ColorThemeId, isDark: boolean) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.setAttribute('data-color-theme', theme);

  const tokens = getThemeTokens(theme, isDark);
  (Object.keys(TOKEN_CSS_VAR_MAP) as (keyof ThemeTokens)[]).forEach((key) => {
    root.style.setProperty(TOKEN_CSS_VAR_MAP[key], tokens[key]);
  });
}
