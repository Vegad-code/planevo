#!/usr/bin/env node
/**
 * Fails CI if likely secrets appear in tracked source (outside allowlisted files).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();

const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git',
  'coverage',
  'playwright-report',
  'test-results',
  'Pods',
  'ios',
  'android',
  'temp_repos',
  'scratch',
]);

const ALLOWLIST_FILES = new Set([
  '.env.example',
  'apps/web/.env.example',
  'scripts/ci-secret-grep.mjs',
]);

const PATTERNS = [
  { name: 'OpenAI API key', re: /\bsk-[a-zA-Z0-9]{20,}\b/ },
  { name: 'Supabase service_role JWT', re: /service_role/ },
  { name: 'Slack bot token', re: /\bxoxb-[a-zA-Z0-9-]+\b/ },
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    const rel = relative(ROOT, full);
    if (ALLOWLIST_FILES.has(rel)) continue;
    if (st.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry)) files.push(full);
  }
  return files;
}

const violations = [];

for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, 'utf8');
  for (const { name, re } of PATTERNS) {
    if (re.test(src)) {
      violations.push({ file: rel, pattern: name });
    }
  }
}

if (violations.length > 0) {
  console.error('Possible secret patterns found in source:\n');
  for (const v of violations) {
    console.error(`  - ${v.file} (${v.pattern})`);
  }
  process.exit(1);
}

console.log('Secret pattern grep passed.');
