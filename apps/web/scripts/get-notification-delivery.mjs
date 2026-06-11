import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile(path) {
  const env = {};
  const raw = readFileSync(path, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equals = trimmed.indexOf('=');
    if (equals === -1) continue;
    const key = trimmed.slice(0, equals).trim();
    let value = trimmed.slice(equals + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const deliveryId = process.argv[2];
if (!deliveryId) throw new Error('Usage: node scripts/get-notification-delivery.mjs <delivery-id>');

const env = loadEnvFile('.env.local');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await supabase
  .from('notification_deliveries')
  .select('id, user_id, notification_type, channel, dedupe_key, metadata, sent_at')
  .eq('id', deliveryId)
  .single();

if (error) throw error;

console.log(JSON.stringify({
  ok: true,
  id: data.id,
  user_id: data.user_id,
  notification_type: data.notification_type,
  channel: data.channel,
  dedupe_key: data.dedupe_key,
  sent_at: data.sent_at,
  metadata: data.metadata,
}, null, 2));
