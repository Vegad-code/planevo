import type { Icon } from '@phosphor-icons/react';
import { BrunoBrainIcon } from '@/components/icons/BrunoBrainIcon';
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
  SquaresFour,
  Waveform,
} from '@phosphor-icons/react';

type CustomNavIcon = typeof BrunoBrainIcon;

/** Client-side icon map for marketing nav dropdowns */
export const NAV_ICONS = {
  SquaresFour,
  Command,
  CalendarDots,
  ListChecks,
  Notebook,
  BrunoBrain: BrunoBrainIcon,
  CurrencyCircleDollar,
  Question,
  Waveform,
  Info,
  Cookie,
  ShieldCheck,
  Scales,
} as const satisfies Record<string, Icon | CustomNavIcon>;

export type NavIconKey = keyof typeof NAV_ICONS;
