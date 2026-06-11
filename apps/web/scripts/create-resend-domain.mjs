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

const env = loadEnvFile('.env.local');
const apiKey = env.RESEND_API_KEY;
const domainName = process.argv[2] || 'planevo.co';
if (!apiKey) throw new Error('RESEND_API_KEY is missing');

const response = await fetch('https://api.resend.com/domains', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: domainName,
    region: 'us-east-1',
  }),
});

const body = await response.json();
if (!response.ok) {
  throw new Error(JSON.stringify({ status: response.status, body }));
}

console.log(JSON.stringify({
  ok: true,
  id: body.id,
  name: body.name,
  status: body.status,
  records: body.records ?? [],
}, null, 2));
