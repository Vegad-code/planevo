'use client';

import { RouteError } from '@/components/layout/RouteError';

export default function CalendarError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Calendar unavailable"
      description="We could not load your calendar view."
    />
  );
}
