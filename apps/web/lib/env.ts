export function readRequiredEnv(
  env: Record<string, string | undefined>,
  key: string
) {
  const value = env[key];
  if (!value || value.trim().length === 0) {
    if (process.env.npm_lifecycle_event === 'build') {
      console.warn(`[build-warning] Missing required environment variable: ${key}`);
      return `dummy_${key}`;
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
