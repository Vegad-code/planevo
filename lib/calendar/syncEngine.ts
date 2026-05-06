import { createClient } from '@/lib/supabase/server';
import { fetchCanvasUpcoming } from '@/lib/canvas';
import { syncGoogleCalendar } from '@/lib/integrations/google-calendar';

export async function syncCanvasEvents(userId: string) {
  const supabase = await createClient();

  // 1. Get user canvas credentials
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('canvas_token, canvas_url')
    .eq('id', userId)
    .single();

  if (userError || !user?.canvas_token || !user?.canvas_url) {
    throw new Error('User not connected to Canvas');
  }

  // 2. Fetch assignments
  const assignments = await fetchCanvasUpcoming(user.canvas_url, user.canvas_token);
  if (!assignments || assignments.length === 0) return 0;

  // 3. Transform to calendar_events format
  // We'll treat assignments as 1-hour events ending at their due date.
  const events = assignments.map((item) => {
    const end = new Date(item.due_at);
    const start = new Date(end.getTime() - 60 * 60 * 1000); // 1 hour before due

    return {
      user_id: userId,
      title: item.name,
      description: item.description || null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      is_all_day: false,
      source: 'canvas',
      external_id: item.id.toString(),
      location: item.html_url || null,
      is_completed: false,
      is_deleted: false,
    };
  });

  // 4. Clean future canvas events and re-insert
  const now = new Date().toISOString();
  await supabase
    .from('calendar_events')
    .delete()
    .eq('user_id', userId)
    .eq('source', 'canvas')
    .gte('start_time', now);

  const futureEvents = events.filter((e) => new Date(e.start_time) >= new Date(now));

  if (futureEvents.length > 0) {
    const { error: insertError } = await supabase
      .from('calendar_events')
      .insert(futureEvents);

    if (insertError) throw insertError;
  }

  return futureEvents.length;
}

export async function processOllieRollover(userId: string) {
  const supabase = await createClient();
  const now = new Date();
  
  // Find past uncompleted events
  const { data: pastEvents, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .eq('is_completed', false)
    .eq('is_deleted', false)
    .lt('end_time', now.toISOString());

  if (error || !pastEvents || pastEvents.length === 0) return 0;

  // We move them to today, starting from current time


  // Let's just update the existing events
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
    results.rollover = await processOllieRollover(userId);
  } catch (err: unknown) {
    results.errors.push(`Rollover: ${err instanceof Error ? err.message : String(err)}`);
  }

  return results;
}
