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
 * This script rewrites the in-fence content of those blocks to the proportional policy. It is
 * IDEMPOTENT: it only acts when an absolutist marker is present, so it is a no-op on already-proportional
 * files (and on files with no such block). It NEVER fails the caller — always exits 0.
 *
 * Run it AFTER the generators, via `bun run graph:reindex` (analyze + neutralize) or `bun run
 * graph:neutralize` (standalone, e.g. after a code-review-graph re-install). It is deliberately NOT a
 * global editor hook, so it has no effect on other agents' sessions until the canonical re-index path runs.
 *
 * Usage: node scripts/neutralize-graph-mandate.mjs [file ...]   (defaults: AGENTS.md CLAUDE.md GEMINI.md)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const POINTER =
  '`.ai/00_system/AGENT_OPERATING_PROTOCOL.md` (proportional graph policy) and `AGENT_FRAMEWORK_PROTOCOL.md`';

// Proportional replacement for the body BETWEEN the gitnexus fences.
const GITNEXUS_PROPORTIONAL = `# GitNexus — Code Intelligence

This project can be indexed by GitNexus. Use the graph where it is cheaper than manual tracing —
broad architecture questions, high-risk shared-symbol/API refactors, and unfamiliar call chains.

> **Proportional policy (canonical) governs this auto-generated block.** For narrow, reversible local
> edits, \`rg\`/targeted reads/LSP are sufficient and the graph is optional. See ${POINTER}. This block
> was re-applied by \`scripts/neutralize-graph-mandate.mjs\`; treat any regenerated "MUST/NEVER/ALWAYS"
> wording as subordinate to this rule.

## When to use (proportional)

- Broad exploration / "how does X work?" → \`query\`, \`context\`.
- Before a **high-risk shared-symbol/API refactor** → \`impact\` for the blast radius; report HIGH/CRITICAL first.
- Before committing a **broad or high-risk** change → \`detect_changes\` to confirm affected scope.
- Renames of shared symbols → \`rename\` (call-graph aware), not find-and-replace.
- Narrow local edits → a focused caller/import check or \`rg\` is enough; the graph is optional.`;

// Proportional replacement for the code-review-graph block (CLAUDE.md), from the marker to EOF.
const CRG_MARKER = '<!-- code-review-graph MCP tools -->';
const CRG_PROPORTIONAL_CLAUDE = `${CRG_MARKER}
## MCP Tools: code-review-graph (proportional)

**This project has a code-review-graph knowledge graph.** Use it where it is cheaper than manual
tracing — broad architecture questions, high-risk shared-symbol/API refactors, unfamiliar call chains,
and token-efficient review context. For normal and narrow local work, \`rg\`/targeted reads/LSP remain
the default first tool (per ${POINTER}). Re-applied by \`scripts/neutralize-graph-mandate.mjs\`; treat
any regenerated "ALWAYS use … BEFORE Grep/Glob/Read" wording as subordinate to this proportional policy.

### Useful for

- Broad exploration / relationships: \`semantic_search_nodes\`, \`query_graph\`.
- Impact / blast radius of a high-risk change: \`get_impact_radius\`, \`get_affected_flows\`.
- Review context without reading whole files: \`detect_changes\` + \`get_review_context\`.
- Architecture overview: \`get_architecture_overview\` + \`list_communities\`.
`;

// On the deprecated, fail-closed Gemini lane the block is dropped to a one-line pointer.
const CRG_GEMINI = `${CRG_MARKER}
Graph/MCP guidance is intentionally omitted: Gemini is a deprecated, fail-closed lane. If reapproved,
follow the proportional graph policy in ${POINTER} — not an always-use-graph default. (Re-applied by
\`scripts/neutralize-graph-mandate.mjs\`.)
`;

// Distinctive to the GENERATED absolutist blocks only — must NOT match the proportional governance notes.
const GITNEXUS_ABSOLUTIST = /\*\*MUST run impact analysis before editing any symbol\.\*\*|NEVER edit a function, class, or method without first running/i;
const CRG_ABSOLUTIST = /ALWAYS use the[\s\S]{0,24}code-review-graph MCP tools BEFORE using Grep/i;

function neutralizeGitnexus(text) {
  const start = '<!-- gitnexus:start -->';
  const end = '<!-- gitnexus:end -->';
  const si = text.indexOf(start);
  const ei = text.indexOf(end);
  if (si === -1 || ei === -1 || ei < si) return text; // no fenced block
  const block = text.slice(si, ei + end.length);
  if (!GITNEXUS_ABSOLUTIST.test(block)) return text; // already proportional → no-op
  const rebuilt = `${start}\n${GITNEXUS_PROPORTIONAL}\n${end}`;
  return text.slice(0, si) + rebuilt + text.slice(ei + end.length);
}

function neutralizeCRG(text, { gemini }) {
  const mi = text.indexOf(CRG_MARKER);
  if (mi === -1) return text; // no block (e.g. already trimmed)
  if (!CRG_ABSOLUTIST.test(text.slice(mi))) return text; // already proportional → no-op
  const before = text.slice(0, mi).replace(/\s*$/, '\n\n'); // the block runs to EOF; it is terminal
  return before + (gemini ? CRG_GEMINI : CRG_PROPORTIONAL_CLAUDE);
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
  out = neutralizeCRG(out, { gemini: /(^|\/)GEMINI\.md$/i.test(file) });
  if (out !== orig) {
    writeFileSync(file, out);
    console.log(`neutralized: ${file}`);
    changed++;
  } else {
    console.log(`ok (proportional): ${file}`);
  }
}
console.log(changed ? `done — neutralized ${changed} file(s)` : 'done — no changes; all blocks already proportional');
process.exit(0);
