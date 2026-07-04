import { syncGoogleCalendar } from '@/lib/integrations/google-calendar';
import { syncCanvasEvents } from '@/lib/calendar/syncEngine';

export interface SourceSyncResult {
  google: number;
  canvas: number;
  errors: string[];
}

/**
 * Background sync of Canvas + Google Calendar before autopilot plan generation.
 * Failures are non-fatal — planning proceeds with whatever data is in the DB.
 */
export async function syncSourcesForUser(userId: string): Promise<SourceSyncResult> {
  const result: SourceSyncResult = { google: 0, canvas: 0, errors: [] };

  try {
    const googleSync = await syncGoogleCalendar(userId);
    result.google = googleSync.count;
    if (googleSync.partial) {
      result.errors.push(...googleSync.warnings.map((w) => `Google: ${w}`));
    }
  } catch (err) {
    result.errors.push(`Google: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    result.canvas = await syncCanvasEvents(userId);
  } catch (err) {
    result.errors.push(`Canvas: ${err instanceof Error ? err.message : String(err)}`);
  }

  return result;
}
