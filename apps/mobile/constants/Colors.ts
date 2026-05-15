/**
 * Plan Pilot — Forest Green Design System
 * Matches the web app's "Immersive Minimalist" aesthetic from globals.css
 */

const brand = {
  50: '#f4f6f2',
  100: '#e9ede5',
  200: '#d3dbcb',
  300: '#a7c091',
  400: '#82a56f',
  500: '#5d8a66',
  600: '#4a6e52',
  700: '#3b5842',
  800: '#2d4332',
  900: '#223326',
};

const accent = {
  50: '#f9f7f4',
  100: '#f2ede9',
  200: '#e5dbd3',
  300: '#d8c9bc',
  400: '#cbb7a6',
  500: '#c8b38c',
  600: '#b19e7c',
  700: '#9a8a6c',
};

const surface = {
  50: '#fbfbfb',
  100: '#f8f9f5',
  200: '#e9ede5',
  300: '#d3dbcb',
  400: '#949a8e',
  500: '#626570',
  600: '#4a4d55',
  700: '#3a3d45',
  800: '#2c2e35',
  900: '#1a1b1e',
};

export const Colors = {
  brand,
  accent,
  surface,
  success: '#5d8a66',
  warning: '#c8b38c',
  error: '#a34e35',
  info: '#5a7582',
  light: {
    text: surface[800],
    textSecondary: surface[500],
    textMuted: surface[400],
    background: surface[100],
    card: '#ffffff',
    cardBorder: surface[200],
    tint: brand[500],
    tabIconDefault: surface[400],
    tabIconSelected: brand[600],
    tabBar: '#ffffff',
    tabBarBorder: surface[200],
    separator: surface[200],
    inputBackground: '#ffffff',
    inputBorder: surface[300],
  },
  dark: {
    text: '#f8f9f5',
    textSecondary: '#bec3cc',
    textMuted: '#8a8e99',
    background: '#1a1b1e',
    card: '#2c2e35',
    cardBorder: '#3a3d45',
    tint: '#a7c091',
    tabIconDefault: '#8a8e99',
    tabIconSelected: '#a7c091',
    tabBar: '#2c2e35',
    tabBarBorder: '#3a3d45',
    separator: '#3a3d45',
    inputBackground: '#2c2e35',
    inputBorder: '#3a3d45',
  },
};

export default Colors;
