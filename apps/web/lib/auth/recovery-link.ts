export function buildRecoveryCallbackUrl(origin: string, hashedToken: string) {
  const url = new URL(`${origin.replace(/\/$/, '')}/auth/callback`);
  url.searchParams.set('token_hash', hashedToken);
  url.searchParams.set('type', 'recovery');
  url.searchParams.set('next', '/reset-password');
  return url.toString();
}
