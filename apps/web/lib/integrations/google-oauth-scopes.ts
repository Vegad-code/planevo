/** Scopes requested when connecting Google Calendar (read + write events). */
export const GOOGLE_CALENDAR_OAUTH_SCOPES =
  'https://www.googleapis.com/auth/calendar.events' as const;

export const GOOGLE_CALENDAR_WRITE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
] as const;

export function googleScopesIncludeWrite(scopes: string[] | null | undefined): boolean {
  if (!scopes?.length) return false;
  return scopes.some((scope) =>
    (GOOGLE_CALENDAR_WRITE_SCOPES as readonly string[]).includes(scope)
  );
}

export async function fetchGoogleTokenScopes(accessToken: string): Promise<string[]> {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
  );
  if (!response.ok) return [];

  const data = (await response.json()) as { scope?: string };
  if (!data.scope) return [];
  return data.scope.split(' ').filter(Boolean);
}
