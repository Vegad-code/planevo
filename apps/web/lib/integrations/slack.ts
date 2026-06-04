'use server';
import { createClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/crypto';

export async function disconnectSlackAction(deleteData: boolean = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  if (deleteData) {
    // Delete all imported slack items
    await supabase.from('source_items').delete().eq('user_id', user.id).eq('provider', 'slack');
    await supabase.from('integration_sources').delete().eq('user_id', user.id);
  }

  // Delete the integration account
  await supabase.from('integration_accounts').delete().eq('user_id', user.id).eq('provider', 'slack');

  return { success: true };
}

export async function syncSlackAction(userId: string) {
  const supabase = await createClient();

  const { data: account } = await supabase
    .from('integration_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'slack')
    .maybeSingle();

  if (!account || !account.access_token_encrypted) {
    throw new Error('Slack account not connected');
  }

  const accessToken = decryptToken(account.access_token_encrypted);

  const res = await fetch('https://slack.com/api/stars.list', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    }
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error || 'Failed to fetch Slack saved items');
  }

  let importedCount = 0;

  for (const item of data.items) {
    if (item.type !== 'message') continue;

    const msg = item.message;
    const channelId = item.channel;
    const externalId = `${channelId}-${msg.ts}`;
    const text = msg.text || 'Saved Message';
    const author = msg.user || 'Unknown User';

    // Slack messages don't have a due date usually, but it's a task if we imported it

    const sourceItemData = {
      user_id: userId,
      provider: 'slack',
      item_type: 'message',
      external_id: externalId,
      title: `Message from ${author}`,
      description: text,
      url: msg.permalink,
      raw_data: item,
      updated_at: new Date().toISOString()
    };

    await supabase.from('source_items').upsert(sourceItemData, {
      onConflict: 'user_id,provider,external_id'
    });
    importedCount++;
  }

  // Update sync timestamp
  await supabase.from('integration_accounts')
    .update({
      last_synced_at: new Date().toISOString(),
      status: 'connected',
      last_error: null
    })
    .eq('id', account.id);

  // Add a sync run log
  await supabase.from('integration_sync_runs').insert({
    user_id: userId,
    provider: 'slack',
    account_id: account.id,
    status: 'success',
    items_created: importedCount,
    items_updated: 0,
    items_seen: importedCount
  });

  return importedCount;
}
