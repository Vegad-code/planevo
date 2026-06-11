import { readFileSync } from 'node:fs';

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
  const [local, domain] = String(email ?? '').split('@');
  if (!local || !domain) return '[unknown]';
  return `${local.slice(0, 2)}***@${domain}`;
}

const emailId = process.argv[2];
if (!emailId) throw new Error('Usage: node scripts/get-resend-email.mjs <email-id>');

const env = loadEnvFile('.env.local');
const apiKey = env.RESEND_API_KEY;
if (!apiKey) throw new Error('RESEND_API_KEY is missing');

const response = await fetch(`https://api.resend.com/emails/${emailId}`, {
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
});

const body = await response.json();
if (!response.ok) {
  throw new Error(JSON.stringify({ status: response.status, body }));
}

console.log(JSON.stringify({
  ok: true,
  id: body.id,
  from: body.from,
  to: Array.isArray(body.to) ? body.to.map(maskEmail) : maskEmail(body.to),
  subject: body.subject,
  created_at: body.created_at,
  last_event: body.last_event,
}, null, 2));
