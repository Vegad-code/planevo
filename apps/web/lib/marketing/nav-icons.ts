import type { Icon } from '@phosphor-icons/react';
import {
  CalendarDots,
  Command,
  Cookie,
  CurrencyCircleDollar,
  Info,
  ListChecks,
  Notebook,
  Question,
  Scales,
  ShieldCheck,
  Sparkle,
  SquaresFour,
  Waveform,
} from '@phosphor-icons/react';

/** Client-side Phosphor icon map for marketing nav dropdowns */
export const NAV_ICONS = {
  SquaresFour,
  Command,
  CalendarDots,
  ListChecks,
  Notebook,
  Sparkle,
  CurrencyCircleDollar,
  Question,
  Waveform,
  Info,
  Cookie,
  ShieldCheck,
  Scales,
} as const satisfies Record<string, Icon>;

export type NavIconKey = keyof typeof NAV_ICONS;
