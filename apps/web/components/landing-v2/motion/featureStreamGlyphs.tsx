import type { ReactNode } from 'react';
import {
  CheckSquare,
  Microphone,
  Note,
} from '@phosphor-icons/react';
import { CanvasIcon, GoogleIcon } from '@/components/icons/BrandIcons';

export type FeatureStreamGlyphKind = 'feature' | 'integration';

export interface FeatureStreamGlyph {
  kind: FeatureStreamGlyphKind;
  icon: ReactNode;
  bg: string;
  label: string;
}

export const INTEGRATION_STREAM_GLYPHS: FeatureStreamGlyph[] = [
  {
    kind: 'integration',
    icon: <GoogleIcon className="h-4 w-4" />,
    bg: 'bg-[var(--color-paper)]',
    label: 'Google Calendar',
  },
  {
    kind: 'integration',
    icon: <CanvasIcon className="h-4 w-4" />,
    bg: 'bg-[var(--color-paper)]',
    label: 'Canvas',
  },
];

export const FEATURE_STREAM_GLYPHS: FeatureStreamGlyph[] = [
  {
    kind: 'feature',
    icon: <Microphone size={14} weight="duotone" className="text-[var(--color-sage)]" />,
    bg: 'bg-[var(--color-sage-soft)]',
    label: 'Voice',
  },
  {
    kind: 'feature',
    icon: <Note size={14} weight="duotone" className="text-[var(--color-ink-soft)]" />,
    bg: 'bg-[var(--color-cream-2)]',
    label: 'Notes',
  },
  {
    kind: 'feature',
    icon: <CheckSquare size={14} weight="duotone" className="text-[var(--color-honey-deep)]" />,
    bg: 'bg-[var(--color-honey-soft)]',
    label: 'Tasks',
  },
];

/** @deprecated Use INTEGRATION_STREAM_GLYPHS + FEATURE_STREAM_GLYPHS */
export const FEATURE_STREAM_GLYPHS_LEGACY = [
  ...FEATURE_STREAM_GLYPHS,
  ...INTEGRATION_STREAM_GLYPHS,
];
