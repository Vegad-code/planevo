import { supabaseAdmin } from '@/lib/supabase/admin';

export type IntegrationProvider =
  | 'canvas'
  | 'google_calendar'
  | 'notion'
  | 'slack'
  | 'linear';

export interface IntegrationAccountCredentials {
  id: string;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  metadata: Record<string, unknown> | null;
  status: string;
  last_synced_at: string | null;
}

export async function getIntegrationAccount(
  userId: string,
  provider: IntegrationProvider
): Promise<IntegrationAccountCredentials | null> {
  const { data, error } = await supabaseAdmin
    .from('integration_accounts')
    .select('id, access_token_encrypted, refresh_token_encrypted, metadata, status, last_synced_at')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle();

  if (error) throw error;
  return data as IntegrationAccountCredentials | null;
}

export async function isIntegrationConnected(
  userId: string,
  provider: IntegrationProvider
): Promise<boolean> {
  const account = await getIntegrationAccount(userId, provider);
  return account?.status === 'connected';
}

interface UpsertIntegrationAccountInput {
  userId: string;
  provider: IntegrationProvider;
  accessTokenEncrypted?: string | null;
  refreshTokenEncrypted?: string | null;
  metadata?: Record<string, unknown> | null;
  status?: 'connected' | 'disconnected' | 'error';
  lastSyncedAt?: string | null;
}

export async function upsertIntegrationAccount(
  input: UpsertIntegrationAccountInput
): Promise<string> {
  const {
    userId,
    provider,
    accessTokenEncrypted,
    refreshTokenEncrypted,
    metadata,
    status = 'connected',
    lastSyncedAt,
  } = input;

  const existing = await getIntegrationAccount(userId, provider);

  const row: Record<string, unknown> = { status };
  if (accessTokenEncrypted !== undefined) row.access_token_encrypted = accessTokenEncrypted;
  if (refreshTokenEncrypted !== undefined) row.refresh_token_encrypted = refreshTokenEncrypted;
  if (metadata !== undefined) row.metadata = metadata;
  if (lastSyncedAt !== undefined) row.last_synced_at = lastSyncedAt;

  if (existing) {
    const { error } = await supabaseAdmin
      .from('integration_accounts')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(row as any)
      .eq('id', existing.id)
      .eq('user_id', userId);
    if (error) throw error;
    return existing.id;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertRow: any = {
    user_id: userId,
    provider,
    ...row,
  };

  const { data, error } = await supabaseAdmin
    .from('integration_accounts')
    .insert(insertRow)
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export function isProviderConnectedFromPublicRows(
  accounts: Array<{ provider: string; status: string }>,
  provider: IntegrationProvider
): boolean {
  return accounts.some((a) => a.provider === provider && a.status === 'connected');
}
