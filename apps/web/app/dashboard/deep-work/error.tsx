'use client';

import { RouteError } from '@/components/layout/RouteError';

export default function DeepWorkError({
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
      title="Deep work unavailable"
      description="We could not load your focus session."
    />
  );
}
