import type { ColorThemeId } from '@planevo/theme';
import {
  applyColorThemeToDocument,
  clearColorThemeInlineStyles,
} from '@/lib/appearance/apply-color-theme';
import { isPublicAppRoute, PUBLIC_APPEARANCE } from '@/lib/appearance/public-route';

export function syncDomAppearance({
  pathname,
  accent,
  colorTheme,
  isDark,
}: {
  pathname: string | null;
  accent: string;
  colorTheme: ColorThemeId;
  isDark: boolean;
}) {
  if (typeof document === 'undefined') return;

  if (isPublicAppRoute(pathname)) {
    document.documentElement.setAttribute('data-public', 'true');
    document.documentElement.setAttribute('data-accent', PUBLIC_APPEARANCE.accent);
    document.documentElement.setAttribute('data-color-theme', PUBLIC_APPEARANCE.colorTheme);
    // Do not apply dashboard daylight tokens on public routes — they set inline
    // --color-paper: #FFFFFF on <html>, overriding the Wispr cream (#FFFFEB) palette.
    clearColorThemeInlineStyles();
  } else {
    document.documentElement.removeAttribute('data-public');
    document.documentElement.setAttribute('data-accent', accent);
    applyColorThemeToDocument(colorTheme, isDark);
  }
}
