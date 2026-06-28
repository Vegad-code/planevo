export const COLOR_THEME_IDS = [
  'classic',
  'forest-olive',
  'aurora',
  'taupe-slate',
  'ember',
  'navy-crimson',
  'coastal-blue',
  'soft-coral',
  'crimson',
  'sunset',
] as const;

export type ColorThemeId = (typeof COLOR_THEME_IDS)[number];

/** Semantic tokens mirrored from web globals.css CSS variables. */
export interface ThemeTokens {
  surfaceBase: string;
  surfaceRaised: string;
  surfaceMuted: string;
  textPrimary: string;
  accentWarm: string;
  accentCream: string;
  accentSage: string;
  accentDepth: string;
  cream: string;
  cream2: string;
  paper: string;
  ink: string;
  ink2: string;
  inkSoft: string;
  inkFaint: string;
  bruno: string;
  brunoDeep: string;
  brunoLight: string;
  brunoInk: string;
  belly: string;
  honey: string;
  honeyDeep: string;
  honeySoft: string;
  sage: string;
  sageSoft: string;
  line: string;
  lineStrong: string;
  glassBg: string;
  glassBorder: string;
  glassShadow: string;
  glassCardBg: string;
  settingsBg: string;
  settingsCard: string;
  settingsCardHover: string;
  settingsBorder: string;
  settingsText: string;
  settingsTextMuted: string;
  settingsBrand: string;
  sidebarBg: string;
  sidebarText: string;
  focus: string;
  focusSoft: string;
}

export interface ColorTheme {
  id: ColorThemeId;
  name: string;
  /** Four palette swatches, darkest → lightest (for picker preview). */
  swatches: [string, string, string, string];
  light: ThemeTokens;
  dark: ThemeTokens;
}
