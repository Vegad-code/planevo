/**
 * Owner / admin email allowlist from environment (comma-separated).
 * Replaces hardcoded OWNER_EMAIL in source.
 */
export function getOwnerEmails(): string[] {
  const raw =
    process.env.PLANEVO_OWNER_EMAILS ||
    process.env.BRUNO_ADMIN_EMAILS ||
    '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return getOwnerEmails().includes(normalized);
}
