import type { ColorThemeId } from '@planevo/theme';

export const PUBLIC_APPEARANCE = {
  accent: 'amber',
  colorTheme: 'daylight',
} as const satisfies { accent: string; colorTheme: ColorThemeId };

export function isPublicAppRoute(pathname: string | null): boolean {
  return !pathname?.startsWith('/dashboard');
}
