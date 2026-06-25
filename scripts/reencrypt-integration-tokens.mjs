#!/usr/bin/env node
/**
 * One-off maintenance: encrypt any legacy plaintext integration tokens.
 *
 * Usage (from planevo/):
 *   ENCRYPTION_KEY=... SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node scripts/reencrypt-integration-tokens.mjs [--dry-run]
 */
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const dryRun = process.argv.includes('--dry-run');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const keyHex = process.env.ENCRYPTION_KEY;

if (!supabaseUrl || !serviceKey || !keyHex) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or ENCRYPTION_KEY');
  process.exit(1);
}

const key = Buffer.from(keyHex, 'hex');
if (key.length !== 32) {
  console.error('ENCRYPTION_KEY must be a 32-byte hex string');
  process.exit(1);
}

function isEncrypted(value) {
  if (!value) return true;
  const parts = value.split(':');
  return parts.length === 3 && parts.every((p) => /^[0-9a-f]+$/i.test(p));
}

function encryptToken(token) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const stats = { scanned: 0, accessReencrypted: 0, refreshReencrypted: 0, skipped: 0 };

const { data: rows, error } = await supabase
  .from('integration_accounts')
  .select('id, provider, access_token_encrypted, refresh_token_encrypted');

if (error) {
  console.error('Failed to load integration_accounts:', error.message);
  process.exit(1);
}

for (const row of rows ?? []) {
  stats.scanned += 1;
  const updates = {};

  if (row.access_token_encrypted && !isEncrypted(row.access_token_encrypted)) {
    updates.access_token_encrypted = encryptToken(row.access_token_encrypted);
    stats.accessReencrypted += 1;
  }
  if (row.refresh_token_encrypted && !isEncrypted(row.refresh_token_encrypted)) {
    updates.refresh_token_encrypted = encryptToken(row.refresh_token_encrypted);
    stats.refreshReencrypted += 1;
  }

  if (Object.keys(updates).length === 0) {
    stats.skipped += 1;
    continue;
  }

  if (dryRun) {
    console.log(`[dry-run] would reencrypt ${row.provider} (${row.id})`);
    continue;
  }

  const { error: updateError } = await supabase
    .from('integration_accounts')
    .update(updates)
    .eq('id', row.id);

  if (updateError) {
    console.error(`Failed to update ${row.id}:`, updateError.message);
    process.exit(1);
  }
  console.log(`Reencrypted ${row.provider} (${row.id})`);
}

console.log(JSON.stringify({ dryRun, ...stats }));
