import type { ColorThemeId } from '@planevo/theme';
import { applyColorThemeToDocument } from '@/lib/appearance/apply-color-theme';
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
    applyColorThemeToDocument(PUBLIC_APPEARANCE.colorTheme, false);
  } else {
    document.documentElement.removeAttribute('data-public');
    document.documentElement.setAttribute('data-accent', accent);
    applyColorThemeToDocument(colorTheme, isDark);
  }
}
