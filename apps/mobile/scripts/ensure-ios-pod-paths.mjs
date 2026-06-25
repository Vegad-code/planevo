#!/usr/bin/env node
/**
 * npm workspaces hoist expo-modules-core to the monorepo root, but CocoaPods
 * (Podfile.lock) may still reference the nested expo/node_modules path.
 * Ensure that nested path resolves so Xcode builds without re-running pod install.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, '..');
const monorepoRoot = path.resolve(mobileRoot, '../..');

const nestedDir = path.join(monorepoRoot, 'node_modules/expo/node_modules');
const nestedTarget = path.join(nestedDir, 'expo-modules-core');
const hoistedSource = path.join(monorepoRoot, 'node_modules/expo-modules-core');

if (!fs.existsSync(hoistedSource) || fs.existsSync(nestedTarget)) {
  process.exit(0);
}

fs.mkdirSync(nestedDir, { recursive: true });
const relativeHoisted = path.relative(nestedDir, hoistedSource);
fs.symlinkSync(relativeHoisted, nestedTarget);
