'use client';

import CalendarComposerShell from './CalendarComposerShell';
import type { CalendarComposerContentProps } from './CalendarComposerContent';

export type CalendarComposerProps = CalendarComposerContentProps;

export default function CalendarComposer(props: CalendarComposerProps) {
  return <CalendarComposerShell {...props} />;
}
