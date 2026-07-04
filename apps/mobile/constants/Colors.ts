/**
 * Planevo — Honey & Cream Design System
 * Matches the web app's warm "Bruno" aesthetic (globals.css).
 * `brand` = the honey accent · `surface` = cream paper neutrals.
 */

const brand = {
  50: '#FBF4E6',
  100: '#F5E2C2',
  200: '#EECB97',
  300: '#E0A861',
  400: '#D08741',
  500: '#B96E2A',
  600: '#9C591F',
  700: '#7E4719',
  800: '#5F3512',
  900: '#42250C',
};

const accent = {
  50: '#FBF6EA',
  100: '#F2E8D2',
  200: '#E8DCC0',
  300: '#E0CBA0',
  400: '#D3B583',
  500: '#C99A5F',
  600: '#A87E47',
  700: '#856232',
};

const surface = {
  50: '#FFFFFF',
  100: '#FBF6EA',
  200: '#F2E8D2',
  300: '#E6DCCE',
  400: '#B8A88E',
  500: '#8A7B66',
  600: '#5C503F',
  700: '#42392C',
  800: '#2A2118',
  900: '#1A140D',
};

/** Accent schemes — mirror the web Appearance accents. */
export const ACCENTS = {
  honey: { id: 'honey', name: 'Honey', primary: '#D08741', deep: '#B96E2A', soft: '#F5DCB8' },
  terracotta: { id: 'terracotta', name: 'Terracotta', primary: '#C9663B', deep: '#A84E28', soft: '#F3D7C5' },
  amber: { id: 'amber', name: 'Amber', primary: '#DDA02C', deep: '#BC8216', soft: '#F7E6BE' },
  rosewood: { id: 'rosewood', name: 'Rosewood', primary: '#C2675C', deep: '#9E4D44', soft: '#F4D8D2' },
  sage: { id: 'sage', name: 'Sage', primary: '#6F9266', deep: '#557049', soft: '#DCE7D5' },
  ocean: { id: 'ocean', name: 'Ocean', primary: '#3E8194', deep: '#2C6072', soft: '#CDE3E8' },
  plum: { id: 'plum', name: 'Plum', primary: '#9A5F84', deep: '#784765', soft: '#ECDCE7' },
} as const;

export type AccentId = keyof typeof ACCENTS;
export const ACCENT_LIST = Object.values(ACCENTS);

export const Colors = {
  brand,
  accent,
  surface,
  success: '#6F9266',
  warning: '#DDA02C',
  error: '#C2675C',
  info: '#3E8194',
  light: {
    text: surface[800],
    textSecondary: surface[600],
    textMuted: surface[500],
    background: surface[100],
    card: '#FFFFFF',
    cardBorder: surface[300],
    border: surface[300],
    glass: 'rgba(243,228,201,0.72)',
    tint: brand[400],
    tabIconDefault: surface[400],
    tabIconSelected: brand[500],
    tabBar: '#FFFFFF',
    tabBarBorder: surface[300],
    separator: surface[300],
    border: surface[300],
    glass: 'rgba(243,228,201,0.72)',
    inputBackground: '#FFFFFF',
    inputBorder: surface[300],
  },
  dark: {
    text: '#FAFAFA',
    textSecondary: '#E4E4E7',
    textMuted: '#A1A1AA',
    background: '#09090B',
    card: '#121214',
    cardBorder: '#27272A',
    border: '#27272A',
    glass: 'rgba(60,61,55,0.55)',
    tint: brand[300],
    tabIconDefault: '#71717A',
    tabIconSelected: brand[300],
    tabBar: '#09090B',
    tabBarBorder: '#27272A',
    separator: '#27272A',
    border: '#27272A',
    glass: 'rgba(60,61,55,0.55)',
    inputBackground: '#121214',
    inputBorder: '#27272A',
  },
  v4: {
    accentWarm: brand[400],
    accentCream: surface[50],
  },
};

export default Colors;

/** Notes card accent palette — matches web globals.css */
export const NOTE_ACCENTS = {
  yellow: '#F7D44C',
  coral: '#EB7A53',
  sky: '#98B7DB',
  green: '#A8D672',
  cream: '#F6ECC9',
} as const;
