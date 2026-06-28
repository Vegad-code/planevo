export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  // Turbopack dev cannot bundle @opentelemetry/resources for edge instrumentation.
  // Edge Sentry is enabled in production when a DSN is configured.
  if (
    process.env.NEXT_RUNTIME === 'edge' &&
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PUBLIC_SENTRY_DSN
  ) {
    await import('./sentry.edge.config');
  }
}
