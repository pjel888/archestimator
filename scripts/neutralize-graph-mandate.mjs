#!/usr/bin/env node
/**
 * neutralize-graph-mandate.mjs — R1 governance guard.
 *
 * GitNexus (`gitnexus analyze`) and code-review-graph (`code-review-graph install|init`) regenerate
 * agent-doc blocks in AGENTS.md / CLAUDE.md / GEMINI.md with ABSOLUTIST graph mandates
 * ("MUST run impact analysis before editing any symbol", "NEVER edit a function ... without impact",
 * "ALWAYS use the code-review-graph MCP tools BEFORE using Grep/Glob/Read"). Those contradict the
 * canonical PROPORTIONAL policy in `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` /
 * `AGENT_FRAMEWORK_PROTOCOL.md` (graph for broad/high-risk/unfamiliar work; rg/targeted reads for
 * narrow edits).
 *
 * This script removes those generated blocks because the concise proportional policy already lives
 * in each entry file and `.ai/00_system`. It is idempotent and never fails the caller.
 *
 * Run it AFTER the generators, via `bun run graph:reindex` (safe-runner guard + analyze + neutralize)
 * or `bun run graph:neutralize` (standalone, e.g. after a code-review-graph re-install). It is deliberately NOT a
 * global editor hook, so it has no effect on other agents' sessions until the canonical re-index path runs.
 *
 * Usage: node scripts/neutralize-graph-mandate.mjs [file ...]   (defaults: AGENTS.md CLAUDE.md GEMINI.md)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const CRG_MARKER = '<!-- code-review-graph MCP tools -->';

function neutralizeGitnexus(text) {
  const start = '<!-- gitnexus:start -->';
  const end = '<!-- gitnexus:end -->';
  const si = text.indexOf(start);
  const ei = text.indexOf(end);
  if (si === -1 || ei === -1 || ei < si) return text; // no fenced block
  const before = text.slice(0, si).trimEnd();
  const after = text.slice(ei + end.length).trimStart();
  return `${before}${before && after ? "\n\n" : ""}${after}`;
}

function neutralizeCRG(text) {
  const mi = text.indexOf(CRG_MARKER);
  if (mi === -1) return text; // no block (e.g. already trimmed)
  return `${text.slice(0, mi).trimEnd()}\n`;
}

const args = process.argv.slice(2);
const targets = args.length ? args : ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'];
let changed = 0;
for (const file of targets) {
  if (!existsSync(file)) {
    console.log(`skip (missing): ${file}`);
    continue;
  }
  const orig = readFileSync(file, 'utf8');
  let out = neutralizeGitnexus(orig);
  out = neutralizeCRG(out);
  if (out !== orig) {
    writeFileSync(file, out);
    console.log(`removed generated graph block: ${file}`);
    changed++;
  } else {
    console.log(`ok (no generated graph block): ${file}`);
  }
}
console.log(changed ? `done — cleaned ${changed} file(s)` : 'done — no generated graph blocks remain');
process.exit(0);
