/**
 * Canonical plan types for Planevo.
 * Shared between server and client code — no server imports.
 */
export type PlanType = 'free' | 'trialing' | 'premium' | 'student' | 'canceled' | 'admin';

/** Canonical plan mapping — normalizes legacy values to canonical types */
export function normalizePlanType(raw: string | null | undefined): PlanType {
  switch (raw) {
    case 'premium':
    case 'pro':
    case 'pro_monthly':
    case 'pro_annual':
    case 'team':
    case 'elite':
      return 'premium';
    case 'trialing':
      return 'trialing';
    case 'canceled':
      return 'canceled';
    case 'admin':
      return 'admin';
    case 'student':
      return 'student';
    case 'free':
    default:
      return 'free';
  }
}
