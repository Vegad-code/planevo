import type { ColorThemeId } from '@planevo/theme';

export const PUBLIC_APPEARANCE = {
  accent: 'honey',
  colorTheme: 'classic',
} as const satisfies { accent: string; colorTheme: ColorThemeId };

export function isPublicAppRoute(pathname: string | null): boolean {
  return !pathname?.startsWith('/dashboard');
}
