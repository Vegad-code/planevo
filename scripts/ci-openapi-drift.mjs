#!/usr/bin/env node
/**
 * Fails CI when route.ts paths are not documented in docs/openapi.yaml.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const API_ROOT = join(process.cwd(), 'apps/web/app/api');
const OPENAPI = join(process.cwd(), 'docs/openapi.yaml');

const ALLOWLIST = new Set([
  '/api/auth/callback/google-calendar',
  '/api/integrations/composio/callback',
  '/api/integrations/n8n/webhook',
  '/api/notifications/push',
  '/api/stripe/webhook',
  '/api/stripe/webhook/supabase-delete',
  '/api/cron/daily-notifications',
  '/api/cron/deadline-rescue',
  '/api/cron/time-sensitive',
  '/api/cron/welcome-series',
  '/api/cron/weekly-review',
  '/api/cron/data-retention',
]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (entry === 'route.ts') files.push(full);
  }
  return files;
}

const openapi = readFileSync(OPENAPI, 'utf8');
const documented = new Set(
  [...openapi.matchAll(/^\s{2}\/api\/[^\s:]+:/gm)].map((m) => m[0].trim().replace(/:$/, ''))
);

const missing = [];

for (const file of walk(API_ROOT)) {
  const rel = relative(API_ROOT, file);
  const routePath = `/api/${rel.replace(/\/route\.ts$/, '').replace(/\[([^\]]+)\]/g, '{$1}')}`;
  if (ALLOWLIST.has(routePath)) continue;
  if (!documented.has(routePath)) {
    missing.push(routePath);
  }
}

if (missing.length > 0) {
  console.error('Routes missing from docs/openapi.yaml:\n');
  for (const m of missing.sort()) console.error(`  - ${m}`);
  process.exit(1);
}

console.log('OpenAPI drift check passed.');
