#!/usr/bin/env node
/**
 * CI audit gate: fail on high/critical production-runtime vulnerabilities.
 * Dev/preview-only chains (react-email socket.io, jsdom, lighthouse) are excluded.
 */
import { execSync } from 'node:child_process';

function runAuditJson() {
  try {
    return execSync('npm audit --workspace planevo --omit=dev --json', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    if (error.stdout) return error.stdout;
    throw error;
  }
}

const audit = JSON.parse(runAuditJson());
const vulnerabilities = Object.values(audit.vulnerabilities ?? {});

function isExcludedDevChain(entry) {
  const nodes = (entry.nodes ?? []).join(' ');
  return (
    nodes.includes('react-email') ||
    nodes.includes('jsdom') ||
    nodes.includes('lighthouse') ||
    nodes.includes('node_modules/engine.io') ||
    nodes.includes('node_modules/socket.io-adapter')
  );
}

const blocking = vulnerabilities.filter((entry) => {
  const severity = entry.severity;
  if (severity !== 'high' && severity !== 'critical') return false;
  if (isExcludedDevChain(entry)) return false;
  return true;
});

if (blocking.length > 0) {
  console.error('Blocking production vulnerabilities found:');
  for (const issue of blocking) {
    console.error(`- ${issue.name} (${issue.severity})`);
  }
  process.exit(1);
}

console.log('Production dependency audit passed (high/critical gate).');
