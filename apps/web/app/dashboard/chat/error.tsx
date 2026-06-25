'use client';

import { RouteError } from '@/components/layout/RouteError';

export default function ChatError({
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
      title="Bruno chat unavailable"
      description="We could not load your Bruno conversation."
    />
  );
}
