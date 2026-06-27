import { fetchCanvasUpcoming } from '@/lib/canvas';
import { syncGoogleCalendar } from '@/lib/integrations/google-calendar';
import { getIntegrationAccount } from '@/lib/integrations/accounts';
import { decryptToken } from '@/lib/crypto';
import { createClient } from '@/lib/supabase/server';

export async function syncCanvasEvents(userId: string) {
  const account = await getIntegrationAccount(userId, 'canvas');
  const canvasUrl = (account?.metadata as { canvas_url?: string } | null)?.canvas_url;
  const encryptedToken = account?.access_token_encrypted;

  if (!encryptedToken || !canvasUrl) {
    throw new Error('User not connected to Canvas');
  }

  const decryptedToken = decryptToken(encryptedToken);
  const assignments = await fetchCanvasUpcoming(canvasUrl, decryptedToken);
  if (!assignments || assignments.length === 0) return 0;

  const supabase = await createClient();
  const now = new Date();
  const nowIso = now.toISOString();

  const events = assignments
    .filter((item) => item.due_at)
    .map((item) => {
      const end = new Date(item.due_at);
      const start = new Date(end.getTime() - 60 * 60 * 1000);

      return {
        user_id: userId,
        title: item.name,
        description: item.description || null,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        is_all_day: false,
        source: 'canvas' as const,
        external_id: item.id.toString(),
        location: item.html_url || null,
        is_completed: false,
        is_deleted: false,
      };
    });

  const futureEvents = events.filter((e) => new Date(e.start_time) >= now);

  if (futureEvents.length > 0) {
    const { error: upsertError } = await supabase.from('calendar_events').upsert(futureEvents, {
      onConflict: 'user_id,source,external_id',
    });
    if (upsertError) throw upsertError;
  }

  const syncedExternalIds = futureEvents.map((e) => e.external_id);
  let staleQuery = supabase
    .from('calendar_events')
    .update({ is_deleted: true })
    .eq('user_id', userId)
    .eq('source', 'canvas')
    .eq('is_deleted', false)
    .gte('start_time', nowIso);

  if (syncedExternalIds.length > 0) {
    staleQuery = staleQuery.not('external_id', 'in', `(${syncedExternalIds.join(',')})`);
  }

  const { error: staleError } = await staleQuery;
  if (staleError) throw staleError;

  return futureEvents.length;
}

export async function processBrunoRollover(userId: string) {
  const supabase = await createClient();
  const now = new Date();

  const { data: pastEvents, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .eq('is_completed', false)
    .eq('is_deleted', false)
    .neq('source', 'google_calendar')
    .lt('end_time', now.toISOString());

  if (error || !pastEvents || pastEvents.length === 0) return 0;

  let updatedCount = 0;
  for (const event of pastEvents) {
    const start = new Date(now.getTime() + updatedCount * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const { error: updateError } = await supabase
      .from('calendar_events')
      .update({
        source: 'rollover',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', event.id);

    if (!updateError) {
      updatedCount++;
    }
  }

  return updatedCount;
}

export async function runFullSync(userId: string) {
  const results = {
    google: 0,
    canvas: 0,
    rollover: 0,
    errors: [] as string[],
  };

  try {
    results.google = await syncGoogleCalendar(userId);
  } catch (err: unknown) {
    results.errors.push(`Google Sync: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    results.canvas = await syncCanvasEvents(userId);
  } catch (err: unknown) {
    results.errors.push(`Canvas Sync: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    results.rollover = await processBrunoRollover(userId);
  } catch (err: unknown) {
    results.errors.push(`Rollover: ${err instanceof Error ? err.message : String(err)}`);
  }

  return results;
}
