'use server';
import { createClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/crypto';

export async function disconnectLinearAction(deleteData: boolean = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  if (deleteData) {
    // Delete all imported linear items
    await supabase.from('source_items').delete().eq('user_id', user.id).eq('provider', 'linear');
    await supabase.from('integration_sources').delete().eq('user_id', user.id);
  }

  // Delete the integration account
  await supabase.from('integration_accounts').delete().eq('user_id', user.id).eq('provider', 'linear');

  return { success: true };
}

export async function syncLinearAction(userId: string) {
  const supabase = await createClient();

  const { data: account } = await supabase
    .from('integration_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'linear')
    .maybeSingle();

  if (!account || !account.access_token_encrypted) {
    throw new Error('Linear account not connected');
  }

  const accessToken = decryptToken(account.access_token_encrypted);

  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: `
        query {
          viewer {
            assignedIssues(filter: { state: { type: { neq: "completed" } } }) {
              nodes {
                id
                identifier
                title
                description
                dueDate
                url
                state {
                  name
                  type
                }
                project {
                  name
                }
                team {
                  id
                }
              }
            }
          }
        }
      `
    })
  });

  const data = await res.json();
  if (data.errors) {
    throw new Error('Failed to fetch Linear issues');
  }

  let importedCount = 0;
  const issues = data.data.viewer.assignedIssues.nodes || [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectedTeams = (account.metadata as any)?.selected_teams;

  for (const issue of issues) {
    // Skip canceled/completed if we want, but the GraphQL filter already excludes completed
    if (issue.state.type === 'canceled') continue;

    // If user has configured specific teams, filter by them
    if (selectedTeams && Array.isArray(selectedTeams) && selectedTeams.length > 0) {
      if (!issue.team || !selectedTeams.includes(issue.team.id)) continue;
    }

    const externalId = issue.id;

    const sourceItemData = {
      user_id: userId,
      provider: 'linear',
      item_type: 'issue',
      external_id: externalId,
      title: `${issue.identifier}: ${issue.title}`,
      description: issue.description || '',
      url: issue.url,
      due_date: issue.dueDate ? new Date(issue.dueDate).toISOString() : null,
      raw_data: issue,
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
    provider: 'linear',
    account_id: account.id,
    status: 'success',
    items_created: importedCount,
    items_updated: 0,
    items_seen: importedCount
  });

  return importedCount;
}

export async function fetchLinearTeams(userId: string) {
  const supabase = await createClient();
  const { data: account } = await supabase
    .from('integration_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'linear')
    .maybeSingle();

  if (!account || !account.access_token_encrypted) {
    throw new Error('Linear account not connected');
  }

  const accessToken = decryptToken(account.access_token_encrypted);
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: `
        query {
          teams {
            nodes {
              id
              name
              key
            }
          }
        }
      `
    })
  });

  const data = await res.json();
  if (data.errors) {
    throw new Error('Failed to fetch Linear teams');
  }

  const teams = data.data.teams.nodes || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectedTeams = (account.metadata as any)?.selected_teams || [];

  return { teams, selectedTeams };
}

export async function saveLinearPreferences(userId: string, teamIds: string[]) {
  const supabase = await createClient();
  const { data: account } = await supabase
    .from('integration_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'linear')
    .maybeSingle();

  if (!account) throw new Error('Account not found');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metadata: any = account.metadata || {};
  metadata.selected_teams = teamIds;

  await supabase
    .from('integration_accounts')
    .update({ metadata })
    .eq('id', account.id);

  return { success: true };
}
