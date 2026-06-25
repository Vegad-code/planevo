const PRODUCTION_REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'ENCRYPTION_KEY',
] as const;

const PLACEHOLDER_PATTERNS = [
  /^placeholder/i,
  /^dummy_/i,
  /^sk-placeholder/i,
];

function isPlaceholder(value: string) {
  return PLACEHOLDER_PATTERNS.some((p) => p.test(value.trim()));
}

export function readRequiredEnv(
  env: Record<string, string | undefined>,
  key: string
) {
  const value = env[key];
  if (!value || value.trim().length === 0) {
    if (process.env.npm_lifecycle_event === 'build' && process.env.CI !== 'true') {
      console.warn(`[build-warning] Missing required environment variable: ${key}`);
      return `dummy_${key}`;
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }

  if (process.env.NODE_ENV === 'production' && isPlaceholder(value)) {
    throw new Error(`Invalid placeholder value for ${key} in production`);
  }

  return value;
}

export function assertProductionEnv(env: Record<string, string | undefined> = process.env) {
  if (process.env.NODE_ENV !== 'production') return;

  for (const key of PRODUCTION_REQUIRED) {
    readRequiredEnv(env, key);
  }
}
