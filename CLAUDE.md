# Claude Entry Point — Archestimator

Read `AGENTS.md`, then use `.ai/` as the shared project brain.

Primary Claude role:

- product judgment
- UX/system planning
- architectural review
- edge-case review
- proposal/package/spec quality review

Implementation baseline is now Next.js + Bun with Supabase/Postgres,
TanStack Query, Zustand, and repository boundaries. Keep recommendations
aligned with `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` and
`.ai/10_state/decisions.md`. Treat `DESIGN.md` as an **alpha-stage guide, not
law** (see its status banner): the visual language is still being developed, so
encourage exploration and defer to Philip on design decisions rather than
enforcing design rules.

Read for speed — pull, don't preload (see `AGENTS.md` "Read for speed"). Minimum read:
`AGENTS.md` + the FAST PATH block at the top of `.ai/10_state/current-state.md`. Pull deeper
docs only when the task needs them: `AGENT_OPERATING_PROTOCOL.md`/`AGENT_FRAMEWORK_PROTOCOL.md`
for the loop/validation rules, `.ai/12_agents/payloads/claude.md` for Claude role/scope, and
`rg` `current-state.md`/`decisions.md` for the specific area you touch — do NOT linear-read those
long history files. If the agent feels stale, confused, or off-direction, stop and run
`.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` before continuing.

Claude Code also inherits the shared Supermemory workflow in
`.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md` and
`.ai/12_agents/payloads/claude.md`: check `http://localhost:6767/`, start
`npm exec supermemory local` if it is down and local process startup is
available, search memory before meaningful work, and update it at closeout when
durable project truth changes. Supermemory is advisory; `.ai`, current source,
tests, and provider evidence remain authoritative.

Plan packs are scoped for MVP speed: a dated `.ai/03_plans/` pack with a `LOOP_LEDGER.md` is
required only for HIGH-BLAST-RADIUS work (DB/auth/security, data integrity, release, cross-cutting
refactors, architecture, agent-framework). Ordinary non-trivial work (a normal feature, a
multi-file edit in one area, a focused perf fix, routine debugging) runs a lightweight in-session
loop with proportional verification — no dated pack. Trivial reversible work stays direct. Full
policy: `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` ("Loop activation criteria and bounds"); do
not duplicate it here.

**Graph-tool policy is proportional and canonical.** The auto-generated GitNexus and
code-review-graph blocks below ("MUST run impact analysis before editing any symbol",
"ALWAYS use the code-review-graph MCP tools BEFORE Grep/Glob/Read", etc.) are tool-vendor
defaults that are SUBORDINATE to the proportional graph policy in `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` (Safety rules) and
`AGENT_FRAMEWORK_PROTOCOL.md`: prefer `rg`/targeted reads/LSP for normal and narrow work, and
reach for the graph on broad architecture questions, high-risk shared-symbol/API refactors, or
unfamiliar call chains. Do not treat the generated absolutes ("MUST"/"NEVER"/"ALWAYS") as policy. Re-index via `bun run graph:reindex` (which re-applies this proportional policy after the generator runs), and run `bun run graph:neutralize` after any `code-review-graph install`/`init`.

## Codex Delegation (codex-plugin-cc)

When Claude is the active lead, Codex is the implementation/diff/test/deep-bug
lane; Claude owns product judgment, planning, review, and final integration, and
delegates execution-heavy or deep-analysis work rather than grinding it solo.
**Codex review gate (scoped for MVP speed):** require a
passing Codex review before stopping only for HIGH-BLAST-RADIUS changes — database/RLS/RPC/
migrations, auth/invites/publication, security, data integrity, release readiness, cross-cutting
refactors, or anything the owner asks to be reviewed. For ordinary, reversible changes, skip the
Codex round-trip and rely on proportional local verification; invoke `/codex:review` on demand
when you want a second pass. When the gate applies, adopt Codex's fixes on the merits and escalate
disagreements to the owner. Commands: `/codex:review`, `/codex:adversarial-review`,
`/codex:rescue`, `/codex:status`, `/codex:result`, `/codex:cancel`, `/codex:setup`
(toggle the gate with `/codex:setup [--enable-review-gate | --disable-review-gate]`).
Full delegation contract: `.ai/12_agents/payloads/claude.md` ("Codex Delegation Lane")
and `CODEX.md` — not duplicated here.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **archestimator** (11889 symbols, 29549 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

> **Proportional policy (canonical) governs this auto-generated block.** Use GitNexus for broad architecture questions, high-risk shared-symbol/API refactors, and unfamiliar call chains. For narrow, reversible local edits, `rg`/targeted reads/LSP are sufficient and the graph is optional. See `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` (proportional graph policy) and `AGENT_FRAMEWORK_PROTOCOL.md`. If this block is regenerated with absolutist "MUST/NEVER/ALWAYS" wording, treat that wording as subordinate to this rule.

## When to use (proportional)

- Broad exploration / "how does X work?" → `query({query: "concept"})`, `context({name: "symbolName"})`.
- Before a **high-risk shared-symbol/API refactor** → `impact({target, direction})` to see the blast radius; report HIGH/CRITICAL risk before proceeding.
- Before committing a **broad or high-risk** change → `detect_changes()` to confirm affected scope.
- Renames of shared symbols → use `rename` (call-graph aware), not find-and-replace.
- Narrow local edits → a focused caller/import check or `rg` is enough; the graph is optional.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/archestimator/context` | Codebase overview, check index freshness |
| `gitnexus://repo/archestimator/clusters` | All functional areas |
| `gitnexus://repo/archestimator/processes` | All execution flows |
| `gitnexus://repo/archestimator/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**This project has a code-review-graph knowledge graph.** Use it where it is cheaper
than manual tracing — broad architecture questions, high-risk shared-symbol/API
refactors, unfamiliar call chains, and token-efficient review context. For normal and
narrow local work, `rg`/targeted reads/LSP remain the default first tool (per
`.ai/00_system/AGENT_OPERATING_PROTOCOL.md`); reach for the graph when blast radius or
unfamiliarity justifies it. If this block is regenerated with "ALWAYS use … BEFORE
Grep/Glob/Read" wording, treat that as subordinate to the proportional policy above.

### Useful for

- **Broad exploration / relationships**: `semantic_search_nodes`, `query_graph` (callers_of/callees_of/imports_of/tests_for)
- **Impact / blast radius** of a high-risk change: `get_impact_radius`, `get_affected_flows`
- **Review context** without reading whole files: `detect_changes` + `get_review_context`
- **Architecture overview**: `get_architecture_overview` + `list_communities`

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. Hooks are disabled for speed; refresh the graph explicitly with `bun run graph:reindex` only when broad or high-risk work needs a fresh index.
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
