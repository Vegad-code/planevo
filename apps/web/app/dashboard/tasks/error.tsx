'use client';

import { RouteError } from '@/components/layout/RouteError';

export default function TasksError({
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
      title="Tasks unavailable"
      description="We could not load your task list."
    />
  );
}
