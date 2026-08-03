#!/usr/bin/env node
/**
 * Fail-closed GitNexus command wrapper.
 *
 * The gitignored `.gitnexus/run.cjs` file is generated outside the repo lockfile.
 * Some generated copies resolve `gitnexus@latest` through npx/pnpm/global
 * fallback paths. Do not execute those copies from package scripts.
 */
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const runnerPath = '.gitnexus/run.cjs';
const rawArgs = process.argv.slice(2);
const neutralizeAfter = rawArgs.includes('--neutralize-after');
const gitnexusArgs = rawArgs.filter((arg) => arg !== '--neutralize-after');
const allowedCommands = new Set(['analyze', 'clean', 'list', 'status', 'wiki']);

const forbidden = [
  ['gitnexus@latest', /gitnexus@latest/],
  ['NPX_REF resolver', /\bNPX_REF\b/],
  ['npx fallback', /(^|[^a-z0-9_-])npx([^a-z0-9_-]|$)/i],
  ['pnpm dlx fallback', /pnpm[\s\S]{0,120}\bdlx\b|\bdlx[\s\S]{0,120}gitnexus/i],
  ['global gitnexus fallback', /global\s+`gitnexus`|program:\s*['"]gitnexus['"]/i],
];

function fail(message) {
  console.error(`GitNexus command skipped: ${message}`);
  console.error(
    'Use existing MCP/code-review-graph context until a pinned, lockfile-controlled runner is reviewed and added.',
  );
  process.exit(1);
}

if (!existsSync(runnerPath)) {
  fail(`${runnerPath} is absent`);
}

if (!gitnexusArgs.length) {
  fail('missing GitNexus command arguments');
}
if (!allowedCommands.has(gitnexusArgs[0])) {
  fail(`unsupported GitNexus command ${JSON.stringify(gitnexusArgs[0])}`);
}
if (rawArgs.filter((arg) => arg === '--neutralize-after').length > 1) {
  fail('duplicate --neutralize-after flags are not allowed');
}
if (gitnexusArgs.some((arg) => /[\0\r\n]/u.test(arg))) {
  fail('GitNexus arguments must not contain control characters');
}

const runnerSource = readFileSync(runnerPath, 'utf8');
const hit = forbidden.find(([, pattern]) => pattern.test(runnerSource));
if (hit) {
  fail(`${runnerPath} contains registry-resolved fallback logic (${hit[0]})`);
}

const command = spawnSync('node', [runnerPath, ...gitnexusArgs], { stdio: 'inherit' });
if (command.status !== 0) {
  process.exit(command.status ?? 1);
}

if (neutralizeAfter) {
  const neutralize = spawnSync('node', ['scripts/neutralize-graph-mandate.mjs'], {
    stdio: 'inherit',
  });
  process.exit(neutralize.status ?? 1);
}
