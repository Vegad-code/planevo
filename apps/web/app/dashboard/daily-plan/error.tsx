'use client';

import { RouteError } from '@/components/layout/RouteError';

export default function DailyPlanError({
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
      title="Daily plan unavailable"
      description="We could not load your daily plan."
    />
  );
}
