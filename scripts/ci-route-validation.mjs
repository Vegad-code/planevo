#!/usr/bin/env node
/**
 * Fails CI if mutating API routes lack Zod validation (safeParse / parseJsonBody).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const API_ROOT = join(process.cwd(), 'apps/web/app/api');

const ALLOWLIST = new Set([
  'cron/daily-notifications/route.ts',
  'cron/deadline-rescue/route.ts',
  'cron/time-sensitive/route.ts',
  'cron/weekly-review/route.ts',
  'cron/welcome-series/route.ts',
  'stripe/webhook/route.ts',
  'stripe/webhook/supabase-delete/route.ts',
  'auth/callback/google-calendar/route.ts',
  'integrations/composio/callback/route.ts',
  'integrations/n8n/webhook/route.ts',
  'notifications/push/route.ts',
]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (entry === 'route.ts') files.push(full);
  }
  return files;
}

const mutatingPattern = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\s*\(/;
const validationPattern = /safeParse|parseJsonBody/;

const violations = [];

for (const file of walk(API_ROOT)) {
  const rel = relative(API_ROOT, file);
  if (ALLOWLIST.has(rel)) continue;

  const src = readFileSync(file, 'utf8');
  if (!mutatingPattern.test(src)) continue;
  if (!validationPattern.test(src)) {
    violations.push(rel);
  }
}

if (violations.length > 0) {
  console.error('Mutating API routes missing Zod validation:\n');
  for (const v of violations.sort()) console.error(`  - ${v}`);
  process.exit(1);
}

console.log('API route validation check passed.');
