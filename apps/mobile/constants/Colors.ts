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
    tint: brand[400],
    tabIconDefault: surface[400],
    tabIconSelected: brand[500],
    tabBar: '#FFFFFF',
    tabBarBorder: surface[300],
    separator: surface[300],
    inputBackground: '#FFFFFF',
    inputBorder: surface[300],
  },
  dark: {
    text: '#F7EFE1',
    textSecondary: '#CBB89E',
    textMuted: '#9B8A70',
    background: '#16110C',
    card: '#221B14',
    cardBorder: '#352A1D',
    tint: brand[300],
    tabIconDefault: '#9B8A70',
    tabIconSelected: brand[300],
    tabBar: '#1B150E',
    tabBarBorder: '#352A1D',
    separator: '#352A1D',
    inputBackground: '#221B14',
    inputBorder: '#352A1D',
  },
};

export default Colors;
