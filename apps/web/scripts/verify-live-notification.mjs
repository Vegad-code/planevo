import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

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

function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '[invalid-email]';
  return `${local.slice(0, 2)}***@${domain}`;
}

function requireEnv(env, key) {
  const value = env[key];
  if (!value) throw new Error(`${key} is missing`);
  return value;
}

const env = loadEnvFile('.env.local');
const shouldSend = process.argv.includes('--send');
const useResendTestSender = process.argv.includes('--resend-test-sender');
const userIdArgIndex = process.argv.indexOf('--user-id');
const targetUserId = userIdArgIndex === -1 ? null : process.argv[userIdArgIndex + 1];
const supabaseUrl = requireEnv(env, 'NEXT_PUBLIC_SUPABASE_URL');
const serviceRoleKey = requireEnv(env, 'SUPABASE_SERVICE_ROLE_KEY');
const resendApiKey = requireEnv(env, 'RESEND_API_KEY');
const from = useResendTestSender
  ? 'Planevo <onboarding@resend.dev>'
  : env.EMAIL_FROM || env.WEEKLY_REVIEW_FROM || 'Planevo <notifications@planevo.co>';
const appUrl = env.NEXT_PUBLIC_APP_URL || 'https://planevo.co';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const resend = new Resend(resendApiKey);

let usersQuery = supabase
  .from('users')
  .select('id, email, name, created_at')
  .not('email', 'is', null)
  .order('created_at', { ascending: false })
  .limit(1);

if (targetUserId) {
  usersQuery = usersQuery.eq('id', targetUserId);
}

const { data: users, error: usersError } = await usersQuery;

if (usersError) throw usersError;
const user = users?.[0];
if (!user?.id || !user?.email) {
  throw new Error('No user with an email was found');
}

if (!shouldSend) {
  console.log(JSON.stringify({
    ok: true,
    dry_run: true,
    to: maskEmail(user.email),
    user_id: user.id,
    sender: useResendTestSender ? 'onboarding@resend.dev' : from.replace(/<.*>/, '<masked>'),
    message: 'Verifier is ready. Re-run with --send after explicit approval to send email and write notification_deliveries.',
  }, null, 2));
} else {
  const dedupeKey = `live-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const idempotencyKey = `live_notification_verification/email/${user.id}/${dedupeKey}`.slice(0, 256);
  const subject = 'Planevo live notification verification';
  const text = [
    `Hi ${user.name || 'there'},`,
    '',
    'This is a live verification email from Planevo.',
    'Resend accepted this email and Planevo will log the delivery attempt in Supabase.',
    '',
    `Open Planevo: ${appUrl}/dashboard/settings/notifications`,
  ].join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; color: #1a1a1a;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">Planevo notifications are being verified</h1>
      <p style="font-size: 16px; line-height: 1.6;">This is a live verification email from Planevo.</p>
      <p style="font-size: 16px; line-height: 1.6;">Resend accepted this email and Planevo will log the delivery attempt in Supabase.</p>
      <p><a href="${appUrl}/dashboard/settings/notifications">Open notification settings</a></p>
    </div>
  `;

  const { data: emailData, error: emailError } = await resend.emails.send(
    {
      from,
      to: user.email,
      subject,
      text,
      html,
    },
    { idempotencyKey }
  );

  if (emailError) throw emailError;

  const providerMessageId = emailData?.id ?? null;
  const { error: deliveryError } = await supabase
    .from('notification_deliveries')
    .upsert(
      {
        user_id: user.id,
        notification_type: 'live_notification_verification',
        channel: 'email',
        dedupe_key: dedupeKey,
        metadata: {
        provider: 'resend',
        provider_message_id: providerMessageId,
        sender: useResendTestSender ? 'onboarding@resend.dev' : from,
        verification: true,
      },
        sent_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,notification_type,channel,dedupe_key' }
    );

  if (deliveryError) throw deliveryError;

  const { data: delivery, error: verifyError } = await supabase
    .from('notification_deliveries')
    .select('id, notification_type, channel, dedupe_key, sent_at, metadata')
    .eq('user_id', user.id)
    .eq('notification_type', 'live_notification_verification')
    .eq('channel', 'email')
    .eq('dedupe_key', dedupeKey)
    .single();

  if (verifyError) throw verifyError;

  console.log(JSON.stringify({
    ok: true,
    to: maskEmail(user.email),
    user_id: user.id,
    resend_email_id: providerMessageId,
    delivery_id: delivery.id,
    dedupe_key: dedupeKey,
    sent_at: delivery.sent_at,
  }, null, 2));
}
