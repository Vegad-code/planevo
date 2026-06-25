'use client';

import { RouteError } from '@/components/layout/RouteError';

export default function SettingsError({
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
      title="Settings unavailable"
      description="We could not load your settings."
    />
  );
}
