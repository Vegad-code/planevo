'use server';

import { createClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/crypto';
import { Client } from '@notionhq/client';

export async function disconnectNotionAction(deleteData: boolean = false) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }
  const userId = user.id;

  if (deleteData) {
    // Delete all imported tasks/items associated with Notion
    await supabase.from('source_items').delete().eq('user_id', userId).eq('provider', 'notion');
    // Note: If you want to delete actual tasks from the `tasks` table, you need to handle that,
    // but source_items has an ON DELETE SET NULL for imported_task_id so the task remains,
    // unless we explicitly delete the task. For now we just clean up source_items.
    // If we wanted to delete tasks, we'd query source_items first and delete tasks.id IN (...)
  }

  // Set account to disconnected and remove the token
  await supabase.from('integration_accounts')
    .update({ status: 'disconnected', access_token_encrypted: null })
    .eq('user_id', userId)
    .eq('provider', 'notion');

  return { success: true };
}

export async function fetchNotionDatabases(userId: string) {
  const supabase = await createClient();

  const { data: account } = await supabase
    .from('integration_accounts')
    .select('id, access_token_encrypted')
    .eq('user_id', userId)
    .eq('provider', 'notion')
    .eq('status', 'connected')
    .maybeSingle();

  if (!account?.access_token_encrypted) {
    throw new Error('Notion not connected or token missing');
  }

  const accessToken = decryptToken(account.access_token_encrypted);
  const notion = new Client({ auth: accessToken });

  // Notion search endpoint to find all databases the bot has access to
  const response = await notion.search({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notionDatabases = response.results.filter((res: any) => res.object === 'database');

  // Get currently selected databases from integration_sources
  const { data: sources } = await supabase
    .from('integration_sources')
    .select('external_id')
    .eq('account_id', account.id)
    .eq('sync_enabled', true);

  const selectedIds = sources?.map(s => s.external_id) || [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const databases = notionDatabases.map((db: any) => ({
    id: db.id,
    title: db.title?.[0]?.plain_text || 'Untitled Database',
    selected: selectedIds.includes(db.id),
  }));

  return databases;
}

export async function saveNotionDatabases(userId: string, databaseIds: string[]) {
  const supabase = await createClient();

  const { data: account } = await supabase
    .from('integration_accounts')
    .select('id, access_token_encrypted')
    .eq('user_id', userId)
    .eq('provider', 'notion')
    .maybeSingle();

  if (!account?.id) throw new Error('Notion account not found');

  const accessToken = decryptToken(account.access_token_encrypted!);
  const notion = new Client({ auth: accessToken });

  // Delete existing sources for Notion
  await supabase.from('integration_sources')
    .delete()
    .eq('account_id', account.id);

  if (databaseIds.length === 0) {
    return { success: true };
  }

  // Fetch details to get names
  const newSources = [];
  for (const dbId of databaseIds) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dbInfo: any = await notion.databases.retrieve({ database_id: dbId });
      newSources.push({
        account_id: account.id,
        user_id: userId,
        source_type: 'database',
        external_id: dbId,
        name: dbInfo.title?.[0]?.plain_text || 'Untitled Database',
        sync_enabled: true
      });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      console.warn('Could not retrieve Notion db details for', dbId);
    }
  }

  if (newSources.length > 0) {
    const { error } = await supabase.from('integration_sources').insert(newSources);
    if (error) throw error;
  }

  return { success: true };
}

export async function syncNotionAction(userId: string) {
  const supabase = await createClient();

  // 1. Get the account and token
  const { data: account } = await supabase
    .from('integration_accounts')
    .select('id, access_token_encrypted')
    .eq('user_id', userId)
    .eq('provider', 'notion')
    .eq('status', 'connected')
    .maybeSingle();

  if (!account?.access_token_encrypted) {
    throw new Error('Notion not connected');
  }

  const accountId = account.id;

  // Create sync run
  const { data: syncRun } = await supabase.from('integration_sync_runs').insert({
    user_id: userId,
    account_id: accountId,
    provider: 'notion',
    status: 'running'
  }).select('id').single();

  const syncRunId = syncRun?.id;

  try {
    const accessToken = decryptToken(account.access_token_encrypted);
    const notion = new Client({ auth: accessToken });

    // 2. Determine which databases to sync
    const { data: sources } = await supabase
      .from('integration_sources')
      .select('id, external_id')
      .eq('account_id', accountId)
      .eq('source_type', 'database')
      .eq('sync_enabled', true);

    const databasesToSync = sources || [];

    if (databasesToSync.length === 0) {
      await supabase.from('integration_accounts').update({ last_synced_at: new Date().toISOString() }).eq('id', accountId);
      if (syncRunId) await supabase.from('integration_sync_runs').update({ status: 'success', finished_at: new Date().toISOString() }).eq('id', syncRunId);
      return 0;
    }

    let itemsCreated = 0;
    let itemsUpdated = 0;
    let totalSeen = 0;

    for (const source of databasesToSync) {
      const dbId = source.external_id;

      // Query Notion database
      // Filter by incomplete items if possible, or just recent ones.
      // Since Notion database schemas vary wildly, we just grab everything recently modified for now,
      // or we can just grab all (Notion paginates).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (notion.databases as any).query({
        database_id: dbId,
        page_size: 100,
        sorts: [
          {
            timestamp: 'last_edited_time',
            direction: 'descending'
          }
        ]
      });

      totalSeen += response.results.length;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const itemsToUpsert = response.results.map((page: any) => {
        // Try to extract a title from properties
        let title = 'Untitled';
        let dueDate = null;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
        for (const [key, prop] of Object.entries(page.properties) as any) {
          if (prop.type === 'title' && prop.title?.length > 0) {
            title = prop.title[0].plain_text;
          }
          if (prop.type === 'date' && prop.date?.start) {
            dueDate = prop.date.start;
          }
        }

        return {
          user_id: userId,
          provider: 'notion',
          source_id: source.id,
          external_id: page.id,
          item_type: 'assignment', // Or 'issue' / 'task' depending on what we want to map it to
          title: title,
          url: page.url,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          raw_data: page,
        };
      });

      for (const item of itemsToUpsert) {
        // Check if exists
        const { data: existing } = await supabase
          .from('source_items')
          .select('id, updated_at')
          .eq('user_id', userId)
          .eq('provider', 'notion')
          .eq('external_id', item.external_id)
          .maybeSingle();

        if (existing) {
          await supabase.from('source_items').update(item).eq('id', existing.id);
          itemsUpdated++;
        } else {
          await supabase.from('source_items').insert(item);
          itemsCreated++;
        }
      }
    }

    // Record successful sync
    const now = new Date().toISOString();
    await supabase.from('integration_accounts').update({ last_synced_at: now, status: 'connected', last_error: null }).eq('id', accountId);

    if (syncRunId) {
      await supabase.from('integration_sync_runs').update({
        status: 'success',
        finished_at: now,
        items_seen: totalSeen,
        items_created: itemsCreated,
        items_updated: itemsUpdated
      }).eq('id', syncRunId);
    }

    return totalSeen;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error('Notion sync error:', err);
    if (syncRunId) {
      await supabase.from('integration_sync_runs').update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_message: err.message
      }).eq('id', syncRunId);
    }
    await supabase.from('integration_accounts').update({ status: 'error', last_error: err.message }).eq('id', accountId);
    throw err;
  }
}
